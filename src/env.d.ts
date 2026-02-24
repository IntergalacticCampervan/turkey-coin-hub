type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: import('./lib/db').D1Database;
  ADMIN_SUBJECT_ALLOWLIST?: string;
  ADMIN_EMAIL_ALLOWLIST?: string;
}>;

declare namespace App {
  interface Locals extends Runtime {
    DB?: import('./lib/db').D1Database;
  }
}
