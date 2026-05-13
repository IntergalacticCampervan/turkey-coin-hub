import type { APIRoute } from 'astro';

import { getDB } from '../../../lib/db';

export const prerender = false;

type ShopItemRow = {
  id: string;
  label: string;
  description: string;
  cost: string;
  active: number;
  sortOrder: number;
  createdAt: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async (context) => {
  const db = getDB(context);
  if (!db) return json({ ok: false, error: 'D1 is not configured' }, 503);

  const result = await db
    .prepare(
      `SELECT
         id,
         label,
         description,
         cost,
         active,
         sort_order AS sortOrder,
         created_at AS createdAt
       FROM shop_items
       WHERE active = 1
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all<ShopItemRow>();

  const items = (result.results ?? []).map((row) => ({
    ...row,
    active: row.active === 1,
  }));

  return json(items);
};
