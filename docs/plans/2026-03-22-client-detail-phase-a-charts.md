# Client Detail Page — Phase A Chart Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 new data visualizations to the client detail page using existing API data — no new endpoints required.

**Architecture:** Each chart is a self-contained component in `client/src/components/charts/`. They receive typed props from existing portfolio/goals data and use the established `ChartContainer` + `ChartConfig` pattern from `components/ui/chart.tsx`. All charts respect the V2 dark scope pattern (`v2-dark-scope` class) and use `COLORS_THEMED` from `shared.tsx`.

**Tech Stack:** Recharts 2.15 (Sunburst, RadarChart, Treemap built-in), custom SVG (Heatmap, Risk Gauge), ChartContainer wrapper, V2 design tokens.

**Critical Safety Rule:** NEVER modify API routes, data hooks, schema files, or server code. Only add new chart components and wire them into existing section files via existing props.

---

## File Map

| New File | Chart Type | Recharts? |
|----------|-----------|-----------|
| `client/src/components/charts/allocation-sunburst.tsx` | Sunburst | Yes (nested Pie) |
| `client/src/components/charts/risk-radar.tsx` | Radar | Yes (RadarChart) |
| `client/src/components/charts/sector-heatmap.tsx` | Heatmap | No (custom SVG) |
| `client/src/components/charts/holdings-treemap.tsx` | Treemap | Yes (Treemap) |
| `client/src/components/charts/risk-gauge.tsx` | Gauge | No (custom SVG) |
| `client/src/components/charts/goals-pipeline.tsx` | Pipeline | Yes (horizontal Bar) |

| Modified File | Change |
|---------------|--------|
| `client/src/pages/client-detail/portfolio-section.tsx` | Import + render Sunburst, Treemap, Heatmap |
| `client/src/pages/client-detail/overview-section.tsx` | Import + render Risk Radar, Risk Gauge |
| `client/src/pages/client-detail/goals-section.tsx` | Import + render Goals Pipeline |

---

## Shared Conventions

All chart components must follow these patterns:

```tsx
// 1. Import chart infrastructure
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

// 2. Memoize chart config (Recharts re-renders on reference change)
const chartConfig = useMemo<ChartConfig>(() => ({ ... }), [deps]);

// 3. Use COLORS_THEMED for series colors (imported from shared.tsx)
import { COLORS_THEMED } from "@/pages/client-detail/shared";

// 4. Wrap in V2_CARD styled container with v2-dark-scope class
<div style={V2_CARD} className={V2_DARK_SCOPE}>
  <h3 style={V2_TITLE}>Chart Title</h3>
  <ChartContainer config={chartConfig} className="h-[280px] w-full">
    ...
  </ChartContainer>
</div>

// 5. Format currency values consistently
const fmtCurrency = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K`
  : `$${v.toFixed(0)}`;

// 6. Format percentages consistently
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
```

---

## Task 1: Create Allocation Sunburst Chart

**Files:**
- Create: `client/src/components/charts/allocation-sunburst.tsx`

**Data source:** `allocationBreakdown` (asset class level) + `sectorExposure` (sector level) + `topHoldingsByValue` (holding level) — all from portfolio API, passed as props.

**Design:** Concentric donut rings using nested `<Pie>` components inside a single `<PieChart>`:
- Inner ring: Asset class allocation (Equity, Fixed Income, Alternatives, Cash)
- Middle ring: Sector breakdown within each asset class
- Outer ring: Top holdings within each sector

Since holdings already have `sector` and the allocation breakdown has asset class names, we can build the hierarchy by:
1. Group holdings by asset class (map sector → asset class using a lookup)
2. Group within each asset class by sector
3. Individual holdings as leaves

**Step 1: Create the component file**

```tsx
import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";
import { COLORS_THEMED } from "@/pages/client-detail/shared";

interface SunburstProps {
  allocationBreakdown: { name: string; value: number; pct: number }[];
  sectorExposure: { name: string; count: number; value: number; pct: number }[];
  topHoldingsByValue: {
    ticker: string;
    name: string;
    marketValue: number;
    weight: number;
    sector: string;
  }[];
}

