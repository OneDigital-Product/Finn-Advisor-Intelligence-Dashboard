# Portfolio Section Redesign — Fix 1 + Fix 2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the portfolio section from a 15-section vertical scroll into a compact, interactive, tabbed experience with paginated holdings and view-switching charts.

**Architecture:** Wrap Phase A charts in a tabbed chart-switcher component. Paginate the holdings table at 25 rows. Collapse secondary sections (transactions, alt assets, news) behind expand/collapse toggles. Add interactivity to existing charts (tooltips, explanations, live badges). All changes are layout/UX only — zero API modifications.

**Tech Stack:** shadcn/ui Tabs (Radix), existing V2 design tokens, React state for pagination/view switching.

**Critical Safety Rule:** NEVER modify API routes, data hooks, schema files, or server code. Only modify styling, layout, and UI state within existing components.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `client/src/components/charts/chart-switcher.tsx` | CREATE | Tabbed wrapper for chart views |
| `client/src/components/charts/holdings-table.tsx` | CREATE | Paginated, grouped holdings table |
| `client/src/components/charts/risk-radar.tsx` | MODIFY | Add axis explanations |
| `client/src/components/charts/holdings-treemap.tsx` | MODIFY | Add live-data indicator |
| `client/src/components/charts/allocation-sunburst.tsx` | MODIFY | Add view-mode switcher (sunburst/bar/table) |
| `client/src/components/charts/risk-gauge.tsx` | MODIFY | Add score breakdown |
| `client/src/pages/client-detail/portfolio-section.tsx` | MODIFY | Replace flat layout with tabbed + collapsed sections |

---

## Task 1: Create ChartSwitcher — Tabbed Chart Container

**Files:**
- Create: `client/src/components/charts/chart-switcher.tsx`

**What it does:** A tabbed container that shows one chart view at a time. 4 tabs: Allocation, Holdings Map, Risk Profile, Concentration. Each tab renders the corresponding chart component.

**Step 1: Create the file**

```tsx
import { useState } from "react";
import { V2_CARD, V2_DARK_SCOPE } from "@/styles/v2-tokens";

type ChartTab = "allocation" | "holdings" | "risk" | "concentration";

interface ChartSwitcherProps {
  children: Record<ChartTab, React.ReactNode>;
}

const TAB_LABELS: { id: ChartTab; label: string }[] = [
  { id: "allocation", label: "Allocation" },
  { id: "holdings", label: "Holdings Map" },
  { id: "risk", label: "Risk Profile" },
  { id: "concentration", label: "Concentration" },
];

export function ChartSwitcher({ children }: ChartSwitcherProps) {
  const [active, setActive] = useState<ChartTab>("allocation");

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--color-border-subtle)",
          padding: "0 4px",
        }}
      >
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              padding: "10px 16px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              letterSpacing: ".03em",
              textTransform: "uppercase",
              color: active === tab.id
                ? "var(--color-text-primary)"
                : "var(--color-text-tertiary)",
              background: "transparent",
              border: "none",
              borderBottom: active === tab.id
                ? "2px solid hsl(210, 83%, 49%)"
                : "2px solid transparent",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active chart content */}
      <div style={{ padding: "16px 0 0" }}>
        {children[active]}
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `ls -la client/src/components/charts/chart-switcher.tsx`

---

## Task 2: Create Paginated Holdings Table

**Files:**
- Create: `client/src/components/charts/holdings-table.tsx`

**What it does:** Replaces the flat, unpaginated holdings table with a paginated version showing 25 rows per page, grouped by account, with a compact toolbar showing page controls and search.

This is a NEW component that receives the same props the current inline table uses. It does NOT make any API calls.

**Key features:**
- 25 rows per page with prev/next controls
- Search filters client-side (same as existing)
- Group-by-account toggle: when on, shows collapsible account groups
- Compact row design: ticker + name in one column, reduces total columns from 10 to 7
- Clickable ticker → triggers onAccountSelect
- Live-data badge (green dot) when Yahoo Finance quote exists for that ticker

**Step 1: Create the file**

The component should:
1. Accept props: `holdings`, `marketData`, `marketLoading`, `refetchMarket`, `onAccountSelect`, `accounts`
2. State: `page` (number), `search` (string), `groupByAccount` (boolean)
3. Filter holdings by search (ticker/name match)
4. Paginate: `visibleHoldings.slice(page * 25, (page + 1) * 25)`
5. Render a compact table with columns: Ticker/Name, Account, Shares, Price (Orion vs Yahoo), Value, Gain/Loss, Weight
6. Page controls: "Page 1 of N" with prev/next buttons
7. Wrap in V2_CARD + V2_DARK_SCOPE

**Step 2: Verify**

Run: `ls -la client/src/components/charts/holdings-table.tsx`

---

## Task 3: Add Axis Explanations to Risk Radar

**Files:**
- Modify: `client/src/components/charts/risk-radar.tsx`

**What to change:** Below the radar chart, add a compact breakdown showing each axis name, its score, and a one-line explanation of what drives that score.

Add after the ChartContainer, inside the V2_CARD:

```tsx
{/* Score breakdown */}
<div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
  {radarData.map((d) => (
    <div key={d.axis} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontFamily: "var(--font-data)", fontSize: 18, fontWeight: 700,
        color: d.value >= 70 ? "hsl(152, 69%, 40%)" : d.value >= 40 ? "hsl(41, 100%, 49%)" : "hsl(0, 72%, 51%)",
        width: 28, textAlign: "right",
      }}>
        {d.value}
      </span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)" }}>{d.axis}</div>
        <div style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>{d.explanation}</div>
      </div>
    </div>
  ))}
