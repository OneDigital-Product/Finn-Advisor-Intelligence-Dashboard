# API Field Map — MuleSoft WAD EAPI → UI

> Master reference: every API field, where it's transformed, and where it appears in the UI.
> Generated: 2026-03-19

---

## 1. GET /api/v1/portfolio/clients/value

**Purpose:** All Orion client portfolio values (~35K records). Used for:
- Fuzzy name matching SF households → Orion AUM
- Stats/dashboard total AUM computation
- Client list AUM enrichment

| # | Orion Raw Field | Type | Example | Mapped To (Server) | Used In (Component) | Currently Shown? | Notes |
|---|----------------|------|---------|-------------------|---------------------|-----------------|-------|
| 1 | `id` / `clientId` / `householdId` | string/number | `12345` | `PortfolioAccount.id` | Fuzzy match key | NO (internal) | Used for accounts/assets fetch |
| 2 | `name` / `clientName` / `householdName` | string | `"Smith John"` | `PortfolioAccount.name` | Fuzzy match against SF Name | YES (indirect) | Name matching drives AUM assignment |
| 3 | `totalValue` / `value` / `aum` / `marketValue` | number | `1250000` | `PortfolioAccount.totalValue` | `clients.tsx` AUM column, `clients/stats` totalAum | YES | Primary AUM source |
| 4 | `accountNumber` / `clientNumber` | string | `"ACC-001"` | `PortfolioAccount.accountNumber` | Not displayed at list level | NO | Only shown in detail |
| 5 | `custodian` | string | `"Schwab"` | `PortfolioAccount.custodian` | Not displayed at list level | NO | Only shown in detail |
| 6 | `accountType` / `type` / `registrationType` / `accountDescription` | string | `"IRA"` | `PortfolioAccount.accountType` | Not displayed at list level | NO | Default: "Investment Account" |
| 7 | `status` | string | `"active"` | `PortfolioAccount.status` | Not displayed at list level | NO | Default: "active" |
| 8 | `currency` / `baseCurrency` | string | `"USD"` | `PortfolioAccount.baseCurrency` | Not displayed anywhere | NO | Always USD |
| 9 | `lastUpdated` / `asOfDate` | string | `"2026-03-18"` | `PortfolioAccount.lastUpdated` | Not displayed anywhere | NO | Could show freshness indicator |

---

## 2. GET /api/v1/portfolio/clients/{id}/accounts/value

**Purpose:** Accounts under a specific Orion client. Displayed in Overview → Accounts card and Asset Map.

| # | Orion Raw Field | Type | Example | Server Mapping (`clients.ts` ~L950) | UI Component | Shown? | Notes |
|---|----------------|------|---------|--------------------------------------|-------------|--------|-------|
| 1 | `id` | string | `"67890"` | `accounts[].id` | `overview-section` account rows, `asset-map` nodes | YES | Click navigates to account detail |
| 2 | `number` | string | `"ACC-12345"` | `accounts[].accountNumber` | `overview-section` subtitle | YES | Shown in account row subtitle |
| 3 | `name` / `registrationType` | string | `"Traditional IRA"` | `accounts[].accountType` | `overview-section` title, `portfolio-section` badge | YES | Primary label |
| 4 | `custodian` | string | `"Schwab"` | `accounts[].custodian` | `overview-section` subtitle, `asset-map` sublabel | YES | |
| 5 | `value` | number | `500000` | `accounts[].balance` (as String), `accounts[].managedValue` | `overview-section` formatCurrency, `asset-map` value | YES | Main display value |
| 6 | `managementStyle` | string | `"Discretionary"` | `accounts[].managementStyle` | `overview-section` account subtitle, `client-detail` account dialog | YES | ✅ Wired |
| 7 | `model` / `portfolio` | string | `"Growth 80/20"` | `accounts[].model` | `overview-section` subtitle, `asset-map` detail | YES | When present |
| 8 | `taxStatus` (derived) | string | `"tax-deferred"` | `accounts[].taxStatus` | `overview-section` badge, `asset-map` detail | YES | Derived from name patterns |
| 9 | `isActive` | boolean | `true` | `accounts[].status` | Not displayed | NO | Filtered out if inactive |
| 10 | `nonManagedValue` | number | `25000` | `accounts[].nonManagedValue` | `overview-section` Managed vs Held-Away card, `client-detail` account dialog | YES | ✅ Wired |
| 11 | `fundFamily` | string | `"Vanguard"` | `accounts[].fundFamily` | Not displayed | NO | Could show in account detail |
| 12 | `startDate` | string | `"2020-01-15"` | `accounts[].startDate` | Not displayed | NO | Could show account tenure |
| 13 | `registrationId` | string | `"REG-001"` | `accounts[].registrationId` | Not displayed | NO | Internal reference |

