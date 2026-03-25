# Advisor Intelligence Suite — Development Rules

## Critical: Next.js App Router Dynamic Route Segments

**NEVER create duplicate dynamic route segments at the same directory level.**

Next.js App Router cannot have two different dynamic slugs as siblings — e.g. both `[id]` and `[clientId]` under `app/api/clients/`. This silently breaks ALL routing under that tree.

The canonical slug is **`[id]`** everywhere. Do NOT use `[clientId]`, `[meetingId]`, `[entityId]`, `[profileId]`, or any other variant as a sibling.

Before committing, run: `bash scripts/check-route-conflicts.sh`

A pre-commit hook enforces this automatically.

## When merging branches

Always check for duplicate dynamic route segments after merging. Old branches may contain legacy `[clientId]` routes that conflict with canonical `[id]` routes. Run the conflict check immediately after any merge.

## Architecture

- **Next.js App Router** — all pages and API routes under `app/`
- **MuleSoft EAPI** — OAuth2 client credentials, proxies to Orion + Salesforce
- **Orion data** — portfolio accounts, assets, performance via `/api/v1/portfolio/` and `/api/v1/reporting/scope`
- **Salesforce data** — households, members, tasks, events, cases, opportunities via `/api/v1/household`
- Dev server: `npx next dev --webpack` on port 3000

## Environment

- `.env` must have `MULESOFT_ENABLED=true` and `ACTIVE_PORTFOLIO_PROVIDER=mulesoft` for live data
- Login: UAT advisor accounts ending in `.uat`
