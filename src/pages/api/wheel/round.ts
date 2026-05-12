import type { APIRoute } from 'astro';

import { getDB } from '../../../lib/db';

export const prerender = false;

type RoundPickRow = { walletAddress: string; pickedAt: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async (context) => {
  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503);
  }

  const result = await db
    .prepare(
      `SELECT wallet_address AS walletAddress, picked_at AS pickedAt
       FROM wheel_round_picks
       ORDER BY picked_at ASC`,
    )
    .all<RoundPickRow>();

  return json({ ok: true, picks: result.results ?? [] });
};

export const DELETE: APIRoute = async (context) => {
  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503);
  }

  await db.prepare('DELETE FROM wheel_round_picks').run();
  return json({ ok: true });
};