---

## 3. GET /api/v1/portfolio/clients/{id}/assets

**Purpose:** Asset-level holdings for a client. Displayed in Portfolio → Holdings table and drives pie chart allocation.

**Orion provides ~55 fields per asset; `mapOrionAsset()` normalizes to 15.**

| # | Orion Raw Field | Type | Example | Server Mapping (`api.ts` mapOrionAsset + `clients.ts` ~L995) | UI Component | Shown? | Notes |
|---|----------------|------|---------|--------------------------------------------------------------|-------------|--------|-------|
| 1 | `id` / `assetId` | string | `"A-100"` | `holdings[].id` | `portfolio-section` table row key | YES (key) | |
| 2 | `ticker` / `symbol` | string | `"AAPL"` | `holdings[].ticker` | `portfolio-section` Ticker column | YES | Bold, left column |
| 3 | `name` / `description` | string | `"Apple Inc"` | `holdings[].name` | `portfolio-section` Name column | YES | |
| 4 | `currentValue` / `marketValue` / `value` | number | `125000` | `holdings[].marketValue` (String) | `portfolio-section` Book Value column | YES | Also drives weight calc |
| 5 | `currentPrice` / `price` | number | `178.50` | Passed through in mapOrionAsset but **NOT mapped to holdings** | Not displayed from Orion | NO | Live price from Yahoo Finance instead |
| 6 | `currentShares` / `shares` / `quantity` | number | `700` | `holdings[].shares` | `portfolio-section` Shares column | YES | |
| 7 | `costBasis` / `cost` | number | `95000` | `holdings[].costBasis` (String) | `portfolio-section` (used for G/L calc) | YES (indirect) | G/L = marketValue - costBasis |
| 8 | `assetClass` / `sector` | string | `"US Large Cap"` | `holdings[].sector` | `use-client-data` pie chart grouping | YES | Drives allocation chart |
| 9 | `riskCategory` | string | `"Growth"` | `holdings[].riskCategory` | `portfolio-section` Risk Distribution card (via `riskDistribution` computed) | YES | ✅ Wired via computed aggregation |
| 10 | `productType` / `productCategory` | string | `"Equity ETF"` | `holdings[].productType` | `portfolio-section` Sector Exposure card (via `sectorExposure` computed) | YES | ✅ Wired via computed aggregation |
| 11 | `accountId` | string | `"67890"` | `holdings[].accountId` | `portfolio-section` Account badge | YES | Links holding to account |
| 12 | `accountType` / `registrationType` | string | `"IRA"` | Passed through in mapOrionAsset | Not used in holdings mapping | NO | Account-level, not asset-level |
| 13 | `custodian` | string | `"Schwab"` | `holdings[].custodian` | Not displayed in holdings table | NO | Redundant with account |
| 14 | `householdName` | string | `"Smith"` | Passed through in mapOrionAsset | Not used | NO | Internal |
| 15 | `isManaged` | boolean | `true` | `holdings[].isManaged` | Not displayed | NO | Could flag managed vs held-away |
| 16 | `isCustodialCash` | boolean | `false` | `holdings[].isCustodialCash` | Not displayed | NO | Could highlight cash positions |
| 17 | `managementStyle` | string | `"Active"` | Passed through in mapOrionAsset | Not used in holdings | NO | |
| 18 | (computed) `weight` | string | `"12.50"` | `holdings[].weight` | `portfolio-section` Weight column | YES | Calculated server-side: currentValue / totalAccountValue × 100 |
| 19 | (computed) `unrealizedGainLoss` | string | `"30000"` | `holdings[].unrealizedGainLoss` | `portfolio-section` G/L column | YES | Calculated: marketValue - costBasis |