// Asset class colors — stable assignment
const CLASS_COLORS = [
  "hsl(210, 83%, 49%)",  // Equity — blue
  "hsl(174, 95%, 34%)",  // Fixed Income — teal
  "hsl(265, 94%, 58%)",  // Alternatives — purple
  "hsl(41, 100%, 49%)",  // Cash — gold
  "hsl(0, 0%, 55%)",     // Other — gray
];

const fmtCurrency = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}K`
      : `$${v.toFixed(0)}`;

export function AllocationSunburst({
  allocationBreakdown,
  sectorExposure,
  topHoldingsByValue,
}: SunburstProps) {
  // Build concentric ring data
  const { innerRing, middleRing, outerRing, chartConfig } = useMemo(() => {
    // Inner ring = asset classes from allocationBreakdown
    const inner = allocationBreakdown.map((a, i) => ({
      name: a.name,
      value: a.value,
      pct: a.pct,
      fill: CLASS_COLORS[i % CLASS_COLORS.length],
    }));

    // Middle ring = sectors, colored as lighter variant of parent class
    const middle = sectorExposure.map((s, i) => ({
      name: s.name,
      value: s.value,
      pct: s.pct,
      fill: COLORS_THEMED[i % COLORS_THEMED.length].dark,
    }));

    // Outer ring = top holdings
    const outer = topHoldingsByValue.slice(0, 12).map((h, i) => ({
      name: h.ticker,
      value: h.marketValue,
      pct: h.weight,
      fill: COLORS_THEMED[i % COLORS_THEMED.length].dark,
    }));

    // Build chart config for tooltip
    const config: ChartConfig = {};
    inner.forEach((d) => {
      config[d.name] = { label: d.name, color: d.fill };
    });

    return { innerRing: inner, middleRing: middle, outerRing: outer, chartConfig: config };
  }, [allocationBreakdown, sectorExposure, topHoldingsByValue]);

  if (!allocationBreakdown.length) return null;

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      <div style={{ padding: "16px 20px 0" }}>
        <h3 style={V2_TITLE}>Asset Allocation</h3>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
          Class → Sector → Holdings
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value: number, name: string) =>
                  `${name}: ${fmtCurrency(value as number)}`
                }
              />
            }
          />
          {/* Inner ring — asset classes */}
          <Pie
            data={innerRing}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={55}
            dataKey="value"
            stroke="var(--color-surface-raised)"
            strokeWidth={2}
          >
            {innerRing.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
          {/* Middle ring — sectors */}
          <Pie
            data={middleRing}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            dataKey="value"
            stroke="var(--color-surface-raised)"
            strokeWidth={1}
          >
            {middleRing.map((d, i) => (
              <Cell key={i} fill={d.fill} opacity={0.85} />
            ))}
          </Pie>
          {/* Outer ring — top holdings */}
          <Pie
            data={outerRing}
            cx="50%"
            cy="50%"
            innerRadius={95}
            outerRadius={120}
            dataKey="value"
            stroke="var(--color-surface-raised)"
            strokeWidth={1}
          >
            {outerRing.map((d, i) => (
              <Cell key={i} fill={d.fill} opacity={0.7} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      {/* Legend */}
      <div style={{ padding: "0 20px 16px", display: "flex", flexWrap: "wrap", gap: 12 }}>
        {innerRing.map((d) => (
          <span
            key={d.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontFamily: "var(--font-data)",
              color: "var(--color-text-secondary)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: d.fill,
                flexShrink: 0,
              }}
            />
            {d.name} ({d.pct.toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify the file was created**

Run: `ls -la client/src/components/charts/allocation-sunburst.tsx`

---

## Task 2: Create Risk Radar Chart

**Files:**
- Create: `client/src/components/charts/risk-radar.tsx`

**Data source:** Derived from portfolio props — we compute 5 risk axes from existing data:
1. **Diversification** — inverse of top-5 holdings concentration
2. **Sector Spread** — number of distinct sectors (normalized)
3. **Risk Balance** — distribution across risk categories
4. **Performance** — Sharpe ratio (normalized 0-100)
5. **Drawdown Resilience** — inverse of max drawdown (normalized)

**Step 1: Create the component file**

```tsx
import { useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

interface RiskRadarProps {
  topHoldingsByValue?: {
    ticker: string;
    marketValue: number;
    weight: number;
  }[];
  sectorExposure?: { name: string; pct: number }[];
  riskDistribution?: { name: string; pct: number }[];
  portfolioPerformance?: {
    sharpeRatio?: number | null;
    maxDrawdown?: number | null;
    alpha?: number | null;
  };
}

// Clamp helper
const clamp = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));

