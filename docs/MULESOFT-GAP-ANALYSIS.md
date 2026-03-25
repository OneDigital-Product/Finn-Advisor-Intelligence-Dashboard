# MuleSoft EAPI Gap Analysis — Orion API Coverage

**Date:** 2026-03-20
**Tested against:** `https://od-wad-eapi-dev-t0nidn.63g8ag.usa-e1.cloudhub.io`
**Auth:** OAuth2 client credentials via `https://od-auth-service-uat-dgm3vs.63g8ag.usa-e1.cloudhub.io/v1.0/oauth2/token`
**Method:** Direct curl with valid Bearer token — both lowercase and PascalCase path variations tested

---

## Summary

| Category | Count |
|----------|-------|
| **Endpoints LIVE (200)** | 6 |
| **Endpoints NOT FOUND (404)** | 20+ |
| **Orion API domains available** | 2 (Portfolio — partial, Reporting — partial) |
| **Orion API domains missing entirely** | 6 (Compliance, Billing, Risk, Planning, Trading, Integrations) |

---

## ✅ LIVE Endpoints (returning 200)

| # | Endpoint | What it returns | Used in our app? |
|---|----------|-----------------|------------------|
| 1 | `GET /api/v1/portfolio/clients/value` | All 508 clients with name + AUM value | ✅ Client list, dashboard AUM |
| 2 | `GET /api/v1/portfolio/clients/{id}/accounts/value` | Accounts for a client with balances, custodian, registration type | ✅ Client detail accounts |
| 3 | `GET /api/v1/portfolio/clients/{id}/assets` | Holdings/assets with ticker, shares, market value (costBasis always null) | ✅ Portfolio holdings table |
| 4 | `GET /api/v1/household?username={u}` | Household summary (requires `username` query param) | ✅ Client detail household |
| 5 | `GET /api/v1/household/members?username={u}&householdId={id}` | Household members (requires `username` + `householdId`) | ✅ Client detail members |
| 6 | `POST /api/v1/reporting/scope` | Performance (TWR), allocation, activity, portfolio detail, tax data via nested calculation tree | ✅ Performance chart (MTD/YTD TWR), allocation breakdown |

### Known data gap in live endpoints

- **`costBasis`** field on `/clients/{id}/assets` — exists in response schema but returns `null` for ALL 1,625+ assets across ALL clients. Tested with `?includeCostBasis=true` parameter — no effect. The dedicated Orion endpoint `GET /v1/Reporting/Activity/CostBasis` is not exposed through MuleSoft (404).

---

## ❌ NOT FOUND Endpoints (all return 404 APIKIT:NOT_FOUND)

### High-Value — Would unlock major UI features

| # | Tested Path (lowercase) | Also tested (PascalCase) | Orion Native Endpoint | What it would provide | UI Feature it unlocks |
|---|-------------------------|--------------------------|----------------------|----------------------|----------------------|
| 1 | `/api/v1/portfolio/clients/{id}/performance/summary` | `/Portfolio/Clients/{id}/Performance/Summary` | `GET /Portfolio/Performance/Summary` | TWR, IRR, benchmark comparison | Performance chart on client detail |
| 2 | `/api/v1/portfolio/clients/{id}/aumovertime` | `/Portfolio/Clients/{id}/AumOverTime` | `GET /Portfolio/AumOverTime` | Historical AUM by date range | AUM trend line chart |
| 3 | `/api/v1/portfolio/clients/{id}/transactions` | `/Portfolio/Clients/{id}/Transactions` | `GET /Portfolio/Transactions/Search` | Buy/sell/dividend history | Transaction history tab |
| 4 | `/api/v1/reporting/activity/costbasis` | `/Reporting/Activity/CostBasis` | `GET /Reporting/Activity/CostBasis` | Lot-level cost basis, gain/loss | Cost basis column (currently shows "—") |
| 5 | `/api/v1/portfolio/clients/{id}/balancesheet` | `/Portfolio/Clients/{id}/BalanceSheet` | `GET /Portfolio/BalanceSheet` | Assets vs liabilities breakdown | Balance sheet / net worth view |

### Medium-Value — Would enhance existing features

