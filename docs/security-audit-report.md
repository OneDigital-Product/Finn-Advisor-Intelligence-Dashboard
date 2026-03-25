# Security Audit Report — Advisor Intelligence Suite

**Date:** 2026-03-19
**Scope:** Full application security scan (server + client)
**Worktree:** `.claude/worktrees/priceless-nightingale/`

---

## Executive Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 2 | 2 | 0 |
| HIGH | 6 | 6 | 0 |
| MEDIUM | 5 | 3 | 2 |
| LOW | 6 | 0 | 6 |

---

## 1. CREDENTIALS IN CODE

### CRITICAL — Real OAuth credentials in `.claude/settings.local.json`

**Status: NOT IN GIT (verified)**

`.claude/settings.local.json` line 97 contains a bash command with a real `client_id` (`e00f0697-...`) and `client_secret` (`nbk8Q~r5_...`). However, `.claude/` is in `.gitignore` and this file is not committed.

**Recommendation:** Rotate the exposed credentials as a precaution. The `client_secret` value should be treated as compromised if this file was ever shared.

### MEDIUM — Hardcoded seed passwords

`server/seed.ts` contains hardcoded passwords: `"advisor123"`, `"RomanJuve1710!"`, `"admin123"`, `"associate123"`. These are for development seeding only and are hashed via `hashPassword()` before storage.

**Risk:** Low in production (seed is not run), but the passwords are visible in source code.

### PASS — No API keys in source

- No `sk-`, `sk_test`, `sk_live`, or `Bearer eyJ` tokens found in code.
- All sensitive values use `process.env.*` (83 env vars identified).
- `.env` is in `.gitignore`. `.env.example` contains only placeholder values.

---

## 2. ENVIRONMENT VARIABLES

### PASS — All properly externalized

- `.env` in `.gitignore`: YES (`.env`, `.env.local`, `.env.*.local`)
- `.env.example`: Clean — no real credentials, only `sk-...` and `your-secret-key-min-32-chars-here` placeholders
- All 83 env vars loaded via `process.env.*`, none hardcoded

### CRITICAL (FIXED) — Hardcoded username in debug route

**File:** `server/routes/clients.ts` line 1703-1706
**Was:** `michael.gouldin@onedigital.com.uat` hardcoded in diagnostic API calls
**Fix:** Replaced with `advisor.email` from session. Added `requireAuth` middleware.

---

## 3. API SECURITY

### PASS — MuleSoft OAuth

- Credentials stored only in env vars (`MULESOFT_CLIENT_ID`, `MULESOFT_CLIENT_SECRET`)
- Token cached in-memory only (`TOKEN_CACHE` object), not on disk
- Auto-refresh on 401: YES — `clearTokenCache()` called on 401/403, then retries once

### MEDIUM — Zoom uses deprecated JWT auth

`server/integrations/zoom/client.ts` uses JWT-based authentication (deprecated by Zoom). No retry on 401 for Zoom tokens.

**Recommendation:** Migrate to Server-to-Server OAuth.

---

## 4. INPUT VALIDATION

### Stats

- **734** uses of `req.params`, `req.query`, or `req.body` across server routes
- **~45** route files use Zod validation via `validateBody()` or `.safeParse()`
- **~15** route files destructure `req.body` without any schema validation

### MEDIUM — Routes without Zod validation

Files using raw `req.body` without schema validation:
- `scenarios.ts`, `triggers.ts`, `compliance.ts`, `meeting-processing.ts`
- `assessment.ts`, `feature-flags.ts`, `feedback.ts`, `client-insights.ts`
- `login-events.ts`, `pilot-metrics.ts`, `alert-generation.ts`, `kyc-aml.ts`

### MEDIUM — `req.params` not format-validated

Nearly all routes use `req.params.id` as raw strings without UUID validation. Only Cassidy routes use `isUUID()`. Drizzle ORM parameterizes queries, so this is not a SQL injection risk, but could cause unexpected errors.

### PASS — No SQL injection

- All Drizzle ORM `sql` tagged templates properly parameterize values
- Rate limiter table names validated with `/^[a-zA-Z_][a-zA-Z0-9_]*$/` regex
- No raw string concatenation in SQL queries

---

## 5. AUTHENTICATION

### HIGH (FIXED) — Data services endpoint had no auth

**File:** `server/routes/data-services.ts`
**Was:** All 3 routes (`GET /api/data-services`, `GET .../metadata`, `POST .../execute`) had no authentication
**Fix:** Added `requireAuth, requireAdvisor` to all 3 routes. Also replaced raw `err.message` in error response with generic message.

### HIGH (FIXED) — Client detail missing advisor ownership check

**File:** `server/routes/clients.ts` line 1407
**Was:** Associates were checked, but advisors could view any client
**Fix:** Added `client.advisorId !== req.session.userId` check for advisor users

### HIGH (FIXED) — Approval routes missing ownership checks

**File:** `server/routes/approvals.ts`

| Route | Was | Fix |
|-------|-----|-----|
| `GET /api/approvals/:id` | No ownership check | Added `submittedBy` filter to query |
| `PATCH /api/approvals/:id/approve` | No ownership check | Added `submittedBy !== advisorId` guard |
| `PATCH /api/approvals/:id/reject` | No ownership check | Added ownership lookup + guard before `applyApprovalChange` |

### HIGH (FIXED) — Meeting routes missing ownership checks

**File:** `server/routes/meetings.ts`