export function RiskRadar({
  topHoldingsByValue = [],
  sectorExposure = [],
  riskDistribution = [],
  portfolioPerformance,
}: RiskRadarProps) {
  const radarData = useMemo(() => {
    // 1. Diversification: 100 - top5 concentration
    const top5Weight = topHoldingsByValue
      .slice(0, 5)
      .reduce((sum, h) => sum + (h.weight || 0), 0);
    const diversification = clamp(100 - top5Weight);

    // 2. Sector spread: (sectors / 11) * 100 (GICS has 11 sectors)
    const sectorCount = sectorExposure.length;
    const sectorSpread = clamp((sectorCount / 11) * 100);

    // 3. Risk balance: inverse HHI of risk categories
    const riskPcts = riskDistribution.map((r) => r.pct / 100);
    const hhi = riskPcts.reduce((sum, p) => sum + p * p, 0);
    const riskBalance = clamp((1 - hhi) * 100);

    // 4. Sharpe score: sharpe * 33 (sharpe of 3 = 100)
    const sharpe = portfolioPerformance?.sharpeRatio ?? 0;
    const sharpeScore = clamp(Math.abs(sharpe) * 33);

    // 5. Drawdown resilience: 100 + maxDrawdown (drawdown is negative)
    const dd = portfolioPerformance?.maxDrawdown ?? 0;
    const drawdownResilience = clamp(100 + dd);

    return [
      { axis: "Diversification", value: Math.round(diversification), fullMark: 100 },
      { axis: "Sector Spread", value: Math.round(sectorSpread), fullMark: 100 },
      { axis: "Risk Balance", value: Math.round(riskBalance), fullMark: 100 },
      { axis: "Sharpe", value: Math.round(sharpeScore), fullMark: 100 },
      { axis: "Drawdown Res.", value: Math.round(drawdownResilience), fullMark: 100 },
    ];
  }, [topHoldingsByValue, sectorExposure, riskDistribution, portfolioPerformance]);

  const chartConfig: ChartConfig = useMemo(
    () => ({
      risk: { label: "Risk Profile", color: "hsl(210, 83%, 49%)" },
    }),
    []
  );

  // Compute composite score
  const compositeScore = Math.round(
    radarData.reduce((sum, d) => sum + d.value, 0) / radarData.length
  );

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      <div
        style={{
          padding: "16px 20px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h3 style={V2_TITLE}>Risk Profile</h3>
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-text-primary)",
          }}
        >
          {compositeScore}
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--color-text-tertiary)" }}>
            /100
          </span>
        </span>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid
            stroke="var(--color-border-subtle)"
            strokeOpacity={0.4}
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fontSize: 10,
              fill: "var(--color-text-secondary)",
              fontFamily: "var(--font-data)",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value: number) => `${value}/100`}
              />
            }
          />
          <Radar
            name="Risk Profile"
            dataKey="value"
            stroke="hsl(210, 83%, 49%)"
            fill="hsl(210, 83%, 49%)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ChartContainer>
    </div>
  );
}
```

**Step 2: Verify**

Run: `ls -la client/src/components/charts/risk-radar.tsx`

---

## Task 3: Create Sector Heatmap

**Files:**
- Create: `client/src/components/charts/sector-heatmap.tsx`

**Data source:** `holdings` array — cross-tab by `sector` (rows) × `assetClass` or account type (columns). Cell value = total market value in that intersection.

**Design:** Custom SVG grid. Each cell colored by intensity (value as fraction of max cell). Tooltip on hover shows dollar value + count.

**Step 1: Create the component file**

```tsx
import { useMemo, useState } from "react";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

interface HoldingForHeatmap {
  sector: string;
  marketValue: number | string;
  riskCategory?: string;
  productType?: string;
}

interface SectorHeatmapProps {
  holdings: HoldingForHeatmap[];
  groupBy?: "riskCategory" | "productType";
}

