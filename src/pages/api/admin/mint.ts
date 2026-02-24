import type { APIRoute } from 'astro';

import { requireAccessAuth } from '../../../lib/auth';
import { getDB } from '../../../lib/db';

type MintBody = {
  walletAddress?: string;
  amount?: number;
  reason?: string;
  idempotencyKey?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const POST: APIRoute = async (context) => {
  const auth = requireAccessAuth(context.request);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  let body: MintBody;
  try {
    body = (await context.request.json()) as MintBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const walletAddress = String(body.walletAddress ?? '').trim().toLowerCase();
  const amount = Number(body.amount);
  const reason = String(body.reason ?? '').trim();
  const idempotencyKey = String(body.idempotencyKey ?? '').trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return json({ ok: false, error: 'Invalid wallet address' }, 400);
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return json({ ok: false, error: 'Amount must be a positive integer' }, 400);
  }

  if (reason.length < 3 || reason.length > 120) {
    return json({ ok: false, error: 'Reason must be between 3 and 120 chars' }, 400);
  }

  if (idempotencyKey.length < 8) {
    return json({ ok: false, error: 'idempotencyKey must be at least 8 chars' }, 400);
  }

  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503);
  }

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
      .bind(randomId(), walletAddress, amount, reason, idempotencyKey, new Date().toISOString(), auth.subject)
      .run();

    // TODO: call Cloudflare Worker signer / contract mint and then persist mint_tx_hash + final status.
    return json({ ok: true, txHash: null });
  } catch {
    return json({ ok: false, error: 'Failed to queue mint event (possible duplicate idempotency key)' }, 409);
  }
};
