export type AccessAuthResult =
  | { ok: true; subject: string }
  | { ok: false; error: string };

export function requireAccessAuth(request: Request): AccessAuthResult {
  const cfAssertion = request.headers.get('CF-Access-Jwt-Assertion');
  const authHeader = request.headers.get('Authorization');

  // TODO: Verify Cloudflare Access JWT signature, issuer, audience, and subject claims.
  if (cfAssertion && cfAssertion.trim().length > 0) {
    return { ok: true, subject: 'cf-access-user' };
  }

  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return { ok: true, subject: 'bearer-user' };
  }

  return { ok: false, error: 'Missing Cloudflare Access auth headers' };
}
