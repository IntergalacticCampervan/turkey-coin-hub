import type { APIRoute } from 'astro';

import { getDB } from '../../lib/db';

export const prerender = false;

type LeaderboardRow = {
  handle: string;
  walletAddress: string;
  balance: string;
  updatedAt: string;
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

export const GET: APIRoute = async (context) => {
  const db = getDB(context);
  if (!db) {
    return json([], 200, { 'x-no-db': 'true' });
  }

  try {
    const query = `
      SELECT
        u.handle AS handle,
        u.wallet_address AS walletAddress,
        COALESCE(b.balance, '0') AS balance,
        COALESCE(b.updated_at, u.updated_at) AS updatedAt
      FROM users u
      LEFT JOIN balance_cache b ON b.wallet_address = u.wallet_address
      ORDER BY CAST(COALESCE(b.balance, '0') AS INTEGER) DESC, u.handle ASC
      LIMIT 100
    `;

    const result = await db.prepare(query).all<LeaderboardRow>();
    return json(result.results ?? [], 200, { 'x-no-db': 'false' });
  } catch {
    return json([], 200, { 'x-no-db': 'false' });
  }
};
