import type { APIRoute } from 'astro';

import { getAdminAuthEnv } from '../../lib/auth';

function normalizeReturnTo(input: string | null): string {
  if (!input || !input.startsWith('/')) {
    return '/admin';
  }

  if (input.startsWith('//')) {
    return '/admin';
  }

  return input;
}

export const GET: APIRoute = ({ request, locals, redirect }) => {
  const env = getAdminAuthEnv(locals);
  const requestUrl = new URL(request.url);
  const returnTo = normalizeReturnTo(requestUrl.searchParams.get('return_to'));
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  if (!teamDomain) {
    return redirect(returnTo);
  }

  const loginUrl = new URL(`https://${teamDomain}/cdn-cgi/access/login/${requestUrl.hostname}`);
  loginUrl.searchParams.set('redirect_url', returnTo);

  return redirect(loginUrl.toString());
};
