import type { APIRoute } from 'astro';

import { getAdminAuthEnv, requireAccessAuth } from '../../../lib/auth';
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
  const auth = requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
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

  try {
    await db
      .prepare(
        `
          INSERT INTO mint_events (
            id,
            wallet_address,
            amount,
            reason,
            idempotency_key,
            mint_tx_hash,
            status,
            created_at,
            admin_subject
          )
          VALUES (?, ?, ?, ?, ?, NULL, 'queued', ?, ?)
        `,
      )
      .bind(eventId, walletAddress, amount, reason, idempotencyKey, new Date().toISOString(), auth.subject)
      .run();

    // TODO: call Cloudflare Worker signer / contract mint and then persist mint_tx_hash + final status.
    return json({ ok: true, eventId, txHash: null }, 200, warningHeaders);
  } catch {
    return json(
      { ok: false, error: 'Failed to queue mint event (possible duplicate idempotencyKey)' },
      409,
      warningHeaders,
    );
  }
};
