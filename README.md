# Turkey Coin Hub

Turkey Coin Hub now runs as a single React SPA mounted inside Astro, while Astro still hosts all same-origin APIs and Cloudflare runtime integrations.

## Architecture

- Host/runtime: Astro (`@astrojs/cloudflare`) on Cloudflare Pages Functions
- UI: Single React SPA mounted with `client:only="react"`
- Routing model:
  - Astro serves the shell for `/` and catch-all non-API routes via `src/pages/[...spa].astro`
  - React Router handles SPA client routes (`/`, `/admin`, `/api-specs`, `/status`)
  - Astro still handles `/api/*` routes directly
- APIs and auth: unchanged in `src/pages/api/*`
  - Same-origin API calls only (`/api/...`)
  - Cloudflare Access JWT verification + allowlists preserved
  - `x-auth-warning` surfaced in admin UI
- Data: Cloudflare D1 binding `DB` with existing migrations unchanged
- Web3: existing RainbowKit + wagmi provider/connect flow reused

## Current Routes

SPA routes:
- `/` Dashboard
- `/admin` Admin
- `/api-specs` API specs
- `/status` Status
- `/onboard` redirects to `/` (onboarding is now wallet-gated from initial entry flow)

API routes (unchanged):
- `GET /api/leaderboard`
- `GET /api/recent-mints`
- `GET /api/token-stats`
- `POST /api/onboard`
- `GET /api/users`
- `GET /api/users/auth`
- `POST /api/admin/mint`
- `GET /api/admin/mint-events`
- `PATCH /api/admin/mint-events`
- `GET /api/admin/auth`
- `GET /api/status`

Admin mint note:
- `POST /api/admin/mint` now supports issuance-type tagging via `reason`, for example:
  - `"[ISSUED] monthly admin allocation"`
  - `"[REWARD] merged PR #42"`
  - `"[TRANSFER] team lunch contribution"`
- Tags are optional metadata rendered in the dashboard transaction badge. Storage uses existing `mint_events.reason` (no DB migration required).

Navigation notes:
- `Status` is intentionally removed from sidebar navigation.
- Users reach full status details from the dashboard terminal card (`/status`).
- Wallet setup and custom token import help is available at `/help/wallet-setup`.

## Important Paths

- SPA entry: `src/spa/App.tsx`
- SPA shell/components/views: `src/spa/*`
- SPA mount pages: `src/pages/index.astro`, `src/pages/[...spa].astro`
- API routes: `src/pages/api/*`
- Auth logic: `src/lib/auth.ts`
- D1 access: `src/lib/db.ts`
- Imported UI snapshot: `imports/turkey-coin-dashboard/`

## Local Development

1. Install deps:
   - `npm install`
2. Run Astro dev:
   - `npm run dev`
3. Build:
   - `npm run build`
4. Optional Cloudflare Pages local runtime from build output:
   - `npm run dev:cf`

## Environment Variables

Required:
- `PUBLIC_WALLETCONNECT_PROJECT_ID`

Admin/auth:
- `ADMIN_SUBJECT_ALLOWLIST`
- `ADMIN_EMAIL_ALLOWLIST`
- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`
- `ADMIN_AUTH_BYPASS_LOCAL`

## Data + Migrations

- Migrations remain source of truth in `migrations/`
- Schema snapshot/reference remains in `schema.sql`
- D1 binding name must remain `DB`
