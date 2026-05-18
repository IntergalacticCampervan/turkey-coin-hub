import type { APIRoute } from 'astro';

import { getDB } from '../../../lib/db';

export const prerender = false;

type ClaimBody = {
  walletAddress?: string;
  itemId?: string;
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

function isWallet(input: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

export const POST: APIRoute = async (context) => {
  let body: ClaimBody;
  try {
    body = (await context.request.json()) as ClaimBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const walletAddress = String(body.walletAddress ?? '').trim().toLowerCase();
  const itemId = String(body.itemId ?? '').trim();

  if (!isWallet(walletAddress)) {
    return json({ ok: false, error: 'walletAddress must be a valid wallet address' }, 400);
  }

  if (!itemId) {
    return json({ ok: false, error: 'itemId is required' }, 400);
  }

  const db = getDB(context);
  if (!db) return json({ ok: false, error: 'D1 is not configured' }, 503);

  try {
    const user = await db
      .prepare(`SELECT handle FROM users WHERE wallet_address = ? LIMIT 1`)
      .bind(walletAddress)
      .first<{ handle: string }>();

    if (!user?.handle) {
      return json({ ok: false, error: 'Wallet is not enrolled in the roster' }, 403);
    }

    const item = await db
      .prepare(`SELECT id, label, cost, active FROM shop_items WHERE id = ? LIMIT 1`)
      .bind(itemId)
      .first<{ id: string; label: string; cost: string; active: number }>();

    if (!item) {
      return json({ ok: false, error: 'Item not found' }, 404);
    }

    if (item.active !== 1) {
      return json({ ok: false, error: 'Item is no longer available' }, 410);
    }

    const id = randomId();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO redemption_events
           (id, wallet_address, item_id, item_label, cost, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(id, walletAddress, item.id, item.label, item.cost, now)
      .run();

    return json({ ok: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? 'DB error');
    return json({ ok: false, error: msg }, 500);
  }
};