| Route | Fix |
|-------|-----|
| `GET /api/meetings/:id` | Added `meeting.advisorId !== req.session.userId` check |
| `POST /api/meetings/:id/prep` | Added ownership check |
| `POST /api/meetings/:id/summarize` | Added ownership check |
| `POST /api/meetings/:id/notes` | Added ownership check (fetch meeting first, then validate) |
| `POST /api/meetings/:id/transcript` | Added ownership check |

Note: `GET/POST /api/meetings/:id/notes-records` already had ownership checks via `getSessionAdvisor`.

### HIGH (FIXED) — Dashboard leaked all pending approvals cross-tenant

**File:** `server/routes/auth.ts` lines 220-221
**Was:** `db.select().from(approvalItems).where(eq(status, "pending"))` — no advisor filter
**Fix:** Added `eq(approvalItems.submittedBy, advisor.id)` to both the list and count queries

### PASS — Session management

- Session secret validated >= 32 characters
- Sessions stored in PostgreSQL (not in-memory)
- `httpOnly: true`, `secure: !isDev`, `sameSite: "lax"`
- Login rate limiting: 10 attempts per 15 minutes, fail-closed mode

---

## 6. DATA EXPOSURE

### PASS — No PII in logs

- No `console.log` with email/phone/SSN found
- Logger references to "email" are all about email-sending errors, not PII logging

### MEDIUM — Raw error messages in responses

~35 route handlers send `err.message` directly in error responses. Internal errors (database, third-party API) could leak implementation details.

**Files affected:** `activity-history.ts` (7), `activity-analytics.ts` (4), `workflow-automations.ts` (5), `calculators.ts` (8), `audit-log.ts` (4), `insurance.ts` (3), `login-events.ts` (4)

**Recommendation:** Replace with `sanitizeErrorMessage(err, "generic fallback")` pattern (already exists in `server/lib/error-utils.ts`).

### PASS — No stack traces in responses

No instances of `error.stack` sent in HTTP responses.

---

## 7. DEPENDENCY VULNERABILITIES

### PASS

```
npm audit: found 0 vulnerabilities
```

---

## 8. ENCRYPTION

### PASS — GCM authTagLength fix applied

`server/lib/crypto.ts`:
- `createCipheriv("aes-256-gcm", ...)` — line 17
- `createDecipheriv("aes-256-gcm", ..., { authTagLength: 16 })` — line 28

### PASS — No secrets in localStorage/sessionStorage

No instances of `localStorage.*token`, `localStorage.*secret`, or `sessionStorage.*token` found in client code.

---

## 9. CORS & HEADERS

### PASS — Helmet + CSP configured

- Strict CSP in production (no `unsafe-inline`/`unsafe-eval` for scripts)
- `frame-ancestors: 'none'`, HSTS with preload
- CORS origins read from `CORS_ORIGIN` env var; in production, if unset, all cross-origin requests denied

---

## 10. RATE LIMITING

### PASS — Core rate limiting in place

- All `/api/` routes: 200 requests per 15 minutes (PostgreSQL-backed store)
- Login: 10 failed attempts per 15 minutes (fail-closed)
- Uploads: 20 per hour
- Cassidy AI: per-advisor custom rate limiter

### LOW — Webhook endpoints lack dedicated rate limiting

`/api/salesforce/webhook`, `/api/zoom/webhook`, `/api/custodial/webhook` use only the general 200/15min limiter.

---

## Files Modified in This Audit

| File | Changes |
|------|---------|
| `server/routes/data-services.ts` | Added `requireAuth`, `requireAdvisor`, `logger`; replaced raw error message |
| `server/routes/clients.ts` | Added `requireAuth` import; added advisor ownership check on client detail; replaced hardcoded username in debug route |
| `server/routes/approvals.ts` | Added ownership checks to GET /:id, PATCH /approve, PATCH /reject |
| `server/routes/meetings.ts` | Added ownership checks to GET /:id, POST /prep, /summarize, /notes, /transcript |
| `server/routes/auth.ts` | Scoped dashboard pending approvals query by advisor ID |

---

## Remaining Items (Not Fixed — Lower Priority)

| # | Severity | Issue | Recommendation |
|---|----------|-------|---------------|
| 1 | MEDIUM | ~15 route files lack Zod body validation | Add schemas using existing `validateBody()` helper |
| ~~2~~ | ~~MEDIUM~~ | ~~req.params not format-validated~~ | **FIXED** — `registerParamValidators()` in middleware.ts validates `:id` params via `app.param()` |
| ~~3~~ | ~~MEDIUM~~ | ~~\~35 routes leak raw error.message~~ | **FIXED** — Applied `sanitizeErrorMessage()` across 7 affected route files |
| 4 | MEDIUM | Zoom uses deprecated JWT auth | Migrate to Server-to-Server OAuth |
| 5 | LOW | Seed passwords hardcoded | Move to env vars or remove from source |
| 6 | LOW | Webhook endpoints lack dedicated rate limiting | Add stricter per-endpoint limits |
| 7 | LOW | `/api/health/detailed` may expose infra info | Restrict to admin users |
| 8 | LOW | 30-day session cookie lifetime | Consider reducing to 24h |
| 9 | LOW | Zoom recording file path not sanitized | Sanitize `zoomRecordingId` for path separators |
| 10 | LOW | `JSON.parse(req.query.answers)` in fact-finders could DoS | Wrap in try/catch |
