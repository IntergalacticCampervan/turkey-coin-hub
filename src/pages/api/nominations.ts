import type { APIRoute } from 'astro';

import { getDB } from '../../lib/db';
import { getNominationRewardOptionById } from '../../lib/nominationRewards';

export const prerender = false;

type UserRow = {
  handle: string;
  walletAddress: string;
};

type NominationRow = {
  id: string;
  nomineeWalletAddress: string;
  nomineeHandle: string | null;
  nominatorWalletAddress: string;
  nominatorHandle: string | null;
  seconderWalletAddress: string | null;
  seconderHandle: string | null;
  rewardId: string;
  amount: string;
  reason: string;
  status: string;
  mintEventStatus: string | null;
  failureReason: string | null;
  createdAt: string;
  secondedAt: string | null;
  completedAt: string | null;
};

type NominationBody = {
  nomineeWalletAddress?: string;
  nominatorWalletAddress?: string;
  rewardId?: string;
  reason?: string;
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

function resolveNominationStatus(status: string, mintEventStatus: string | null): 'awaiting_second' | 'processing' | 'minted' | 'failed' {
  if (status === 'failed' || mintEventStatus === 'failed') {
    return 'failed';
  }

  if (status === 'minted' || mintEventStatus === 'confirmed') {
    return 'minted';
  }

  if (status === 'awaiting_second') {
    return 'awaiting_second';
  }

  return 'processing';
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

export const GET: APIRoute = async (context) => {
  const db = getDB(context);
  if (!db) {
    return json([], 200, { 'x-no-db': 'true' });
  }

  try {
    const result = await db
      .prepare(
        `
          SELECT
            n.id AS id,
            n.nominee_wallet AS nomineeWalletAddress,
            nominee.handle AS nomineeHandle,
            n.nominator_wallet AS nominatorWalletAddress,
            nominator.handle AS nominatorHandle,
            n.seconder_wallet AS seconderWalletAddress,
            seconder.handle AS seconderHandle,
            n.reward_id AS rewardId,
            n.amount_raw AS amount,
            n.reason AS reason,
            n.status AS status,
            m.status AS mintEventStatus,
            COALESCE(m.failure_reason, n.failure_reason) AS failureReason,
            n.created_at AS createdAt,
            n.seconded_at AS secondedAt,
            COALESCE(n.completed_at, m.confirmed_at) AS completedAt
          FROM nominations n
          LEFT JOIN users nominee ON nominee.wallet_address = n.nominee_wallet
          LEFT JOIN users nominator ON nominator.wallet_address = n.nominator_wallet
          LEFT JOIN users seconder ON seconder.wallet_address = n.seconder_wallet
          LEFT JOIN mint_events m ON m.id = n.mint_event_id
          ORDER BY n.created_at DESC
          LIMIT 18
        `,
      )
      .all<NominationRow>();

    const nominations = (result.results ?? []).map((row) => {
      const reward = getNominationRewardOptionById(row.rewardId);
      return {
        id: row.id,
        nomineeHandle: row.nomineeHandle ?? 'UNKNOWN_GOBBLER',
        nomineeWalletAddress: row.nomineeWalletAddress,
        nominatorHandle: row.nominatorHandle ?? 'UNKNOWN_SCOUT',
        nominatorWalletAddress: row.nominatorWalletAddress,
        seconderHandle: row.seconderHandle,
        seconderWalletAddress: row.seconderWalletAddress,
        rewardId: row.rewardId,
        rewardLabel: reward?.label ?? row.rewardId,
        amount: row.amount,
        reason: row.reason,
        status: resolveNominationStatus(row.status, row.mintEventStatus),
        failureReason: row.failureReason,
        createdAt: row.createdAt,
        secondedAt: row.secondedAt,
        completedAt: row.completedAt,
      };
    });

    return json(nominations, 200, { 'x-no-db': 'false' });
  } catch {
    return json([], 200, { 'x-no-db': 'false' });
  }
};

export const POST: APIRoute = async (context) => {
  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503);
  }

  let body: NominationBody;
  try {
    body = (await context.request.json()) as NominationBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const nomineeWalletAddress = normalizeWallet(body.nomineeWalletAddress);
  const nominatorWalletAddress = normalizeWallet(body.nominatorWalletAddress);
  const rewardId = String(body.rewardId ?? '').trim();
  const reason = String(body.reason ?? '').trim();

  if (!/^0x[a-f0-9]{40}$/.test(nomineeWalletAddress) || !/^0x[a-f0-9]{40}$/.test(nominatorWalletAddress)) {
    return json({ ok: false, error: 'Valid nominator and nominee wallet addresses are required' }, 400);
  }

  if (nomineeWalletAddress === nominatorWalletAddress) {
    return json({ ok: false, error: 'You cannot nominate yourself for turkey glory' }, 400);
  }

  const reward = getNominationRewardOptionById(rewardId);
  if (!reward) {
    return json({ ok: false, error: 'Choose a valid reward loadout' }, 400);
  }

  if (reason.length < 12 || reason.length > 180) {
    return json({ ok: false, error: 'Lore briefing must be between 12 and 180 characters' }, 400);
  }

  try {
    const [nominee, nominator] = await Promise.all([
      findUserByWallet(db, nomineeWalletAddress),
      findUserByWallet(db, nominatorWalletAddress),
    ]);

    if (!nominee || !nominator) {
      return json({ ok: false, error: 'Both nominator and nominee must be onboarded crew members' }, 400);
    }

    const existingNomination = await db
      .prepare(
        `
          SELECT id
          FROM nominations
          WHERE nominee_wallet = ?
            AND nominator_wallet = ?
            AND status = 'awaiting_second'
          LIMIT 1
        `,
      )
      .bind(nomineeWalletAddress, nominatorWalletAddress)
      .first<{ id: string }>();

    if (existingNomination) {
      return json({ ok: false, error: 'You already launched a pending nomination for this gobbler' }, 409);
    }

    const id = randomId();
    const now = new Date().toISOString();

    await db
      .prepare(
        `
          INSERT INTO nominations (
            id,
            nominee_wallet,
            nominator_wallet,
            seconder_wallet,
            reward_id,
            amount_raw,
            reason,
            status,
            mint_event_id,
            created_at,
            seconded_at,
            completed_at,
            failed_at,
            failure_reason
          )
          VALUES (?, ?, ?, NULL, ?, ?, ?, 'awaiting_second', NULL, ?, NULL, NULL, NULL, NULL)
        `,
      )
      .bind(id, nomineeWalletAddress, nominatorWalletAddress, reward.id, reward.amount, reason, now)
      .run();

    return json({ ok: true, id }, 201);
  } catch {
    return json({ ok: false, error: 'Could not register nomination' }, 500);
  }
};
