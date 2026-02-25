import { createRemoteJWKSet, jwtVerify } from 'jose';

export type AdminAuthEnv = {
  ADMIN_SUBJECT_ALLOWLIST?: string;
  ADMIN_EMAIL_ALLOWLIST?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_AUTH_BYPASS_LOCAL?: string;
};

export type AccessAuthResult =
  | {
      ok: true;
      subject: string;
      email: string | null;
      warning?: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
      warning?: string;
    };

function parseAllowlist(raw: string | undefined, lowercase = false): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (lowercase ? value.toLowerCase() : value));
}

let jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function getAdminAuthEnv(locals: unknown): AdminAuthEnv {
  const runtimeEnv = (locals as { runtime?: { env?: AdminAuthEnv } } | undefined)?.runtime?.env;
  const localEnv = locals as AdminAuthEnv | undefined;

  return {
    ADMIN_SUBJECT_ALLOWLIST:
      runtimeEnv?.ADMIN_SUBJECT_ALLOWLIST ?? localEnv?.ADMIN_SUBJECT_ALLOWLIST ?? import.meta.env.ADMIN_SUBJECT_ALLOWLIST,
    ADMIN_EMAIL_ALLOWLIST:
      runtimeEnv?.ADMIN_EMAIL_ALLOWLIST ?? localEnv?.ADMIN_EMAIL_ALLOWLIST ?? import.meta.env.ADMIN_EMAIL_ALLOWLIST,
    CF_ACCESS_TEAM_DOMAIN:
      runtimeEnv?.CF_ACCESS_TEAM_DOMAIN ?? localEnv?.CF_ACCESS_TEAM_DOMAIN ?? import.meta.env.CF_ACCESS_TEAM_DOMAIN,
    CF_ACCESS_AUD: runtimeEnv?.CF_ACCESS_AUD ?? localEnv?.CF_ACCESS_AUD ?? import.meta.env.CF_ACCESS_AUD,
    ADMIN_AUTH_BYPASS_LOCAL:
      runtimeEnv?.ADMIN_AUTH_BYPASS_LOCAL ??
      localEnv?.ADMIN_AUTH_BYPASS_LOCAL ??
      import.meta.env.ADMIN_AUTH_BYPASS_LOCAL,
  };
}

function getAuthToken(request: Request): string | null {
  const cfJwtAssertion = request.headers.get('CF-Access-Jwt-Assertion');
  if (cfJwtAssertion?.trim()) {
    return cfJwtAssertion.trim();
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

function toBool(input: string | undefined): boolean {
  return input?.trim().toLowerCase() === 'true';
}

function parseAudiences(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^['"]|['"]$/g, ''));
}

function normalizeTeamDomain(teamDomain: string): string {
  return teamDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function getRemoteJwkSet(teamDomain: string) {
  const normalized = normalizeTeamDomain(teamDomain);
  const issuer = `https://${normalized}`;
  const certsUrl = `${issuer}/cdn-cgi/access/certs`;

  if (!jwksCache.has(certsUrl)) {
    jwksCache.set(certsUrl, createRemoteJWKSet(new URL(certsUrl)));
  }

  return { issuer, jwks: jwksCache.get(certsUrl)! };
}

export async function requireAccessAuth(request: Request, env: AdminAuthEnv): Promise<AccessAuthResult> {
  const token = getAuthToken(request);
  if (!token) {
    return { ok: false, status: 401, error: 'Missing Cloudflare Access authentication headers' };
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audiences = parseAudiences(env.CF_ACCESS_AUD);
  const bypassEnabled = toBool(env.ADMIN_AUTH_BYPASS_LOCAL);

  if (!teamDomain || audiences.length === 0) {
    if (!bypassEnabled) {
      return {
        ok: false,
        status: 401,
        error: 'Cloudflare Access JWT verification is not configured (CF_ACCESS_TEAM_DOMAIN/CF_ACCESS_AUD)',
      };
    }

    return {
      ok: true,
      subject: 'local-bypass-subject',
      email: 'local-bypass@example.local',
      warning: 'ADMIN_AUTH_BYPASS_LOCAL=true is enabled; JWT verification is bypassed.',
    };
  }

  let subject = '';
  let email: string | null = null;
  try {
    const { issuer, jwks } = getRemoteJwkSet(teamDomain);
    const verified = await jwtVerify(token, jwks, {
      issuer,
      audience: audiences.length === 1 ? audiences[0] : audiences,
    });

    subject = String(verified.payload.sub ?? '').trim();
    email = verified.payload.email ? String(verified.payload.email).trim().toLowerCase() : null;

    if (!subject) {
      return { ok: false, status: 401, error: 'JWT is missing subject claim' };
    }
  } catch {
    return { ok: false, status: 401, error: 'Invalid Cloudflare Access JWT' };
  }

  const subjectAllowlist = parseAllowlist(env.ADMIN_SUBJECT_ALLOWLIST);
  const emailAllowlist = parseAllowlist(env.ADMIN_EMAIL_ALLOWLIST, true);

  if (subjectAllowlist.length === 0 && emailAllowlist.length === 0) {
    return {
      ok: true,
      subject,
      email,
      warning: 'Admin allowlist is not configured; allowing access for local development.',
    };
  }

  const subjectMatch = subjectAllowlist.includes(subject);
  const emailMatch = email ? emailAllowlist.includes(email) : false;

  if (!subjectMatch && !emailMatch) {
    return {
      ok: false,
      status: 403,
      error: 'Authenticated user is not in admin allowlist',
    };
  }

  return { ok: true, subject, email };
}
