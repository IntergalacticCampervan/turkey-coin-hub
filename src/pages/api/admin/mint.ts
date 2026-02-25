import type { APIRoute } from 'astro';

import { getAdminAuthEnv, requireAccessAuth } from '../../../lib/auth';
import { APP_CHAIN_META } from '../../../lib/chain';
import { getDB } from '../../../lib/db';

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

    // TODO: signer worker should pick queued events, submit tx, and move status to submitted/confirmed/failed.
    return json({ ok: true, eventId, txHash: null }, 200, warningHeaders);
  } catch {
    return json(
      { ok: false, error: 'Failed to queue mint event (possible duplicate idempotencyKey)' },
      409,
      warningHeaders,
    );
  }
};
