import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function fundedColor(ratio: number): string {
  if (ratio >= 0.9) return "hsl(152, 69%, 40%)";
  if (ratio >= 0.7) return "hsl(174, 95%, 34%)";
  if (ratio >= 0.5) return "hsl(41, 100%, 49%)";
  return "hsl(0, 72%, 51%)";
}

/* ------------------------------------------------------------------ */
/*  Chart config                                                       */
/* ------------------------------------------------------------------ */

const chartConfig: ChartConfig = {
  funded: { label: "Funded", color: "hsl(152, 69%, 40%)" },
  gap: { label: "Gap to Target", color: "hsla(0, 0%, 50%, 0.2)" },
} satisfies ChartConfig;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
    [buckets],
  );

  /* Early exit — after all hooks */
  if (!buckets || buckets.length === 0) return null;

  return (
    <div style={V2_CARD} className={V2_DARK_SCOPE}>
      <h3 style={V2_TITLE}>Goals Funding Pipeline</h3>
      <p
        className="mb-2 text-xs text-muted-foreground"
        style={{ marginTop: 2 }}
      >
        Total portfolio: {fmtCurrency(totalPortfolio)}
      </p>

      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
        >
          <XAxis
            type="number"
            tickFormatter={fmtCurrency}
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
                formatter={(value, name, entry) => {
                  const row = entry?.payload;
                  if (name === "funded") {
                    const pct = ((row?.fundedRatio ?? 0) * 100).toFixed(0);
                    return `Funded: ${fmtCurrency(Number(value))} (${pct}%)`;
                  }
                  return `Gap: ${fmtCurrency(Number(value))}`;
                }}
              />
            }
          />

          <Bar
            dataKey="funded"
            stackId="goal"
            radius={[4, 0, 0, 4]}
          >
            {chartData.map((row, i) => (
              <Cell key={`funded-${i}`} fill={fundedColor(row.fundedRatio)} />
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
