import type { APIRoute } from 'astro';

import { requireAccessAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';

type UserRow = {
  handle: string;
  walletAddress: string;
  createdAt: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async (context) => {
  const auth = requireAccessAuth(context.request);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  const db = getDB(context);
  if (!db) {
    return json([]);
  }

  try {
    const result = await db
      .prepare(
        `
          SELECT handle, wallet_address AS walletAddress, created_at AS createdAt
          FROM users
          ORDER BY created_at DESC
          LIMIT 500
        `,
      )
      .all<UserRow>();

    return json(result.results ?? []);
  } catch {
    return json([]);
  }
};
