import type { APIRoute } from 'astro';

import { getDB } from '../../lib/db';

export const prerender = false;

type RecentMintRow = {
  id: string;
  handle: string;
  walletAddress: string;
  reason: string;
  amount: string;
  status: 'queued' | 'submitted' | 'confirmed' | 'failed';
  createdAt: string;
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
    const result = await db
      .prepare(
        `
          SELECT
            m.id AS id,
            COALESCE(u.handle, 'UNKNOWN') AS handle,
            COALESCE(m.to_wallet, m.wallet_address) AS walletAddress,
            COALESCE(m.reason, 'manual reward') AS reason,
            COALESCE(m.amount_raw, CAST(m.amount AS TEXT), '0') AS amount,
            m.status AS status,
            m.created_at AS createdAt
          FROM mint_events m
          LEFT JOIN users u ON u.wallet_address = COALESCE(m.to_wallet, m.wallet_address)
          WHERE m.status IN ('queued', 'submitted', 'confirmed')
          ORDER BY m.created_at DESC
          LIMIT 12
        `,
      )
      .all<RecentMintRow>();

    return json(result.results ?? [], 200, { 'x-no-db': 'false' });
  } catch {
    return json([], 200, { 'x-no-db': 'false' });
  }
};
