import type { APIRoute } from 'astro';

import { APP_CHAIN_META } from '../../../lib/chain';
import { getDB } from '../../../lib/db';

export const prerender = false;

type SpinBody = {
  winnerWalletAddress?: string;
  requesterWalletAddress?: string;
  idempotencyKey?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isWallet(input: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

function shortWallet(wallet: string) {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

export const POST: APIRoute = async (context) => {
  let body: SpinBody;
  try {
    body = (await context.request.json()) as SpinBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const winnerWalletAddress = String(body.winnerWalletAddress ?? '').trim().toLowerCase();
  const requesterWalletAddress = String(body.requesterWalletAddress ?? '').trim().toLowerCase();
  const idempotencyKey = String(body.idempotencyKey ?? '').trim();

  if (!isWallet(winnerWalletAddress)) {
    return json({ ok: false, error: 'winnerWalletAddress must be a valid wallet address' }, 400);
  }

  if (!isWallet(requesterWalletAddress)) {
    return json({ ok: false, error: 'requesterWalletAddress must be a valid wallet address' }, 400);
  }

  if (idempotencyKey.length < 8) {
    return json({ ok: false, error: 'idempotencyKey is required (min 8 chars)' }, 400);
  }

  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503);
  }

  const winner = await db
    .prepare(
      `
        SELECT handle
        FROM users
        WHERE wallet_address = ?
        LIMIT 1
      `,
    )
    .bind(winnerWalletAddress)
    .first<{ handle: string }>();

  if (!winner?.handle) {
    return json({ ok: false, error: 'Winner wallet is not enrolled in the roster' }, 404);
  }

  const requester = await db
    .prepare(
      `
        SELECT handle
        FROM users
        WHERE wallet_address = ?
        LIMIT 1
      `,
    )
    .bind(requesterWalletAddress)
    .first<{ handle: string }>();

  if (!requester?.handle) {
    return json({ ok: false, error: 'Requester wallet is not enrolled' }, 403);
  }

  const existingEvent = await db
    .prepare(
      `
        SELECT id, status
        FROM mint_events
        WHERE idempotency_key = ?
        LIMIT 1
      `,
    )
    .bind(idempotencyKey)
    .first<{ id: string; status: string }>();

  if (existingEvent) {
    return json({ ok: true, eventId: existingEvent.id, status: existingEvent.status }, 200);
  }

  const eventId = randomId();
  const now = new Date().toISOString();
  const reason = `[WHEEL_REQUEST] @${winner.handle} selected by @${requester.handle} for standup host (10 TC pending admin approval)`;
  const requesterSubject = `public-wheel:${requesterWalletAddress}`;

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
        VALUES (?, ?, ?, ?, 'approval_pending', ?, NULL, ?, NULL, ?, ?, ?, ?, NULL, NULL, ?)
      `,
    )
    .bind(
      eventId,
      winnerWalletAddress,
      '10',
      APP_CHAIN_META.id,
      idempotencyKey,
      requesterSubject,
      now,
      winnerWalletAddress,
      10,
      reason,
      requesterSubject,
    )
    .run();

  return json({
    ok: true,
    eventId,
    status: 'approval_pending',
    winner: `@${winner.handle}`,
    requester: `@${requester.handle}`,
    wallet: shortWallet(winnerWalletAddress),
  });
};