</div>
```

Also add an `explanation` field to each radar data point in the `useMemo`:
- Diversification: `Top 5 holdings = ${top5Weight.toFixed(0)}% of portfolio`
- Sector Spread: `${sectorCount} of 11 GICS sectors represented`
- Risk Balance: `HHI concentration index: ${(hhi * 100).toFixed(0)}%`
- Sharpe: `Risk-adjusted return ratio: ${sharpe.toFixed(2)}`
- Drawdown Resilience: `Max drawdown: ${dd.toFixed(1)}%`

---

## Task 4: Add Live-Data Badge to Holdings Treemap

**Files:**
- Modify: `client/src/components/charts/holdings-treemap.tsx`

**What to change:**
1. Add optional `isLiveData?: boolean` prop to `HoldingsTreemapProps`
2. In the header area, after the title, show a small live-data indicator:

```tsx
<div style={{ padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
  <div>
    <h3 style={V2_TITLE}>Top Holdings</h3>
    <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
      Area = market value · Color = sector
    </p>
  </div>
  {isLiveData && (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 9, fontWeight: 700, fontFamily: "var(--font-data)",
      color: "#2D6B47", background: "rgba(34,197,94,0.1)",
      padding: "2px 8px", borderRadius: "var(--radius-full)",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: "hsl(152, 69%, 40%)",
        boxShadow: "0 0 6px hsl(152, 69%, 40%)",
        animation: "breathe 2s infinite",
      }} />
      LIVE
    </span>
  )}
</div>
```

---

## Task 5: Add View-Mode Switcher to Sunburst

**Files:**
- Modify: `client/src/components/charts/allocation-sunburst.tsx`

**What to change:** Add a 3-mode toggle at the top of the card: Sunburst | Bar | Table. Each mode renders the same `allocationBreakdown` data in a different format.

1. Add state: `const [viewMode, setViewMode] = useState<"sunburst" | "bar" | "table">("sunburst");`
2. Add a small toggle bar in the header area (3 buttons, pill-style)
3. When "sunburst": render existing concentric pie chart
4. When "bar": render a horizontal bar chart of allocationBreakdown (simple Recharts BarChart)
5. When "table": render a compact table with columns: Name, Value, Pct, with color dot

This gives users 3 ways to read the same allocation data.

---

## Task 6: Add Score Breakdown to Risk Gauge

**Files:**
- Modify: `client/src/components/charts/risk-gauge.tsx`

**What to change:** Add an optional `breakdown` prop that shows what contributes to the score.

1. Add prop: `breakdown?: { label: string; value: number; description: string }[]`
2. Below the SVG gauge, render a compact list of breakdown items:

```tsx
{breakdown && breakdown.length > 0 && (
  <div style={{ padding: "0 20px 16px", display: "flex", flexWrap: "wrap", gap: 12 }}>
    {breakdown.map((item) => (
      <div key={item.label} style={{
        fontSize: 10, fontFamily: "var(--font-data)",
        color: "var(--color-text-secondary)",
      }}>
        <span style={{ fontWeight: 700, color: scoreColor(item.value) }}>{item.value}</span>
        {" "}{item.label}
      </div>
    ))}
  </div>
)}
```

---

## Task 7: Rewire Portfolio Section — Tabbed Charts + Paginated Holdings + Collapsed Sections

**Files:**
- Modify: `client/src/pages/client-detail/portfolio-section.tsx`

**This is the main integration task.** Replace the flat 15-section layout with:

### Section A: Existing Pie + Performance Grid (keep as-is, lines 123-209)

### Section B: Chart Switcher (replaces lines 211-238)

Replace the 5 separate chart blocks with:

```tsx
<ChartSwitcher>
  {{
    allocation: (
      <AllocationSunburst
        allocationBreakdown={pieData}
        sectorExposure={sectorExposure || []}
        topHoldingsByValue={topHoldingsByValue || []}
      />
    ),
    holdings: (
      <HoldingsTreemap topHoldingsByValue={topHoldingsByValue || []} isLiveData={true} />
    ),
    risk: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <RiskRadar
          topHoldingsByValue={topHoldingsByValue}
          sectorExposure={sectorExposure}
          riskDistribution={riskDistribution}
          portfolioPerformance={portfolioPerformance}
        />
        <RiskGauge
          score={compositeRiskScore}
          breakdown={riskBreakdown}
        />
      </div>
    ),
    concentration: (
      <SectorHeatmap holdings={holdings || []} />
    ),
  }}