const fmtCurrency = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}K`
      : `$${v.toFixed(0)}`;

// Interpolate between two HSL colors based on intensity 0–1
function heatColor(intensity: number): string {
  // Dark blue (cold) → Teal (warm) → Gold (hot)
  if (intensity === 0) return "hsla(210, 30%, 20%, 0.15)";
  if (intensity < 0.5) {
    const t = intensity * 2;
    return `hsla(${210 - t * 36}, ${60 + t * 20}%, ${35 + t * 10}%, ${0.4 + t * 0.3})`;
  }
  const t = (intensity - 0.5) * 2;
  return `hsla(${174 - t * 133}, ${80 + t * 20}%, ${45 + t * 10}%, ${0.7 + t * 0.3})`;
}

export function SectorHeatmap({
  holdings,
  groupBy = "riskCategory",
}: SectorHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const { rows, cols, grid, maxValue } = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const gridMap = new Map<string, { value: number; count: number }>();

    holdings.forEach((h) => {
      const sector = h.sector || "Other";
      const col = (groupBy === "riskCategory" ? h.riskCategory : h.productType) || "Other";
      const mv = typeof h.marketValue === "string" ? parseFloat(h.marketValue) : h.marketValue;

      rowSet.add(sector);
      colSet.add(col);

      const key = `${sector}|${col}`;
      const existing = gridMap.get(key) || { value: 0, count: 0 };
      gridMap.set(key, { value: existing.value + mv, count: existing.count + 1 });
    });

    const sortedRows = [...rowSet].sort();
    const sortedCols = [...colSet].sort();
    let max = 0;
    gridMap.forEach((v) => {
      if (v.value > max) max = v.value;
    });

    return { rows: sortedRows, cols: sortedCols, grid: gridMap, maxValue: max };
  }, [holdings, groupBy]);

  if (!holdings.length || !rows.length) return null;

  const cellW = 64;
  const cellH = 32;
  const labelW = 90;
  const headerH = 50;
  const svgW = labelW + cols.length * cellW + 8;
  const svgH = headerH + rows.length * cellH + 8;

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      <div style={{ padding: "16px 20px 8px" }}>
        <h3 style={V2_TITLE}>Concentration Heatmap</h3>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
          Sector × {groupBy === "riskCategory" ? "Risk Category" : "Product Type"}
        </p>
      </div>
      <div style={{ overflowX: "auto", padding: "0 12px 16px" }}>
        <svg width={svgW} height={svgH} style={{ display: "block" }}>
          {/* Column headers */}
          {cols.map((col, ci) => (
            <text
              key={col}
              x={labelW + ci * cellW + cellW / 2}
              y={headerH - 8}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-data)"
              fill="var(--color-text-tertiary)"
              transform={`rotate(-25, ${labelW + ci * cellW + cellW / 2}, ${headerH - 8})`}
            >
              {col.length > 10 ? col.slice(0, 10) + "…" : col}
            </text>
          ))}

          {/* Rows */}
          {rows.map((row, ri) => (
            <g key={row}>
              {/* Row label */}
              <text
                x={labelW - 6}
                y={headerH + ri * cellH + cellH / 2 + 3}
                textAnchor="end"
                fontSize={9}
                fontFamily="var(--font-data)"
                fill="var(--color-text-secondary)"
              >
                {row.length > 12 ? row.slice(0, 12) + "…" : row}
              </text>

              {/* Cells */}
              {cols.map((col, ci) => {
                const key = `${row}|${col}`;
                const cell = grid.get(key);
                const intensity = cell && maxValue > 0 ? cell.value / maxValue : 0;
                const isHovered = hoveredCell === key;

                return (
                  <g key={key}>
                    <rect
                      x={labelW + ci * cellW + 1}
                      y={headerH + ri * cellH + 1}
                      width={cellW - 2}
                      height={cellH - 2}
                      rx={3}
                      fill={heatColor(intensity)}
                      stroke={isHovered ? "var(--color-text-primary)" : "transparent"}
                      strokeWidth={1}
                      style={{ cursor: cell ? "pointer" : "default", transition: "fill 0.2s" }}
                      onMouseEnter={() => setHoveredCell(key)}
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                    {cell && cell.value > 0 && (
                      <text
                        x={labelW + ci * cellW + cellW / 2}
                        y={headerH + ri * cellH + cellH / 2 + 3}
                        textAnchor="middle"
                        fontSize={8}
                        fontFamily="var(--font-data)"
                        fontWeight={600}
                        fill={intensity > 0.5 ? "white" : "var(--color-text-secondary)"}
                        pointerEvents="none"
                      >
                        {fmtCurrency(cell.value)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      {/* Tooltip overlay for hovered cell */}
      {hoveredCell && grid.get(hoveredCell) && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 20,
            fontSize: 10,
            fontFamily: "var(--font-data)",
            color: "var(--color-text-secondary)",
            background: "var(--color-surface-overlay)",
            padding: "4px 8px",
            borderRadius: 4,
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {hoveredCell.replace("|", " × ")}: {fmtCurrency(grid.get(hoveredCell)!.value)} ({grid.get(hoveredCell)!.count} holdings)
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify**

Run: `ls -la client/src/components/charts/sector-heatmap.tsx`

---

## Task 4: Create Holdings Treemap

**Files:**
- Create: `client/src/components/charts/holdings-treemap.tsx`

**Data source:** `topHoldingsByValue` — ticker as label, marketValue as area, sector determines color group.

**Step 1: Create the component file**

```tsx
import { useMemo } from "react";
import { Treemap, Tooltip } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

