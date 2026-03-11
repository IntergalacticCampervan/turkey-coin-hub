import type { APIRoute } from 'astro';

import { APP_CHAIN_META } from '../../../lib/chain';
import { getDB } from '../../../lib/db';
import type { MintFailureStage } from '../../../lib/mintProcessor';
import { processMintLifecycle } from '../../../lib/mintProcessor';
import { getNominationRewardOptionById } from '../../../lib/nominationRewards';
import { getOnchainEnv, getOnchainStatusSummary } from '../../../lib/onchain';

export const prerender = false;

type SecondBody = {
  nominationId?: string;
  seconderWalletAddress?: string;
};

type UserRow = {
  handle: string;
  walletAddress: string;
};

type NominationRow = {
  id: string;
  nomineeWalletAddress: string;
  nominatorWalletAddress: string;
  seconderWalletAddress: string | null;
  rewardId: string;
  amountRaw: string;
  reason: string;
  status: string;
  mintEventId: string | null;
};

function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(headers || {}),
    },
  });
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeWallet(input: unknown): string {
  return String(input ?? '').trim().toLowerCase();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown nomination error';
}

async function findUserByWallet(
  db: NonNullable<ReturnType<typeof getDB>>,
  walletAddress: string,
): Promise<UserRow | null> {
  return db
    .prepare(
      `
        SELECT handle, wallet_address AS walletAddress
        FROM users
        WHERE wallet_address = ?
        LIMIT 1
      `,
    )
    .bind(walletAddress)
    .first<UserRow>();
}

