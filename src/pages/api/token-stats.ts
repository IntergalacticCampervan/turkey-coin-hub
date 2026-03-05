import type { APIRoute } from 'astro';

import { getOnchainEnv, getOnchainTokenStats } from '../../lib/onchain';

export const prerender = false;

type CachedTokenStats = {
  expiresAt: number;
  data: Awaited<ReturnType<typeof getOnchainTokenStats>>;
};

let tokenStatsCache: CachedTokenStats | null = null;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async (context) => {
  const now = Date.now();
  if (tokenStatsCache && tokenStatsCache.expiresAt > now) {
    return json({ ok: true, ...tokenStatsCache.data });
  }

  try {
    const stats = await getOnchainTokenStats(getOnchainEnv(context.locals));
    tokenStatsCache = {
      data: stats,
      expiresAt: now + 20_000,
    };

    return json({ ok: true, ...stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load token stats';
    return json({ ok: false, error: message }, 502);
  }
};