---

## 4. GET /api/v1/household

**Purpose:** Salesforce household accounts for an advisor. Returns paginated household list + global activity data.

### 4a. `advisor` Object

| # | SF Field | Type | Example | Server Mapping | UI | Shown? |
|---|---------|------|---------|---------------|-----|--------|
| 1 | `advisor.id` | string | `"005xxx"` | Stored in cache, passed as `advisor` | Dashboard advisor name | YES |
| 2 | `advisor.name` | string | `"Michael Gouldin"` | `res.json({ advisor })` | Dashboard greeting | YES |
| 3 | `advisor.email` | string | `"m***@onedigital.com.uat"` | Not displayed (masked) | N/A | NO | Masked by SF |
| 4 | `advisor.username` | string | `"m***@onedigital.com.uat"` | Used for API calls | N/A | NO | Auth parameter |
| 5 | `advisor.division` | string | `"Wealth Management"` | `stats.advisorDivision` | Dashboard subtitle | YES |

### 4b. `householdAccounts[]` — Main Client List Records

| # | SF Field | Type | Example | Server Mapping (`clients.ts` ~L204) | UI Component | Shown? |
|---|---------|------|---------|--------------------------------------|-------------|--------|
| 1 | `Id` | string | `"001xxx"` | `client.id` | `clients.tsx` navigation, detail URL | YES |
| 2 | `Name` | string | `"Smith John"` | `client.firstName`, `client.lastName` (split on space) | `clients.tsx` name, `overview` header | YES |
| 3 | `OwnerId` | string | `"005xxx"` | Not mapped | N/A | NO |
| 4 | `FinServ__Status__c` | string | `"Active"` | `client.status` (via mapSfStatus) | `clients.tsx` status pill | YES |
| 5 | `FinServ__TotalFinancialAccounts__c` | number | `750000` | `sfAum` (base AUM before Orion enrichment) | `clients.tsx` AUM column | YES |
| 6 | `FinServ__TotalNonfinancialAssets__c` | number | `200000` | Added to `sfAum` | Included in total AUM | YES (indirect) |
| 7 | `PersonEmail` | string | `"j***@email.com"` | `client.email` | `clients.tsx` expanded panel | YES | Often masked |
| 8 | `Phone` | string | `"555-***-1234"` | `client.phone` | `clients.tsx` expanded panel | YES | Often masked |
| 9 | `PersonMobilePhone` | string | | Fallback for `client.phone` | Same as above | YES (fallback) |
| 10 | `PersonTitle` | string | `"CEO"` | `client.occupation` | `clients.tsx` expanded panel | YES |
| 11 | `Industry` | string | `"Technology"` | Fallback for `client.occupation` | Same as above | YES (fallback) |
| 12 | `FinServ__ClientCategory__c` | string | `"A"` | `client.segment` | `clients.tsx` tier label | YES |
| 13 | `CreatedDate` | string | ISO date | `client.createdDate` | Not displayed | NO | Could show client tenure |
| 14 | `Type` / `RecordType.Name` | string | `"Business"` | `client.entityType` (business detection) | `clients.tsx` "Business" badge | YES |
| 15 | `FinServ__PrimaryContact__r.Email` | string | | Fallback for email | Same chain | YES (fallback) |
| 16 | `FinServ__PrimaryContact__r.Phone` | string | | Fallback for phone | Same chain | YES (fallback) |
| 17 | `FinServ__Occupation__c` | string | | Fallback for occupation | Same chain | YES (fallback) |
| 18 | `FinServ__InvestmentObjectives__c` | string | `"Growth"` | `client.riskTolerance` | `overview-section` (not shown on list) | YES (detail only) |
| 19 | `Risk_Tolerance__c` | string | | Fallback for riskTolerance | Same | YES (fallback) |
| 20 | `Email__c` | string | | Fallback for email | Same chain | YES (fallback) |

