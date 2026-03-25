# SF Data Wiring Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire all available live data into the SF user experience — performance charts, correct holding values, full event details, and compliance from cases.

**Architecture:** Four independent fixes to `server/routes/clients.ts` (backend) and two frontend components (`TodaySchedule.tsx`, `dashboard.tsx`). All fixes use data already being fetched or available via existing MuleSoft API functions — no new endpoints needed.

**Tech Stack:** Express routes (TypeScript), React components (TSX), MuleSoft/Orion/Salesforce APIs

---

### Task 1: Wire `postReportingScope(managed: 23)` into Client Detail

**Files:**
- Modify: `server/routes/clients.ts` — the `GET /api/clients/:id` SF branch (around line 414-425)

**What:** After the fuzzy match finds `bestMatch.id`, call `postReportingScope()` in parallel with accounts/assets to get performance, activity, allocation, portfolio detail, and tax data. Map the response into the `performance` array shape the frontend expects: `{ id, period, returnPct, benchmarkPct }`.

**Step 1: Add `postReportingScope` to imports**

At top of file, add to the existing MuleSoft import:
```typescript
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
  getClientAccounts as getOrionClientAccounts,
  getClientAssets as getOrionClientAssets,
  getHouseholdMembers as getLiveHouseholdMembers,
  postReportingScope,              // ← ADD THIS
} from "../integrations/mulesoft/api";
```

**Step 2: Add reporting scope call in parallel with accounts/assets**

Replace the existing `Promise.all` (around line 419) that fetches accounts + assets:

```typescript
if (bestMatch && bestMatch.id) {
  const [accts, assets, reportData] = await Promise.all([
    getOrionClientAccounts(bestMatch.id),
    getOrionClientAssets(bestMatch.id),
    postReportingScope({
      entity: "Account",
      entityIds: [Number(bestMatch.id)],
      asOfDate: new Date().toISOString().split("T")[0],
      managed: 23,  // Performance(1) + Activity(2) + Allocation(4) + Tax(16)
      calculations: [
        { $type: "performance" },
        { $type: "activity" },
        { $type: "allocation" },
        { $type: "tax" },
      ],
    }).catch((err) => {
      logger.warn({ err }, "[Clients] Orion reporting scope failed, continuing without performance data");
      return [];
    }),
  ]);
  orionAccounts = accts;
  orionAssets = assets;
  orionReportData = reportData;
}
```

**Step 3: Map report data → performance array**

After Step 3 block, before Step 4 (members), add mapping logic:

```typescript
// Map Orion reporting scope → performance periods
const performance = orionReportData
  .filter((r: any) => r.returnPct !== undefined || r.performance !== undefined)
  .map((r: any, i: number) => ({
    id: `perf-${i}`,
    period: r.period || r.timePeriod || r.label || ["YTD", "1Y", "3Y", "5Y", "10Y", "ITD"][i] || `P${i}`,
    returnPct: String(r.returnPct ?? r.performance ?? r.return ?? 0),
    benchmarkPct: String(r.benchmarkPct ?? r.benchmark ?? r.benchmarkReturn ?? 0),
  }));

// Extract activity data (net flows, contributions, withdrawals)
const activityData = orionReportData
  .filter((r: any) => r.netFlows !== undefined || r.contributions !== undefined)
  .map((r: any) => ({
    netFlows: r.netFlows || 0,
    contributions: r.contributions || 0,
    withdrawals: r.withdrawals || 0,
  }));

// Extract allocation data
const allocationData = orionReportData
  .filter((r: any) => r.assetClass !== undefined || r.allocation !== undefined)
  .map((r: any) => ({
    name: r.assetClass || r.category || r.sector || "Other",
    value: r.allocation || r.weight || r.marketValue || 0,
  }));

// Extract tax data
const taxData = orionReportData
  .filter((r: any) => r.costBasis !== undefined || r.realizedGain !== undefined)
  .map((r: any) => ({
    costBasis: r.costBasis || 0,
    realizedGainLoss: r.realizedGain || r.realizedGainLoss || 0,
    unrealizedGainLoss: r.unrealizedGain || r.unrealizedGainLoss || 0,
    taxLiability: r.taxLiability || r.estimatedTax || 0,
  }));
```

**Step 4: Include in response**

In the final `res.json()` call, replace `performance: []` with:

```typescript
performance,
activityData,
allocationData,
taxData,
```

**Step 5: Commit**

---

### Task 2: Fix Holdings $0 Market Value Field Mapping

**Files:**
- Modify: `server/routes/clients.ts` — the holdings mapping (around line 480-495)

**What:** The Orion asset response uses various field names for market value. Current code tries `asset.marketValue || asset.value || asset.currentValue` but misses nested structures and doesn't compute from quantity × price as fallback.

**Step 1: Update the holdings mapping**

Replace the existing holdings mapping block:

