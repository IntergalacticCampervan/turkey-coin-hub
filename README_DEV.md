# Turkey Coin Hub Dev Setup (Cloudflare Pages + D1)

## 1) Install dependencies

```bash
npm install
```

## 2) Create D1 database

```bash
npx wrangler d1 create turkey-coin
```

Copy the returned `database_id` and update `wrangler.toml`:
- `database_id`
- `preview_database_id` (can be same placeholder initially)

## 3) Apply schema

Canonical schema is managed via `migrations/`. Prefer migrations over direct schema file execution.

Migrations (recommended):

```bash
npx wrangler d1 migrations apply turkey-coin --local
npx wrangler d1 migrations apply turkey-coin
```

Remote (Cloudflare D1):

```bash
npx wrangler d1 execute turkey-coin --file=schema.sql
```

Local (for wrangler local state):

```bash
npx wrangler d1 execute turkey-coin --local --file=schema.sql
```

## 4) Configure env

Create `.env` (or set env in Cloudflare Pages project settings):

```dotenv
PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
ADMIN_SUBJECT_ALLOWLIST=
ADMIN_EMAIL_ALLOWLIST=
CF_ACCESS_TEAM_DOMAIN=
CF_ACCESS_AUD=
ADMIN_AUTH_BYPASS_LOCAL=false
```

`ADMIN_SUBJECT_ALLOWLIST` and `ADMIN_EMAIL_ALLOWLIST` are comma-separated.

## 5) Build Astro

```bash
npm run build
```

## 6) Run Cloudflare Pages local runtime (with D1 binding)

```bash
npm run dev:cf
```

This serves the built app from `./dist` using the Pages runtime and persists local state under `.wrangler/state`.

## Optional: plain Astro dev server

```bash
npm run dev
```

Note: plain Astro dev is useful for UI iteration, but D1 binding and Cloudflare request/runtime headers are validated best through `npm run build` + `npm run dev:cf`.