### 4c. `householdDetails[]` — Enrichment per Household

| # | Field Path | Type | Server Mapping | UI | Shown? |
|---|-----------|------|---------------|-----|--------|
| 1 | `householdId` | string | Key for detailMap lookup | Internal | NO |
| 2 | `primaryContact.Email` | string | Fallback email | `clients.tsx` email | YES (fallback) |
| 3 | `primaryContact.Phone` | string | Fallback phone | `clients.tsx` phone | YES (fallback) |
| 4 | `financialAccounts[]` | array | `client.accountCount` | Not displayed at list level | NO |
| 5 | `financialGoals[]` | array | `client.financialGoals` (count at list, full at detail) | Detail → goals section | YES (detail) |
| 6 | `documents[]` | array | `client.documents` (count at list, mapped at detail) | Detail → documents section | YES (detail) |
| 7 | `topHoldings[]` | array | `client.topHoldings`, mapped at detail | Detail → sfTopHoldings | YES (detail) |
| 8 | `revenues[]` | array | `client.revenues`, mapped at detail | Detail → revenues | YES (detail) |
| 9 | `recentActivity[]` | array | `client.recentActivity`, mapped at detail | Detail → activities | YES (detail) |
| 10 | `complianceTasks[]` | array | Mapped at detail | Detail → compliance items | YES (detail) |
| 11 | `complianceCases[]` | array | Mapped at detail | Detail → compliance items | YES (detail) |
| 12 | `occupation` | string | Fallback for occupation | `clients.tsx` occupation | YES (fallback) |
| 13 | `riskTolerance` | string | Fallback for riskTolerance | Detail risk tolerance | YES (fallback) |

### 4d. Global Activity Arrays (advisor-wide, not per household)

| # | Array | Field Path | Server Mapping | UI | Shown? |
|---|-------|-----------|---------------|-----|--------|
| 1 | `openTasks[]` | `t.Id, t.Subject, t.Status, t.Priority, t.CreatedDate, t.What.Name, t.WhatId, t.AccountId` | Stats → `openTasksList`, Detail → `tasks` (filtered to household) | Dashboard tasks widget, Detail tasks tab | YES |
| 2 | `upcomingEvents[]` | `e.Id, e.Subject, e.StartDateTime, e.EndDateTime, e.Location, e.Type, e.Who.Name, e.What.Name` | Stats → `upcomingEventsList` | Dashboard schedule | YES |
| 3 | `openCases[]` | `c.Id, c.Subject, c.Status, c.Priority, c.Account.Name, c.AccountId, c.CreatedDate, c.ClosedDate` | Stats → `openCasesList`, Detail → `complianceItems` (filtered) | Dashboard cases, Detail compliance | YES |
| 4 | `staleOpportunities[]` | `o.Id, o.Name, o.StageName, o.Account.Name, o.LastActivityDate` | Stats → `staleOpportunitiesList` | Dashboard stale opps | YES |

---

## 5. GET /api/v1/household/members

**Purpose:** Members of a specific household. Displayed in Overview → Household card.

