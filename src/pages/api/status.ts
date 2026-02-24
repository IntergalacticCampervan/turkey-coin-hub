import type { APIRoute } from 'astro';

import { APP_CHAIN_META } from '../../lib/chain';
import { getDB } from '../../lib/db';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async (context) => {
  const db = getDB(context);

  return json({
    ok: true,
    hasD1: Boolean(db),
    chain: APP_CHAIN_META.slug,
    now: new Date().toISOString(),
  });
};