</ChartSwitcher>
```

### Section C: Model Drift + Stress Test (keep as-is)

### Section D: Risk/Holdings/Sector 3-col grid (keep as-is)

### Section E: Performance & Cash Flow metrics (keep as-is)

### Section F: Holdings Table (replace inline table with new component)

Replace the existing 200-line inline table (lines 417-621) with:

```tsx
<HoldingsTable
  holdings={holdings}
  marketData={marketData}
  marketLoading={marketLoading}
  refetchMarket={refetchMarket}
  onAccountSelect={onAccountSelect}
  accounts={accounts}
/>
```

### Section G: Collapsed Secondary Sections

Wrap Transaction History, Alt Assets, and News in collapsible sections:

```tsx
<CollapsibleSection title="Transaction History" count={allTransactions.length} defaultOpen={false}>
  {/* existing transaction table JSX */}
</CollapsibleSection>

<CollapsibleSection title="Properties & Alternative Assets" count={(alternativeAssets||[]).length} defaultOpen={false}>
  {/* existing alt assets table JSX */}
</CollapsibleSection>

<CollapsibleSection title="Portfolio News" count={news?.length || 0} defaultOpen={false}>
  {/* existing news JSX */}
</CollapsibleSection>
```

Create a simple `CollapsibleSection` helper (inline or as a small component):

```tsx
function CollapsibleSection({ title, count, defaultOpen, children }: {
  title: string; count: number; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={V2_CARD}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <span style={V2_TITLE}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {count > 0 && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
          <ChevronDown style={{
            width: 16, height: 16, color: "var(--color-text-tertiary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }} />
        </div>
      </button>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}
```

### Extract compositeRiskScore and riskBreakdown

Move the inline IIFE that computes the gauge score into a `useMemo` at the top of the component:

```tsx
const { compositeRiskScore, riskBreakdown } = useMemo(() => {
  const top5 = (topHoldingsByValue || []).slice(0, 5).reduce((s, h) => s + (h.weight || 0), 0);
  const div = Math.max(0, Math.min(100, 100 - top5));
  const sec = Math.min(100, ((sectorExposure || []).length / 11) * 100);
  const sharpe = Math.min(100, Math.abs(portfolioPerformance?.sharpeRatio ?? 0) * 33);
  const dd = Math.max(0, Math.min(100, 100 + (portfolioPerformance?.maxDrawdown ?? 0)));
  const score = Math.round((div + sec + sharpe + dd) / 4);
  const breakdown = [
    { label: "Diversification", value: Math.round(div), description: "" },
    { label: "Sectors", value: Math.round(sec), description: "" },
    { label: "Sharpe", value: Math.round(sharpe), description: "" },
    { label: "Drawdown", value: Math.round(dd), description: "" },
  ];
  return { compositeRiskScore: score, riskBreakdown: breakdown };
}, [topHoldingsByValue, sectorExposure, portfolioPerformance]);
```

---

## Task 8: Visual Verification

**Step 1:** Start dev server, navigate to client detail → Portfolio tab

**Step 2:** Verify:
- [ ] Chart switcher shows 4 tabs, clicking switches between views
- [ ] Only one chart visible at a time (no stacking)
- [ ] Holdings table paginated at 25 rows with page controls
- [ ] Transaction History collapsed by default (click to expand)
- [ ] Alt Assets collapsed by default
- [ ] News collapsed by default
- [ ] Page is significantly shorter (target: ~2,500px vs ~6,000px before)
- [ ] Zero console errors
- [ ] Zero new network requests (all data from existing props)

**Step 3:** Check responsive at 768px width — chart switcher tabs should still be readable

---

## Dependencies

```
Task 1 (ChartSwitcher) → independent
Task 2 (HoldingsTable) → independent
Tasks 3-6 (chart enhancements) → independent of each other
Task 7 (integration) → depends on Tasks 1-6
Task 8 (verification) → depends on Task 7
```

Tasks 1-6 can run in parallel. Task 7 is the big integration. Task 8 is verification.