| # | SF Field | Type | Example | Server Mapping (`clients.ts` ~L1093) | UI Component | Shown? |
|---|---------|------|---------|---------------------------------------|-------------|--------|
| 1 | `Id` | string | `"001xxx"` | `householdMembers[].id`, `.clientId` | `overview-section` Link href | YES |
| 2 | `FirstName` | string | `"Jane"` | `householdMembers[].firstName` | `overview-section` name + initials | YES |
| 3 | `LastName` | string | `"Smith"` | `householdMembers[].lastName` | `overview-section` name + initials | YES |
| 4 | `PersonEmail` | string | `"j***@email.com"` | `householdMembers[].email` | Not displayed in card | NO | Masked, but could show |
| 5 | `Phone` | string | `"555-***"` | `householdMembers[].phone` | Not displayed in card | NO | Masked |
| 6 | `PersonMailingCity` | string | `"Denver"` | `householdMembers[].city` | Not displayed | NO | |
| 7 | `PersonMailingState` | string | `"CO"` | `householdMembers[].state` | Not displayed | NO | |
| 8 | `PersonBirthdate` | string | `"1965-03-15"` | `householdMembers[].birthdate` | Not displayed | NO | Could show age |
| 9 | `FinServ__Role__c` | string | `"Primary"` | `householdMembers[].relationship` | `overview-section` relationship label | YES | "household_member" → "Member" |
| 10 | (response meta) `householdId` | string | `"001xxx"` | `householdMembers[].householdId` | Internal | NO |
| 11 | (response meta) `householdName` | string | `"Smith"` | Not mapped | N/A | NO |

---

## 6. POST /api/v1/reporting/scope

**Status: RETURNS 404** — Orion Reporting/Scope endpoint is not yet provisioned through MuleSoft.

All 4 scope requests (performance, allocation, portfolio detail, tax detail) fail with 404. The `.catch()` handlers return `[]`, resulting in:

| Data Type | Current State | Impact |
|-----------|--------------|--------|
| Performance (MTD/YTD TWR) | Empty array `[]` | Overview chart shows "Performance data pending" message |
| Allocation (by Asset Class) | Empty array `[]` | `allocationData` returned but **not consumed by frontend** (pie chart uses holdings.sector instead) |
| Portfolio Detail (Ending MV) | Empty array `[]` | `activityData` returned but **not consumed by frontend** |
| Tax Detail (cost basis, gains) | Empty array `[]` | `taxData` returned but **not consumed by frontend** |

**When endpoint becomes available**, the data shape is:

| # | Expected Field | Type | Server Mapping | UI Component | Currently Shown? |
|---|---------------|------|---------------|-------------|-----------------|
| 1 | `returnPct` / `performance` / `return` | number | `performance[].returnPct` | `overview-section` bar chart, `portfolio-section` summary | NO (404) |
| 2 | `benchmarkPct` / `benchmark` / `benchmarkReturn` | number | `performance[].benchmarkPct` | `overview-section` bar chart | NO (404) |
| 3 | `period` / `timePeriod` / `label` | string | `performance[].period` | Chart x-axis labels | NO (404) |
| 4 | `netFlows` | number | `activityData[].netFlows` | Not wired to UI | NO |
| 5 | `contributions` | number | `activityData[].contributions` | Not wired to UI | NO |
| 6 | `withdrawals` | number | `activityData[].withdrawals` | Not wired to UI | NO |
| 7 | `assetClass` / `allocation` | string/number | `allocationData[].name`, `.value` | Not wired to UI (frontend uses holdings) | NO |
| 8 | `targetPct` / `targetAllocation` | number | `allocationData[].targetPct` | Not wired to UI | NO |
| 9 | `driftPct` / `drift` | number | `allocationData[].driftPct` | Not wired to UI | NO |
| 10 | `costBasis` | number | `taxData[].costBasis` | Not wired to UI | NO |
| 11 | `realizedGain` / `realizedGainLoss` | number | `taxData[].realizedGainLoss` | Not wired to UI | NO |
| 12 | `unrealizedGain` / `unrealizedGainLoss` | number | `taxData[].unrealizedGainLoss` | Not wired to UI | NO |
| 13 | `taxLiability` / `estimatedTax` | number | `taxData[].taxLiability` | Not wired to UI | NO |

---

## Computed Fields — Server-Side Aggregations

The following computed fields are calculated from raw API data and returned in the `/api/clients/:id` detail response:

### Currently Computed