interface HoldingsTreemapProps {
  topHoldingsByValue: {
    ticker: string;
    name: string;
    marketValue: number;
    weight: number;
    sector: string;
  }[];
}

// Sector → color mapping (stable across renders)
const SECTOR_COLORS: Record<string, string> = {
  "Technology": "hsl(210, 83%, 49%)",
  "Information Technology": "hsl(210, 83%, 49%)",
  "Healthcare": "hsl(174, 95%, 34%)",
  "Health Care": "hsl(174, 95%, 34%)",
  "Financials": "hsl(265, 94%, 58%)",
  "Consumer Discretionary": "hsl(41, 100%, 49%)",
  "Consumer Staples": "hsl(24, 100%, 55%)",
  "Industrials": "hsl(200, 65%, 40%)",
  "Energy": "hsl(0, 70%, 50%)",
  "Materials": "hsl(150, 50%, 38%)",
  "Utilities": "hsl(43, 100%, 50%)",
  "Real Estate": "hsl(330, 100%, 64%)",
  "Communication Services": "hsl(160, 72%, 45%)",
};
const DEFAULT_COLOR = "hsl(0, 0%, 50%)";

const fmtCurrency = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}K`
      : `$${v.toFixed(0)}`;

// Custom content renderer for treemap cells
function TreemapCell(props: any) {
  const { x, y, width, height, name, weight, sector } = props;
  if (width < 30 || height < 20) return null;

  const color = SECTOR_COLORS[sector] || DEFAULT_COLOR;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={color}
        fillOpacity={0.75}
        stroke="var(--color-surface-raised)"
        strokeWidth={2}
      />
      {width > 45 && height > 28 && (
        <>
          <text
            x={x + 6}
            y={y + 14}
            fontSize={11}
            fontWeight={700}
            fontFamily="var(--font-data)"
            fill="white"
          >
            {name}
          </text>
          {height > 38 && (
            <text
              x={x + 6}
              y={y + 26}
              fontSize={9}
              fontFamily="var(--font-data)"
              fill="rgba(255,255,255,0.75)"
            >
              {weight?.toFixed(1)}%
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function HoldingsTreemap({ topHoldingsByValue }: HoldingsTreemapProps) {
  const treemapData = useMemo(
    () =>
      topHoldingsByValue.map((h) => ({
        name: h.ticker,
        fullName: h.name,
        size: h.marketValue,
        weight: h.weight,
        sector: h.sector,
      })),
    [topHoldingsByValue]
  );

  const chartConfig: ChartConfig = useMemo(
    () => ({
      holdings: { label: "Holdings", color: "hsl(210, 83%, 49%)" },
    }),
    []
  );

  if (!topHoldingsByValue.length) return null;

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      <div style={{ padding: "16px 20px 8px" }}>
        <h3 style={V2_TITLE}>Holdings Map</h3>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
          Area = market value · Color = sector
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="var(--color-surface-raised)"
          content={<TreemapCell />}
        >
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value: number, name: string, item: any) =>
                  `${item.payload?.fullName || name}: ${fmtCurrency(value as number)} (${item.payload?.weight?.toFixed(1)}%)`
                }
              />
            }
          />
        </Treemap>
      </ChartContainer>
      {/* Sector legend */}
      <div
        style={{
          padding: "8px 20px 16px",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {[...new Set(topHoldingsByValue.map((h) => h.sector))].map((sector) => (
          <span
            key={sector}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              fontFamily: "var(--font-data)",
              color: "var(--color-text-tertiary)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 2,
                background: SECTOR_COLORS[sector] || DEFAULT_COLOR,
                flexShrink: 0,
              }}
            />
            {sector}
          </span>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `ls -la client/src/components/charts/holdings-treemap.tsx`

---

## Task 5: Create Risk Gauge (Custom SVG)

**Files:**
- Create: `client/src/components/charts/risk-gauge.tsx`

**Data source:** Derived composite risk score from portfolio performance (same computation as radar chart composite). The gauge is a semi-circular arc with needle.

**Step 1: Create the component file**

```tsx
import { useMemo } from "react";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

