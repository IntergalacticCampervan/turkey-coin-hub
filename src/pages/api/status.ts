import type { APIRoute } from 'astro';

import { getAdminAuthEnv } from '../../lib/auth';
import { APP_CHAIN_META } from '../../lib/chain';
import { getDB } from '../../lib/db';

export const prerender = false;

type DBPingResult = {
  ok: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async (context) => {
  const db = getDB(context);

  let d1Ping = false;
  if (db) {
    try {
      const result = await db.prepare('SELECT 1 as ok').first<DBPingResult>();
      d1Ping = Boolean(result?.ok === 1);
    } catch {
      d1Ping = false;
    }
  }

  const authEnv = getAdminAuthEnv(context.locals);
  const adminAllowlistConfigured = Boolean(
    authEnv.ADMIN_SUBJECT_ALLOWLIST?.trim() || authEnv.ADMIN_EMAIL_ALLOWLIST?.trim(),
  );

  return json({
    ok: true,
    hasD1: Boolean(db),
    d1Ping,
    chain: APP_CHAIN_META,
    adminAllowlistConfigured,
    now: new Date().toISOString(),
  });
};
