# Service-to-Endpoint Map

**Last updated:** 2026-03-20
**App:** Advisor Intelligence Suite (Next.js on port 3000)
**MuleSoft EAPI:** `https://od-wad-eapi-dev-t0nidn.63g8ag.usa-e1.cloudhub.io`

---

## How Data Flows

```
Browser → Next.js Route Handler → server/integrations/mulesoft/api.ts → MuleSoft EAPI → Orion/Salesforce
```

All MuleSoft calls go through `mulesoftFetch()` in `server/integrations/mulesoft/api.ts`, which handles:
- OAuth2 token acquisition + caching (`client.ts`)
- Bearer token injection
- 401 retry with token refresh
- Error logging

---

## Active Endpoint Map

### Frontend Page → API Route → MuleSoft Endpoint

| Frontend Page | Next.js API Route | MuleSoft Endpoint | Status |
|--------------|-------------------|-------------------|--------|
| **Dashboard** (AUM, client count) | `GET /api/clients/stats` | `/api/v1/portfolio/clients/value` | ✅ LIVE |
| **Client List** (all tabs) | `GET /api/clients` | `/api/v1/portfolio/clients/value` | ✅ LIVE |
| **Client Detail → Accounts** | `GET /api/clients/[id]` | `/api/v1/portfolio/clients/{id}/accounts/value` | ✅ LIVE |
| **Client Detail → Holdings** | `GET /api/clients/[id]` | `/api/v1/portfolio/clients/{id}/assets` | ✅ LIVE |
| **Client Detail → Household** | `GET /api/clients/[id]` | `/api/v1/household?username=...` | ✅ LIVE |
| **Client Detail → Members** | `GET /api/clients/[id]` | `/api/v1/household/members?username=...&householdId=...` | ✅ LIVE |
| **Portfolio → Holdings Table** | `GET /api/clients/[id]` | `/api/v1/portfolio/clients/{id}/assets` | ✅ LIVE |
| **Portfolio → Cost Basis** | `GET /api/clients/[id]` | `/api/v1/portfolio/clients/{id}/assets` | ⚠️ LIVE but `costBasis` always null |

### Pages Using Local/Mock Data (no MuleSoft)

| Frontend Page | Data Source | Notes |
|--------------|-------------|-------|
| **Calendar** | Salesforce via local storage | Meetings/events |
| **Tasks** | Salesforce via local storage | Task list (403 for live clients) |
| **Asset Map** | Derived from MuleSoft client data | Client-side computation |

---

## MuleSoft Function Map (server/integrations/mulesoft/api.ts)

| Function | MuleSoft Path | Returns |
|----------|--------------|---------|
| `getPortfolioClients()` | `GET /api/v1/portfolio/clients/value` | `PortfolioClient[]` — id, name, value |
| `getClientAccounts(clientId)` | `GET /api/v1/portfolio/clients/{id}/accounts/value` | Account[] — number, value, custodian, registrationType |
| `getClientAssets(clientId)` | `GET /api/v1/portfolio/clients/{id}/assets` | Asset[] — ticker, name, shares, marketValue, costBasis(null) |
| `getHousehold(params)` | `GET /api/v1/household?username=...` | HouseholdResponse — accounts, details |
| `getHouseholdMembers(params)` | `GET /api/v1/household/members?...` | HouseholdMembersResponse — member list |

---

## Endpoints Requested From MuleSoft (not yet available)

See `docs/MULESOFT-GAP-ANALYSIS.md` for full details and priority ranking.

| Priority | Endpoint | Feature it unlocks |
|----------|----------|-------------------|
| P1 | `GET /v1/Portfolio/Performance/Summary` | Performance returns (TWR/IRR) |
| P1 | `GET /v1/Reporting/Activity/CostBasis` | Cost basis data |
| P1 | `GET /v1/Portfolio/Transactions/Search` | Transaction history |
| P2 | `GET /v1/Portfolio/AumOverTime` | AUM trend chart |
| P2 | `GET /v1/Portfolio/BalanceSheet` | Balance sheet view |
| P3 | `GET /v1/Portfolio/GoalTracking` | Financial goals |
| P3 | `GET /v1/Portfolio/ModelTolerance` | Model drift alerts |
| P3 | `GET /v1/Risk/Profile` | Risk tolerance |
