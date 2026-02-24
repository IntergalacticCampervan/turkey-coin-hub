import type { APIRoute } from 'astro';

import { getDB } from '../../lib/db';

type OnboardBody = {
  walletAddress?: string;
  handle?: string;
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
  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503);
  }

  let body: OnboardBody;
  try {
    body = (await context.request.json()) as OnboardBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const walletAddress = String(body.walletAddress ?? '').trim();
  const handle = String(body.handle ?? '').trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return json({ ok: false, error: 'Invalid wallet address' }, 400);
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(handle)) {
    return json({ ok: false, error: 'Invalid handle format' }, 400);
  }

  const now = new Date().toISOString();

  try {
    await db
      .prepare(
        `
          INSERT INTO users (id, wallet_address, handle, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(wallet_address)
          DO UPDATE SET handle = excluded.handle, updated_at = excluded.updated_at
        `,
      )
      .bind(randomId(), walletAddress.toLowerCase(), handle, now, now)
      .run();

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Handle or wallet already exists' }, 409);
  }
};