| # | Field | Source | Calculation | Location | UI |
|---|-------|--------|------------|----------|-----|
| 1 | `totalAum` | accounts[].balance | `sum(parseFloat(balance))` | `clients.ts` ~L1077 | Header AUM, sparkline |
| 2 | `healthScore` | accounts, tasks, compliance | 50 (has accounts) + 20 (multiple) + 30 (recent activity) | `clients.ts` ~L1252 | Score badge |
| 3 | `holdings[].weight` | holdings.marketValue / totalAccountValue | `(mv / total) * 100` | `clients.ts` ~L1004 | Portfolio weight column |
| 4 | `holdings[].unrealizedGainLoss` | marketValue - costBasis | `cb > 0 ? mv - cb : 0` | `clients.ts` ~L1001 | Portfolio G/L column |
| 5 | `pieData` (frontend) | holdings[].sector + marketValue | `reduce by sector → {name, value}[]` | `use-client-data.ts` ~L190 | Portfolio pie chart |

### Newly Added Computed Fields (Server → Frontend Wired)

| # | Field | Source | Calculation | Server | UI Component | Shown? |
|---|-------|--------|------------|--------|-------------|--------|
| 6 | `allocationBreakdown` | holdings[].sector | Group by assetClass, sum, pct | `clients.ts` ~L1266 | `use-client-data.ts` → `pieData` (overrides frontend calc) | YES |
| 7 | `riskDistribution` | holdings[].riskCategory | Group + count + sum + pct | `clients.ts` ~L1278 | `portfolio-section.tsx` Risk Distribution card | YES |
| 8 | `custodianBreakdown` | accounts[].custodian | Group + count + value | `clients.ts` ~L1293 | `overview-section.tsx` By Custodian card | YES |
| 9 | `accountTypeDistribution` | accounts[].accountType | Group + count + value | `clients.ts` ~L1308 | `overview-section.tsx` By Account Type card | YES |
| 10 | `topHoldingsByValue` | holdings desc by marketValue | Top 10: ticker, name, value, weight, sector | `clients.ts` ~L1323 | `portfolio-section.tsx` Top Holdings card | YES |
| 11 | `sectorExposure` | holdings[].productType | Group + count + sum + pct | `clients.ts` ~L1335 | `portfolio-section.tsx` Sector Exposure card | YES |
| 12 | `managedVsHeldAway` | accounts managed/nonManaged | managed.count/value, heldAway.count/value | `clients.ts` ~L1350 | `overview-section.tsx` Managed vs Held-Away card | YES |

### Newly Wired "Should Be Shown" Fields

| # | Field | Source | UI Component | Change |
|---|-------|--------|-------------|--------|
| 13 | `managementStyle` | accounts[].managementStyle | `overview-section.tsx` account subtitle, `client-detail.tsx` account dialog | Now displayed in account rows and detail modal |
| 14 | `managedValue` / `nonManagedValue` | accounts[] | `client-detail.tsx` account dialog | Shown as "Managed / Held-Away" in account detail |
| 15 | `taxStatus` | accounts[] | `client-detail.tsx` account dialog | Now shown in account detail modal |

---

## Data Flow Summary

```
Salesforce ──→ MuleSoft ──→ /api/v1/household ──→ clients.ts ──→ Client List & Detail
                              └─ householdAccounts[]            ├─ name, email, phone, status
                              └─ householdDetails[]             ├─ goals, docs, compliance
                              └─ openTasks/Cases/Events         └─ tasks, compliance, activities

Orion ──────→ MuleSoft ──→ /api/v1/portfolio/clients/value ──→ clients.ts ──→ AUM enrichment
                         → /api/v1/portfolio/clients/{id}/accounts/value ──→ Accounts card
                         → /api/v1/portfolio/clients/{id}/assets ──→ Holdings table + Pie chart
                         → /api/v1/reporting/scope (404) ──→ Performance (blocked)

Yahoo Finance ──→ /api/clients/:id/market-data ──→ Live prices, news
```
