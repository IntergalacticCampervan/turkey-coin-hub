import type { APIRoute } from 'astro';

import { getAdminAuthEnv, requireAccessAuth } from '../../../lib/auth';
import { APP_CHAIN_META } from '../../../lib/chain';
import { getDB } from '../../../lib/db';
import { processMintLifecycle } from '../../../lib/mintProcessor';
import { getOnchainEnv, getOnchainStatusSummary } from '../../../lib/onchain';

export const prerender = false;

type MintBody = {
  walletAddress?: string;
  amount?: number;
  reason?: string;
  idempotencyKey?: string;
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

async function findMintEventByIdempotencyKey(db: NonNullable<ReturnType<typeof getDB>>, idempotencyKey: string) {
  return db
    .prepare(
      `
        SELECT
          id,
          status,
          mint_tx_hash AS txHash,
          failure_reason AS failureReason
        FROM mint_events
        WHERE idempotency_key = ?
        LIMIT 1
      `,
    )
    .bind(idempotencyKey)
    .first<{ id: string; status: string; txHash: string | null; failureReason: string | null }>();
}

function isDuplicateIdempotencyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /unique/i.test(message) && /idempotency/i.test(message);
}

export const POST: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  const warningHeaders = auth.warning ? { 'x-auth-warning': auth.warning } : undefined;

  let body: MintBody;
  try {
    body = (await context.request.json()) as MintBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400, warningHeaders);
  }

  const walletAddress = String(body.walletAddress ?? '').trim().toLowerCase();
  const amount = Number(body.amount);
  const reason = String(body.reason ?? '').trim() || 'manual reward';
  const idempotencyKey = String(body.idempotencyKey ?? '').trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return json({ ok: false, error: 'Invalid wallet address' }, 400, warningHeaders);
  }

  if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
    return json({ ok: false, error: 'Amount must be an integer between 1 and 1000' }, 400, warningHeaders);
  }

  if (idempotencyKey.length < 8) {
    return json({ ok: false, error: 'idempotencyKey is required (min 8 chars)' }, 400, warningHeaders);
  }

  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503, warningHeaders);
  }
  const onchainEnv = getOnchainEnv(context.locals);

  const eventId = randomId();
  const now = new Date().toISOString();

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
          VALUES (?, ?, ?, ?, 'queued', ?, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `,
      )
      .bind(
        eventId,
        walletAddress,
        String(amount),
        APP_CHAIN_META.id,
        idempotencyKey,
        auth.subject,
        auth.email,
        now,
        walletAddress,
        amount,
        reason,
        now,
        auth.subject,
      )
      .run();

    const processingResult = await processMintLifecycle(db, onchainEnv, {
      queuedLimit: 1,
      submittedLimit: 10,
    });

    const mintedEvent = await db
      .prepare(
        `
          SELECT
            status,
            COALESCE(tx_hash, mint_tx_hash) AS txHash,
            failure_reason AS failureReason
          FROM mint_events
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind(eventId)
      .first<{ status: string; txHash: string | null; failureReason: string | null }>();

    if (!processingResult.configured) {
      return json(
        {
          ok: true,
          eventId,
          txHash: null,
          warning: `Mint queued but on-chain submission is not configured: ${getOnchainStatusSummary(onchainEnv).error}`,
        },
        200,
        warningHeaders,
      );
    }

    if (mintedEvent?.status === 'failed') {
      return json(
        {
          ok: false,
          error: mintedEvent.failureReason || 'Mint submission failed',
          eventId,
          txHash: null,
        },
        502,
        warningHeaders,
      );
    }

    return json({ ok: true, eventId, txHash: mintedEvent?.txHash ?? null }, 200, warningHeaders);
  } catch (error) {
    if (isDuplicateIdempotencyError(error)) {
      try {
        const existingEvent = await findMintEventByIdempotencyKey(db, idempotencyKey);

        if (existingEvent) {
          if (existingEvent.status === 'failed') {
            return json(
              {
                ok: false,
                error: existingEvent.failureReason || 'Mint submission failed',
                eventId: existingEvent.id,
                txHash: existingEvent.txHash,
              },
              409,
              warningHeaders,
            );
          }

          return json(
            {
              ok: true,
              eventId: existingEvent.id,
              txHash: existingEvent.txHash,
              warning: 'Duplicate mint request reused existing event.',
            },
            200,
            warningHeaders,
          );
        }
      } catch {
        // Fall through to generic duplicate response if lookup fails.
      }

      return json({ ok: false, error: 'Duplicate idempotencyKey' }, 409, warningHeaders);
    }

    const message = error instanceof Error ? error.message : String(error ?? '');

    if (/no such column/i.test(message)) {
      return json({ ok: false, error: 'Mint event schema is outdated; run D1 migrations' }, 500, warningHeaders);
    }

    return json({ ok: false, error: 'Failed to queue mint event' }, 500, warningHeaders);
  }
};