interface RiskGaugeProps {
  /** 0–100 composite risk score */
  score: number;
  label?: string;
  size?: number;
}

// Score → color (matches token sc() function)
function scoreColor(v: number): string {
  if (v >= 80) return "hsl(152, 69%, 40%)";
  if (v >= 60) return "hsl(41, 100%, 49%)";
  if (v >= 40) return "hsl(24, 100%, 55%)";
  return "hsl(0, 72%, 51%)";
}

// Score → label
function scoreLabel(v: number): string {
  if (v >= 80) return "Low Risk";
  if (v >= 60) return "Moderate";
  if (v >= 40) return "Elevated";
  return "High Risk";
}

export function RiskGauge({ score, label = "Portfolio Risk", size = 180 }: RiskGaugeProps) {
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 20;

  const { arcPath, needleAngle, color } = useMemo(() => {
    const startAngle = Math.PI; // left (180°)
    const endAngle = 0; // right (0°)
    const sweepAngle = startAngle - endAngle;

    // Score 0 = left, 100 = right
    const angle = startAngle - (score / 100) * sweepAngle;

    // Background arc (full semicircle)
    const arcStart = {
      x: cx + r * Math.cos(startAngle),
      y: cy - r * Math.sin(startAngle),
    };
    const arcEnd = {
      x: cx + r * Math.cos(endAngle),
      y: cy - r * Math.sin(endAngle),
    };
    const path = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

    return {
      arcPath: path,
      needleAngle: angle,
      color: scoreColor(score),
    };
  }, [score, cx, cy, r]);

  // Needle endpoint
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      <div style={{ padding: "16px 20px 0" }}>
        <h3 style={V2_TITLE}>{label}</h3>
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
        <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
          {/* Background track */}
          <path
            d={arcPath}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={12}
            strokeLinecap="round"
          />

          {/* Colored arc up to score */}
          {(() => {
            const startAngle = Math.PI;
            const scoreAngle = startAngle - (score / 100) * Math.PI;
            const sx = cx + r * Math.cos(startAngle);
            const sy = cy - r * Math.sin(startAngle);
            const ex = cx + r * Math.cos(scoreAngle);
            const ey = cy - r * Math.sin(scoreAngle);
            const largeArc = score > 50 ? 1 : 0;
            const path = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
            return (
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={12}
                strokeLinecap="round"
                style={{ transition: "stroke 0.5s, d 0.5s" }}
              />
            );
          })()}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={5} fill={color} />
          <circle cx={cx} cy={cy} r={2} fill="var(--color-surface-raised)" />

          {/* Score text */}
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
            fontFamily="var(--font-data)"
            fill={color}
          >
            {score}
          </text>
          <text
            x={cx}
            y={cy + 35}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-data)"
            fill="var(--color-text-tertiary)"
          >
            {scoreLabel(score)}
          </text>

          {/* Min/max labels */}
          <text
            x={cx - r - 2}
            y={cy + 8}
            textAnchor="start"
            fontSize={8}
            fontFamily="var(--font-data)"
            fill="var(--color-text-tertiary)"
          >
            HIGH
          </text>
          <text
            x={cx + r + 2}
            y={cy + 8}
            textAnchor="end"
            fontSize={8}
            fontFamily="var(--font-data)"
            fill="var(--color-text-tertiary)"
          >
            LOW
          </text>
        </svg>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `ls -la client/src/components/charts/risk-gauge.tsx`

