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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  sourceBadge?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)));

const RADAR_COLOR = "hsl(210, 83%, 49%)";

const chartConfig: ChartConfig = {
  score: {
    label: "Score",
    color: RADAR_COLOR,
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RiskRadar({
  topHoldingsByValue,
  sectorExposure,
  riskDistribution,
  portfolioPerformance,
  sourceBadge,
}: RiskRadarProps) {
  const axes = useMemo(() => {
    // 1. Diversification — 100 minus concentration of top-5 holdings
    const top5Weight = (topHoldingsByValue ?? [])
      .slice(0, 5)
      .reduce((sum, h) => sum + (h.weight ?? 0), 0);
    const diversification = clamp(100 - top5Weight);

    // 2. Sector Spread — count of sectors vs GICS 11
    const sectorCount = (sectorExposure ?? []).length;
    const sectorSpread = clamp((sectorCount / 11) * 100);

    // 3. Risk Balance — inverse HHI of risk-distribution percentages
    const riskPcts = (riskDistribution ?? []).map((r) => r.pct / 100);
    const hhi = riskPcts.reduce((sum, p) => sum + p * p, 0);
    const riskBalance = clamp((1 - hhi) * 100);

    // 4. Sharpe — |sharpeRatio| * 33  (Sharpe of 3 → 100)
    const sharpeRaw = portfolioPerformance?.sharpeRatio ?? 0;
    const sharpe = clamp(Math.abs(sharpeRaw) * 33);

    // 5. Drawdown Resilience — 100 + maxDrawdown (drawdown is negative)
    const dd = portfolioPerformance?.maxDrawdown ?? 0;
    const drawdownResilience = clamp(100 + dd);

    return [
      { axis: "Diversification", score: diversification },
      { axis: "Sector Spread", score: sectorSpread },
      { axis: "Risk Balance", score: riskBalance },
      { axis: "Sharpe", score: sharpe },
      { axis: "Drawdown Resilience", score: drawdownResilience },
    ];
  }, [topHoldingsByValue, sectorExposure, riskDistribution, portfolioPerformance]);

  const radarData = useMemo(() => {
    // 1. Diversification
    const top5Weight = (topHoldingsByValue ?? [])
      .slice(0, 5)
      .reduce((sum, h) => sum + (h.weight ?? 0), 0);

    // 2. Sector Spread
    const sectorCount = (sectorExposure ?? []).length;

    // 3. Risk Balance — HHI
    const riskPcts = (riskDistribution ?? []).map((r) => r.pct / 100);
    const hhi = riskPcts.reduce((sum, p) => sum + p * p, 0);

    // 4. Sharpe
    const sharpe = portfolioPerformance?.sharpeRatio ?? 0;

    // 5. Drawdown
    const dd = portfolioPerformance?.maxDrawdown ?? 0;

    const explanations: Record<string, string> = {
      Diversification: `Top 5 holdings = ${top5Weight.toFixed(0)}% of portfolio`,
      "Sector Spread": `${sectorCount} of 11 GICS sectors represented`,
      "Risk Balance": `HHI concentration index: ${(hhi * 100).toFixed(0)}%`,
      Sharpe: `Risk-adjusted return ratio: ${sharpe.toFixed(2)}`,
      "Drawdown Resilience": `Max drawdown: ${dd.toFixed(1)}%`,
    };

    return axes.map((a) => ({
      ...a,
      value: a.score,
      explanation: explanations[a.axis] ?? "",
    }));
  }, [axes, topHoldingsByValue, sectorExposure, riskDistribution, portfolioPerformance]);

  const composite = useMemo(() => {
    const avg = axes.reduce((s, a) => s + a.score, 0) / axes.length;
    return Math.round(avg);
  }, [axes]);

  /* Early exit — no data at all */
  const hasData =
    (topHoldingsByValue && topHoldingsByValue.length > 0) ||
    (sectorExposure && sectorExposure.length > 0) ||
    (riskDistribution && riskDistribution.length > 0) ||
    portfolioPerformance;

  if (!hasData) return null;

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 0",
        }}
      >
        <span style={{ ...V2_TITLE, display: "flex", alignItems: "center", gap: 8 }}>Risk Profile {sourceBadge}</span>
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-text-primary, #fff)",
          }}
        >
          {composite}
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: "var(--color-text-secondary)",
            }}
          >
            /100
          </span>
        </span>
      </div>

      {/* Radar */}
      <ChartContainer config={chartConfig} className="h-[220px] md:h-[280px] w-full">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={axes}>
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
            tick={{ fontSize: 9 }}
            tickFormatter={(value: number) => `${Math.round(value)}`}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => [`${Math.round(Number(value))}`, "Score"]}
              />
            }
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={RADAR_COLOR}
            fill={RADAR_COLOR}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ChartContainer>

      {/* Score breakdown */}
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {radarData.map((d) => {
          const rounded = Math.round(d.value);
          return (
            <div key={d.axis} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 14, fontWeight: 600,
                color: rounded >= 70 ? "hsl(152, 69%, 40%)" : rounded >= 40 ? "hsl(41, 100%, 49%)" : "hsl(0, 72%, 51%)",
                minWidth: 28, flexShrink: 0, textAlign: "right",
              }}>
                {rounded}
              </span>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.axis}</div>
                <div style={{ fontSize: 9, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.explanation}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
