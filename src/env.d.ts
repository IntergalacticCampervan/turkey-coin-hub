type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: import('./lib/db').D1Database;
  ADMIN_SUBJECT_ALLOWLIST?: string;
  ADMIN_EMAIL_ALLOWLIST?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_AUTH_BYPASS_LOCAL?: string;
  TOKEN_CONTRACT_ADDRESS?: string;
  TOKEN_MINTER_PRIVATE_KEY?: string;
  TOKEN_DECIMALS?: string;
  TOKEN_RPC_URL?: string;
}>;

declare namespace App {
  interface Locals extends Runtime {
    DB?: import('./lib/db').D1Database;
  }
}