---

## Task 6: Create Goals Pipeline Chart

**Files:**
- Create: `client/src/components/charts/goals-pipeline.tsx`

**Data source:** Goals bucket data (from goals-section.tsx). Each bucket has `currentValue`, `targetValue`, `fundedRatio`, `name`.

**Step 1: Create the component file**

```tsx
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

interface BucketData {
  id: number;
  name: string;
  currentValue: number;
  targetValue: number;
  fundedRatio: number;
}

interface GoalsPipelineProps {
  buckets: BucketData[];
  totalPortfolio: number;
}

const fmtCurrency = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}K`
      : `$${v.toFixed(0)}`;

// Funded ratio → color
function fundedColor(ratio: number): string {
  if (ratio >= 0.9) return "hsl(152, 69%, 40%)";
  if (ratio >= 0.7) return "hsl(174, 95%, 34%)";
  if (ratio >= 0.5) return "hsl(41, 100%, 49%)";
  return "hsl(0, 72%, 51%)";
}

export function GoalsPipeline({ buckets, totalPortfolio }: GoalsPipelineProps) {
  const chartData = useMemo(
    () =>
      buckets.map((b) => ({
        name: b.name,
        funded: b.currentValue,
        gap: Math.max(0, b.targetValue - b.currentValue),
        fundedRatio: b.fundedRatio,
        targetValue: b.targetValue,
      })),
    [buckets]
  );

  const chartConfig: ChartConfig = useMemo(
    () => ({
      funded: { label: "Funded", color: "hsl(152, 69%, 40%)" },
      gap: { label: "Gap to Target", color: "hsla(0, 0%, 50%, 0.2)" },
    }),
    []
  );

  if (!buckets.length) return null;

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      <div style={{ padding: "16px 20px 8px" }}>
        <h3 style={V2_TITLE}>Goals Funding Pipeline</h3>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
          Current vs target by bucket · Total portfolio {fmtCurrency(totalPortfolio)}
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) => fmtCurrency(v)}
            tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tick={{ fontSize: 10, fill: "var(--color-text-secondary)", fontFamily: "var(--font-data)" }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value: number, name: string, item: any) => {
                  const ratio = item.payload?.fundedRatio;
                  return name === "funded"
                    ? `Funded: ${fmtCurrency(value as number)} (${(ratio * 100).toFixed(0)}%)`
                    : `Gap: ${fmtCurrency(value as number)}`;
                }}
              />
            }
          />
          <Bar dataKey="funded" stackId="goal" radius={[4, 0, 0, 4]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={fundedColor(d.fundedRatio)} />
            ))}
          </Bar>
          <Bar
            dataKey="gap"
            stackId="goal"
            fill="hsla(0, 0%, 50%, 0.15)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
