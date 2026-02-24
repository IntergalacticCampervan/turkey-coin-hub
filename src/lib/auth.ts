export type AdminAuthEnv = {
  ADMIN_SUBJECT_ALLOWLIST?: string;
  ADMIN_EMAIL_ALLOWLIST?: string;
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

export function getAdminAuthEnv(locals: unknown): AdminAuthEnv {
  const runtimeEnv = (locals as { runtime?: { env?: AdminAuthEnv } } | undefined)?.runtime?.env;
  const localEnv = locals as AdminAuthEnv | undefined;

  return {
    ADMIN_SUBJECT_ALLOWLIST:
      runtimeEnv?.ADMIN_SUBJECT_ALLOWLIST ?? localEnv?.ADMIN_SUBJECT_ALLOWLIST ?? import.meta.env.ADMIN_SUBJECT_ALLOWLIST,
    ADMIN_EMAIL_ALLOWLIST:
      runtimeEnv?.ADMIN_EMAIL_ALLOWLIST ?? localEnv?.ADMIN_EMAIL_ALLOWLIST ?? import.meta.env.ADMIN_EMAIL_ALLOWLIST,
  };
}

function getSubjectFromRequest(request: Request): string | null {
  const cfSubject = request.headers.get('CF-Access-Authenticated-User-Subject');
  if (cfSubject?.trim()) {
    return cfSubject.trim();
  }

  const cfJwtAssertion = request.headers.get('CF-Access-Jwt-Assertion');
  if (cfJwtAssertion?.trim()) {
    return 'cf-access-user';
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return 'bearer-user';
  }

  return null;
}

function getEmailFromRequest(request: Request): string | null {
  const email =
    request.headers.get('CF-Access-Authenticated-User-Email') ||
    request.headers.get('X-Auth-Request-Email');

  return email?.trim().toLowerCase() || null;
}

export function requireAccessAuth(request: Request, env: AdminAuthEnv): AccessAuthResult {
  const subject = getSubjectFromRequest(request);
  if (!subject) {
    return { ok: false, status: 401, error: 'Missing Cloudflare Access authentication headers' };
  }

  const email = getEmailFromRequest(request);

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
