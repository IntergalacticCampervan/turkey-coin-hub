# Turkey Coin Hub

Internal Astro + React MVP for:
- wallet onboarding (`wallet_address -> handle`)
- public leaderboard (read-only)
- admin reward queueing (mint requests)

## Overview

- Frontend: Astro pages + React islands
- Web3: RainbowKit + wagmi + React Query
- Runtime/Deploy: Cloudflare Pages Functions (`@astrojs/cloudflare`)
- Database: Cloudflare D1 (`DB` binding)
- Chain default: Sepolia (centralized in `src/lib/chain.ts`)

## Current State

Implemented routes:
- `/` home links
- `/leaderboard` public leaderboard
- `/onboard` self-service onboarding
- `/admin` admin reward panel UI
- `/status` runtime health

Implemented API routes:
- `GET /api/leaderboard`
  - joins `users` + `balance_cache`
  - sorts by balance desc, then handle asc
  - returns `[]` with `x-no-db: true` if DB missing
- `POST /api/onboard`
  - validates wallet + handle
  - enforces unique handle ownership
  - inserts or updates user
- `GET /api/users` (admin)
  - requires access headers + allowlist checks
- `POST /api/admin/mint` (admin)
  - validates payload
  - writes `mint_events` with status `queued`
  - returns `{ ok, eventId, txHash: null }`
- `GET /api/status`
  - reports DB binding/ping, chain meta, allowlist config state

Current auth model:
- Cloudflare Access JWT verification using JWKS (`CF-Access-Jwt-Assertion` / Bearer token)
- Validates issuer + audience (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`)
- Additional allowlist checks:
  - `ADMIN_SUBJECT_ALLOWLIST`
  - `ADMIN_EMAIL_ALLOWLIST`
- Optional local-only bypass:
  - `ADMIN_AUTH_BYPASS_LOCAL=true`

## Data Model

Canonical schema source is `migrations/`.

`schema.sql` is a snapshot/reference and should be treated as generated documentation, not the source of truth.

Core tables:
- `users`
- `balance_cache`
- `mint_events`

## Local/Prod Setup

Use the dedicated runbook:
- `README_DEV.md`

Key requirements:
- D1 binding name must be `DB`
- schema/migrations must be applied to the bound production DB
- env vars must be set in Cloudflare Pages (Preview + Production)

## Environment Variables

Required:
- `PUBLIC_WALLETCONNECT_PROJECT_ID`

Admin controls:
- `ADMIN_SUBJECT_ALLOWLIST` (comma-separated)
- `ADMIN_EMAIL_ALLOWLIST` (comma-separated)
- `CF_ACCESS_TEAM_DOMAIN` (e.g. `yourteam.cloudflareaccess.com`)
- `CF_ACCESS_AUD` (Cloudflare Access app audience tag)
- `ADMIN_AUTH_BYPASS_LOCAL` (`true`/`false`, default `false`)

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Astro local dev server |
| `npm run build` | Build for Cloudflare Pages Functions |
| `npm run dev:cf` | Run Pages local runtime from `./dist` |
| `npm run deploy` | Deploy `./dist` with wrangler |

## Known Gaps / TODO

- Implement real mint execution + tx hash/status updates
- Add balance sync job (on-chain -> `balance_cache`)