```

**Step 2: Verify**

Run: `ls -la client/src/components/charts/goals-pipeline.tsx`

---

## Task 7: Wire Sunburst + Treemap + Heatmap into Portfolio Section

**Files:**
- Modify: `client/src/pages/client-detail/portfolio-section.tsx`

**Step 1: Add imports at top of file**

Add after existing imports:
```tsx
import { AllocationSunburst } from "@/components/charts/allocation-sunburst";
import { HoldingsTreemap } from "@/components/charts/holdings-treemap";
import { SectorHeatmap } from "@/components/charts/sector-heatmap";
```

**Step 2: Find the return statement and add charts**

Locate the existing allocation pie chart section. Add the three new chart components BELOW the existing charts section, inside the same parent container. Use a 2-column grid for Sunburst + Treemap, and full-width for Heatmap:

```tsx
{/* — Phase A Charts — */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
  <AllocationSunburst
    allocationBreakdown={allocationBreakdown || []}
    sectorExposure={sectorExposure || []}
    topHoldingsByValue={topHoldingsByValue || []}
  />
  <HoldingsTreemap topHoldingsByValue={topHoldingsByValue || []} />
</div>
<SectorHeatmap holdings={holdings || []} />
```

**SAFETY CHECK:** Only add JSX. Do NOT rename any existing props, change data bindings, or modify the component's parameter list. The `allocationBreakdown`, `sectorExposure`, `topHoldingsByValue`, and `holdings` props already exist on this component.

**Step 3: Verify build**

Run: `cd /Users/luitzecapodici/Desktop/30\ Main\ Branch/WMAPP-source-truth && npx next build --no-lint 2>&1 | head -40`

---

## Task 8: Wire Risk Radar + Risk Gauge into Overview Section

**Files:**
- Modify: `client/src/pages/client-detail/overview-section.tsx`

**Step 1: Add imports**

```tsx
import { RiskRadar } from "@/components/charts/risk-radar";
import { RiskGauge } from "@/components/charts/risk-gauge";
```

**Step 2: Compute composite risk score**

Inside the component, after existing `useMemo` blocks, add:

```tsx
const compositeRiskScore = useMemo(() => {
  const top5Weight = (topHoldingsByValue || [])
    .slice(0, 5)
    .reduce((sum, h) => sum + (h.weight || 0), 0);
  const diversification = Math.max(0, Math.min(100, 100 - top5Weight));
  const sectorSpread = Math.min(100, ((sectorExposure || []).length / 11) * 100);
  const sharpe = Math.min(100, Math.abs(portfolioPerformance?.sharpeRatio ?? 0) * 33);
  const dd = Math.min(100, Math.max(0, 100 + (portfolioPerformance?.maxDrawdown ?? 0)));
  return Math.round((diversification + sectorSpread + sharpe + dd) / 4);
}, [topHoldingsByValue, sectorExposure, portfolioPerformance]);
```

**Step 3: Add charts below existing performance bar chart**

```tsx
{/* — Phase A: Risk Charts — */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
  <RiskRadar
    topHoldingsByValue={topHoldingsByValue}
    sectorExposure={sectorExposure}
    riskDistribution={riskDistribution}
    portfolioPerformance={portfolioPerformance}
  />
  <RiskGauge score={compositeRiskScore} />
</div>
```

**SAFETY CHECK:** Verify all prop names match what the component already receives. Check the component signature for `topHoldingsByValue`, `sectorExposure`, `riskDistribution`, `portfolioPerformance`. If any are missing from this section's props, they'll need to be threaded through from `client-tabs.tsx`.

**Step 4: Verify build**

Run: `npx next build --no-lint 2>&1 | head -40`

---

## Task 9: Wire Goals Pipeline into Goals Section

**Files:**
- Modify: `client/src/pages/client-detail/goals-section.tsx`

**Step 1: Add import**

```tsx
import { GoalsPipeline } from "@/components/charts/goals-pipeline";
```

**Step 2: Add pipeline chart**

Find the bucket analysis section and add the pipeline chart above or below the existing bucket cards:

```tsx
{bucketAnalysis && (
  <GoalsPipeline
    buckets={bucketAnalysis.buckets}
    totalPortfolio={bucketAnalysis.totalPortfolio}
  />
)}
```

**SAFETY CHECK:** Verify `bucketAnalysis` is already computed in this section. The `BucketData` interface matches our chart's expected props.

**Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | head -40`

---

## Task 10: Visual Verification

**Step 1: Start dev server**

Run: `cd /Users/luitzecapodici/Desktop/30\ Main\ Branch/WMAPP-source-truth && npx next dev --webpack`

**Step 2: Navigate to client detail page**

Open browser to `http://localhost:3000` → select a client → verify:
- [ ] Portfolio tab: Sunburst shows 3 concentric rings
- [ ] Portfolio tab: Treemap shows holdings as colored rectangles
- [ ] Portfolio tab: Heatmap shows sector × risk grid
- [ ] Overview tab: Radar chart shows 5-axis pentagon
- [ ] Overview tab: Gauge shows semicircular arc with needle
- [ ] Goals tab: Pipeline shows horizontal stacked bars

**Step 3: Check dark mode rendering**

Verify all charts render legibly inside `v2-dark-scope` containers. Text should be light on dark backgrounds.

**Step 4: Check responsive behavior**

Resize browser to tablet width (~768px). The 2-column grids should still be readable. If not, add a responsive breakpoint:
```tsx
style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}
```

---

## Dependencies Between Tasks

```
Tasks 1–6 (chart components) → independent, can run in parallel
Task 7 depends on Tasks 1, 3, 4
Task 8 depends on Tasks 2, 5
Task 9 depends on Task 6
Task 10 depends on Tasks 7, 8, 9
```