| # | Tested Path | Orion Native Endpoint | What it would provide | UI Feature |
|---|-------------|----------------------|----------------------|------------|
| 6 | `/api/v1/portfolio/clients/{id}/goaltracking` | `GET /Portfolio/GoalTracking` | Goal progress, target amounts | Financial planning goals |
| 7 | `/api/v1/portfolio/clients/{id}/modeltolerance` | `GET /Portfolio/ModelTolerance` | Model drift, rebalancing needs | Model compliance alerts |
| 8 | `/api/v1/portfolio/clients/{id}/rmdcalculations` | `GET /Portfolio/RMDCalculations` | Required minimum distributions | RMD planning for retirement accounts |
| 9 | `/api/v1/portfolio/clients/{id}/documents` | `GET /Portfolio/Documents` | Statements, tax forms | Document vault |
| 10 | `/api/v1/risk/profile` | `GET /Risk/Profile` | Risk tolerance scores | Risk assessment display |

### Lower-Value — Nice to have

| # | Tested Path | Orion Native Endpoint | What it would provide |
|---|-------------|----------------------|----------------------|
| 11 | `/api/v1/portfolio/accounts/accountinformation/beneficiaries/{id}` | `GET /Portfolio/Accounts/AccountInformation/Beneficiaries` | Beneficiary designations |
| 12 | `/api/v1/compliance/riskdashboard/accountalerts` | `GET /Compliance/RiskDashboard/AccountAlerts` | Compliance alerts |
| 13 | `/api/v1/compliance/riskdashboard/risktiles` | `GET /Compliance/RiskDashboard/RiskTiles` | Risk dashboard summary tiles |
| 14 | `/api/v1/billing/billgenerator/summary` | `GET /Billing/BillGenerator/Summary` | Fee/billing summary |
| ~~15~~ | ~~`/api/v1/reporting/scope`~~ | **MOVED TO LIVE** — `POST /api/v1/reporting/scope` works (POST, not GET) | ✅ Now wired into frontend |
| 16 | `/api/v1/planning/networth` | `GET /Planning/NetWorth` | Net worth calculations |

---

## What We Need From MuleSoft Team

### Priority 1 — Critical (blocks core features)

1. **Performance Summary** — `GET /v1/Portfolio/Performance/Summary?clientId={id}`
   → Enables: performance returns display, TWR/IRR metrics

2. **Cost Basis** — `GET /v1/Reporting/Activity/CostBasis?clientId={id}`
   → Enables: cost basis column in holdings (currently shows "—" for all 1,625 assets)
   → Note: the `costBasis` field on `/clients/{id}/assets` always returns null

3. **Transactions** — `GET /v1/Portfolio/Transactions/Search?clientId={id}`
   → Enables: transaction history tab

### Priority 2 — High value

4. **AUM Over Time** — `GET /v1/Portfolio/AumOverTime?clientId={id}`
   → Enables: historical AUM trend chart

5. **Balance Sheet** — `GET /v1/Portfolio/BalanceSheet?clientId={id}`
   → Enables: assets vs liabilities view

### Priority 3 — Enhancement

6. **Goal Tracking** — `GET /v1/Portfolio/GoalTracking?clientId={id}`
7. **Model Tolerance** — `GET /v1/Portfolio/ModelTolerance?clientId={id}`
8. **Risk Profile** — `GET /v1/Risk/Profile?clientId={id}`

---

## Architecture Reference

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Next.js App │────▶│  MuleSoft EAPI   │────▶│  Orion API  │
│  (port 3000) │     │  (CloudHub DEV)  │     │  (Connect)  │
│              │     │                  │     │             │
│ Route Handler│     │ 5 endpoints live │     │ 800+ endpts │
│ → mulesoft/  │     │ 16+ return 404   │     │ available   │
│   api.ts     │     │                  │     │             │
└──────────────┘     └──────────────────┘     └─────────────┘
```

**Our code is ready** — `server/integrations/mulesoft/api.ts` + `mulesoftFetch()` can call any new endpoint immediately. The bottleneck is MuleSoft EAPI routing configuration.

---

## Test Evidence

All tests performed 2026-03-20 with valid OAuth Bearer token. Transaction IDs available for MuleSoft team verification:

- Token endpoint: `200 OK` ✅
- `/portfolio/clients/value`: `200 OK` ✅
- `/portfolio/clients/15073/accounts/value`: `200 OK` ✅
- `/portfolio/clients/15073/assets`: `200 OK` ✅ (costBasis: null on all records)
- `/household?username=...`: `200 OK` ✅
- `/household/members?username=...&householdId=...`: `200 OK` ✅
- All 21 other paths tested: `404 APIKIT:NOT_FOUND` ❌
- PascalCase variations tested for all 16 paths: `404 APIKIT:NOT_FOUND` ❌