```typescript
const holdings = orionAssets.map((asset: any, i: number) => {
  // Orion assets use varying field names — exhaustive lookup
  const mv = asset.marketValue || asset.value || asset.currentValue
    || asset.market_value || asset.balance || asset.totalValue
    || asset.endingValue || asset.ending_value || 0;

  // Fallback: compute from quantity × price if market value is 0
  const quantity = asset.quantity || asset.shares || asset.units || 0;
  const price = asset.price || asset.unitPrice || asset.lastPrice
    || asset.currentPrice || asset.nav || 0;
  const computedMv = mv > 0 ? mv : (quantity * price);

  const cb = asset.costBasis || asset.originalCost || asset.cost_basis
    || asset.totalCost || asset.bookValue || 0;

  return {
    id: asset.id || `asset-${i}`,
    accountId: accounts[0]?.id || "",
    ticker: asset.ticker || asset.symbol || asset.cusip
      || asset.securityName?.substring(0, 6)?.toUpperCase() || "—",
    name: asset.name || asset.securityName || asset.description
      || asset.security || "Unknown",
    shares: quantity,
    marketValue: String(computedMv),
    costBasis: String(cb),
    unrealizedGainLoss: String(
      asset.unrealizedGainLoss || asset.gainLoss
      || asset.unrealized_gain_loss || (computedMv - cb) || 0
    ),
    weight: String(asset.weight || asset.percentage || asset.allocation || 0),
    sector: asset.sector || asset.assetClass || asset.category
      || asset.asset_class || "Other",
    isLive: true,
  };
});
```

**Step 2: Commit**

---

### Task 3: Pass Full SF Event Objects to TodaySchedule

**Files:**
- Modify: `server/routes/clients.ts` — stats endpoint (around line 248-276)
- Modify: `client/src/pages/dashboard.tsx` — pass events to TodaySchedule
- Modify: `client/src/components/dashboard/TodaySchedule.tsx` — render event cards

**What:** The stats endpoint currently passes only `upcomingEvents` (a count). Add `upcomingEventsList` with full event objects. Then update TodaySchedule to render actual event cards with subject, time, and location.

**Step 1: Add `upcomingEventsList` to stats response**

In the stats endpoint's SF response block, after `staleOpportunitiesList`, add:

```typescript
upcomingEventsList: (sfResult.upcomingEvents || []).slice(0, 10).map((e: any) => ({
  id: e.Id,
  subject: e.Subject || "Event",
  startDateTime: e.StartDateTime || e.ActivityDateTime,
  endDateTime: e.EndDateTime,
  location: e.Location || "",
  type: e.Type || e.EventSubtype || "Meeting",
  whoName: e.Who?.Name || "",
  whatName: e.What?.Name || "",
  isAllDay: e.IsAllDayEvent || false,
})),
```

**Step 2: Pass events list to TodaySchedule in dashboard.tsx**

Change the TodaySchedule invocation:

```tsx
<TodaySchedule
  liveEventCount={clientStats?.upcomingEvents}
  liveEvents={clientStats?.upcomingEventsList}
/>
```

**Step 3: Update TodaySchedule component**

Update the component signature and render SF events when no local meetings exist:

```tsx
export function TodaySchedule({
  liveEventCount,
  liveEvents,
}: {
  liveEventCount?: number;
  liveEvents?: any[];
} = {}) {
```

When `todaysMeetings.length === 0` but `liveEvents` has items, render event cards instead of the empty message.

**Step 4: Commit**

---

### Task 4: Map SF Cases → Compliance Items in Client Detail

**Files:**
- Modify: `server/routes/clients.ts` — client detail endpoint (around line 538-563)

**What:** SF open cases are already fetched in `sfHouseholdResult.openCases`. Map them to the compliance item shape the frontend expects: `{ id, type, description, status, dueDate }`.

**Step 1: Map cases to compliance items**

Before the final `res.json()`, add:

```typescript
const complianceItems = (sfHouseholdResult?.openCases || []).map((c: any) => ({
  id: c.Id || `case-${Math.random().toString(36).slice(2)}`,
  type: c.Type || c.Reason || "Case",
  description: `${c.Subject || "Open Case"} — ${c.Description || c.Status || ""}`.trim(),
  status: mapCaseStatus(c.Status, c.Priority),
  dueDate: c.CreatedDate || null,
  completedDate: c.ClosedDate || null,
  isLive: true,
}));
```

Where `mapCaseStatus` is a small helper:

```typescript
function mapCaseStatus(status?: string, priority?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "closed") return "current";
  if ((priority || "").toLowerCase() === "high") return "overdue";
  if (s === "new" || s === "working") return "pending";
  return "expiring_soon";
}
```

**Step 2: Replace `complianceItems: []` with `complianceItems` in the response**

**Step 3: Commit**

---

## Execution Order

Tasks 1-4 are independent — they can be implemented in parallel or any order. All modify the same file (`clients.ts`) but different sections. Task 3 also touches two frontend files.

Recommended order: 2 → 4 → 1 → 3 (simplest first, frontend changes last)