async function readMintEvent(
  db: NonNullable<ReturnType<typeof getDB>>,
  eventId: string,
): Promise<{ status: string; txHash: string | null; failureReason: string | null; failureStage: MintFailureStage | null } | null> {
  try {
    return await db
      .prepare(
        `
          SELECT
            status,
            COALESCE(tx_hash, mint_tx_hash) AS txHash,
            failure_reason AS failureReason,
            failure_stage AS failureStage
          FROM mint_events
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind(eventId)
      .first<{ status: string; txHash: string | null; failureReason: string | null; failureStage: MintFailureStage | null }>();
  } catch (error) {
    const message = getErrorMessage(error);
    if (!/no such column/i.test(message) || !/failure_stage/i.test(message)) {
      throw error;
    }

    return db
      .prepare(
        `
          SELECT
            status,
            COALESCE(tx_hash, mint_tx_hash) AS txHash,
            failure_reason AS failureReason,
            NULL AS failureStage
          FROM mint_events
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind(eventId)
      .first<{ status: string; txHash: string | null; failureReason: string | null; failureStage: MintFailureStage | null }>();
  }
}

export const POST: APIRoute = async (context) => {
  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503);
  }

  let body: SecondBody;
  try {
    body = (await context.request.json()) as SecondBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const nominationId = String(body.nominationId ?? '').trim();
  const seconderWalletAddress = normalizeWallet(body.seconderWalletAddress);

  if (!nominationId) {
    return json({ ok: false, error: 'nominationId is required' }, 400);
  }

  if (!/^0x[a-f0-9]{40}$/.test(seconderWalletAddress)) {
    return json({ ok: false, error: 'Valid seconder wallet address is required' }, 400);
  }

  try {
    const nomination = await db
      .prepare(
        `
          SELECT
            id,
            nominee_wallet AS nomineeWalletAddress,
            nominator_wallet AS nominatorWalletAddress,
            seconder_wallet AS seconderWalletAddress,
            reward_id AS rewardId,
            amount_raw AS amountRaw,
            reason AS reason,
            status AS status,
            mint_event_id AS mintEventId
          FROM nominations
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind(nominationId)
      .first<NominationRow>();

    if (!nomination) {
      return json({ ok: false, error: 'Nomination not found' }, 404);
    }

    if (nomination.status !== 'awaiting_second') {
      return json({ ok: false, error: 'This nomination is no longer waiting for a second' }, 409);
    }

    if (nomination.seconderWalletAddress || nomination.mintEventId) {
      return json({ ok: false, error: 'A second has already been locked in' }, 409);
    }

    if (
      seconderWalletAddress === nomination.nominatorWalletAddress ||
      seconderWalletAddress === nomination.nomineeWalletAddress
    ) {
      return json({ ok: false, error: 'Nominator and nominee cannot second this chaos themselves' }, 400);
    }

    const seconder = await findUserByWallet(db, seconderWalletAddress);
    if (!seconder) {
      return json({ ok: false, error: 'Seconder must be an onboarded crew member' }, 400);
    }

    const reward = getNominationRewardOptionById(nomination.rewardId);
    if (!reward) {
      return json({ ok: false, error: 'Nomination reward loadout is invalid' }, 400);
    }

    const secondedAt = new Date().toISOString();
    const claimResult = await db
      .prepare(
        `
          UPDATE nominations
          SET
            seconder_wallet = ?,
            seconded_at = ?,
            status = 'processing',
            failure_reason = NULL,
            failed_at = NULL
          WHERE id = ?
            AND status = 'awaiting_second'
            AND seconder_wallet IS NULL
            AND mint_event_id IS NULL
        `,
      )
      .bind(seconderWalletAddress, secondedAt, nominationId)
      .run();

    if (Number(claimResult.meta?.changes ?? 0) === 0) {
      return json({ ok: false, error: 'Another turkey tribunal member got there first' }, 409);
    }

    const eventId = randomId();
    const reason = `[NOMINATION] ${reward.label}: ${nomination.reason}`;

    try {
      await db
        .prepare(
          `
            INSERT INTO mint_events (
              id,
              to_wallet,
              amount_raw,
              chain_id,
              status,
              idempotency_key,
              tx_hash,
              requested_by_sub,
              requested_by_email,
              created_at,

              -- legacy compatibility
              wallet_address,
              amount,
              reason,
              mint_tx_hash,
              queued_at,
              admin_subject
            )
            VALUES (?, ?, ?, ?, 'queued', ?, NULL, ?, NULL, ?, ?, ?, ?, NULL, ?, ?)
          `,
        )
        .bind(
          eventId,
          nomination.nomineeWalletAddress,
          nomination.amountRaw,
          APP_CHAIN_META.id,
          `nomination:${nominationId}`,
          `nomination:${seconderWalletAddress}`,
          secondedAt,
          nomination.nomineeWalletAddress,
          Number(nomination.amountRaw),
          reason,
          secondedAt,
          `nomination:${seconderWalletAddress}`,
        )
        .run();

      await db
        .prepare(
          `
            UPDATE nominations
            SET mint_event_id = ?
            WHERE id = ?
          `,
        )
        .bind(eventId, nominationId)
        .run();

      const onchainEnv = getOnchainEnv(context.locals);
      const processingResult = await processMintLifecycle(db, onchainEnv, {
        queuedLimit: 1,
        submittedLimit: 10,
      });

      const mintEvent = await readMintEvent(db, eventId);

      if (!processingResult.configured) {
        return json(
          {
            ok: true,
            eventId,
            txHash: null,
            status: 'processing',
            warning: `Nomination seconded and queued: ${getOnchainStatusSummary(onchainEnv).error}`,
          },
          200,
        );
      }

      if (mintEvent?.status === 'failed') {
        await db
          .prepare(
            `
              UPDATE nominations
              SET
                status = 'failed',
                failed_at = ?,
                failure_reason = ?
              WHERE id = ?
            `,
          )
          .bind(new Date().toISOString(), mintEvent.failureReason || 'Mint submission failed', nominationId)
          .run();

        return json(
          {
            ok: false,
            error: mintEvent.failureReason || 'Mint submission failed',
            failureStage: mintEvent.failureStage,
            eventId,
            txHash: mintEvent.txHash,
          },
          502,
        );
      }

      if (mintEvent?.status === 'confirmed') {
        await db
          .prepare(
            `
              UPDATE nominations
              SET
                status = 'minted',
                completed_at = ?,
                failure_reason = NULL,
                failed_at = NULL
              WHERE id = ?
            `,
          )
          .bind(new Date().toISOString(), nominationId)
          .run();

        return json({ ok: true, eventId, txHash: mintEvent.txHash, status: 'minted' }, 200);
      }

      return json({ ok: true, eventId, txHash: mintEvent?.txHash ?? null, status: 'processing' }, 200);
    } catch (error) {
      await db
        .prepare(
          `
            UPDATE nominations
            SET
              status = 'failed',
              failed_at = ?,
              failure_reason = ?
            WHERE id = ?
          `,
        )
        .bind(new Date().toISOString(), getErrorMessage(error), nominationId)
        .run();

      return json({ ok: false, error: getErrorMessage(error) }, 500);
    }
  } catch {
    return json({ ok: false, error: 'Could not second nomination' }, 500);
  }
};
