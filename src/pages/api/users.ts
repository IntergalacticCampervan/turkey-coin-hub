import type { APIRoute } from 'astro';

import { getAdminAuthEnv, requireAccessAuth } from '../../lib/auth';
import { getDB } from '../../lib/db';

export const prerender = false;

type UserRow = {
  handle: string;
  walletAddress: string;
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
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  const warningHeaders = auth.warning ? { 'x-auth-warning': auth.warning } : undefined;

  const db = getDB(context);
  if (!db) {
    return json([], 200, warningHeaders);
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

    return json(result.results ?? [], 200, warningHeaders);
  } catch {
    return json([], 200, warningHeaders);
  }
};
