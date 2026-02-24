import type { APIRoute } from 'astro';

import { getDB } from '../../lib/db';

export const prerender = false;

type OnboardBody = {
  walletAddress?: string;
  handle?: string;
};

type ExistingUser = {
  id: string;
  walletAddress: string;
  handle: string;
};

type HandleOwner = {
  walletAddress: string;
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

  const walletAddress = String(body.walletAddress ?? '').trim().toLowerCase();
  const handle = String(body.handle ?? '').trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return json({ ok: false, error: 'Invalid wallet address' }, 400);
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(handle)) {
    return json({ ok: false, error: 'Invalid handle' }, 400);
  }

  const now = new Date().toISOString();

  try {
    const existingWallet = await db
      .prepare(
        `
          SELECT id, wallet_address AS walletAddress, handle
          FROM users
          WHERE wallet_address = ?
          LIMIT 1
        `,
      )
      .bind(walletAddress)
      .first<ExistingUser>();

    const handleOwner = await db
      .prepare(
        `
          SELECT wallet_address AS walletAddress
          FROM users
          WHERE handle = ?
          LIMIT 1
        `,
      )
      .bind(handle)
      .first<HandleOwner>();

    if (handleOwner && handleOwner.walletAddress !== walletAddress) {
      return json({ ok: false, error: 'Handle already taken' }, 409);
    }

    if (existingWallet) {
      await db
        .prepare(
          `
            UPDATE users
            SET handle = ?, updated_at = ?
            WHERE wallet_address = ?
          `,
        )
        .bind(handle, now, walletAddress)
        .run();

      return json({ ok: true });
    }

    await db
      .prepare(
        `
          INSERT INTO users (id, wallet_address, handle, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .bind(randomId(), walletAddress, handle, now, now)
      .run();

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Handle already taken' }, 409);
  }
};
