/**
 * Holdings Treemap — Cards ↔ Map toggle
 *
 * Cards view: clean interactive rows with ticker badges, proportional bars.
 * Map view: dark gradient treemap cells styled like the Accounts treemap
 *           with translucent gradient fills, left accent bars, and a live pulse.
 */
import { useMemo, useState } from "react";
import { Treemap } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { P } from "@/styles/tokens";

/* ═══════════════════════════════════════════════════════════════════ */
/*  Types                                                              */
/* ═══════════════════════════════════════════════════════════════════ */

interface HoldingsTreemapProps {
  topHoldingsByValue: {
    ticker: string;
    name: string;
    marketValue: number;
    weight: number;
    sector: string;
  }[];
  isLiveData?: boolean;
  sourceBadge?: React.ReactNode;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sector Color Map                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

const SECTOR_COLORS: Record<string, string> = {
  Technology: "hsl(210, 83%, 49%)", "Information Technology": "hsl(210, 83%, 49%)",
  Healthcare: "hsl(175, 60%, 45%)", "Health Care": "hsl(175, 60%, 45%)",
  Financials: "hsl(42, 80%, 55%)", Finance: "hsl(42, 80%, 55%)",
  "Consumer Discretionary": "hsl(265, 55%, 58%)", "Consumer Staples": "hsl(265, 55%, 48%)",
  Consumer: "hsl(265, 55%, 58%)",
  Industrials: "hsl(152, 69%, 40%)", Energy: "hsl(24, 100%, 55%)",
  Materials: "hsl(200, 65%, 40%)", Utilities: "hsl(265, 55%, 48%)",
  "Real Estate": "hsl(42, 80%, 45%)", REIT: "hsl(42, 80%, 45%)",
  "Communication Services": "hsl(0, 0%, 55%)", Telecom: "hsl(0, 0%, 55%)",
  Cash: "hsl(220, 10%, 55%)", "Money Market": "hsl(220, 10%, 55%)",
  Equities: "hsl(215, 70%, 55%)", Equity: "hsl(215, 70%, 55%)",
  "Fixed Income": "hsl(175, 60%, 45%)", Bond: "hsl(175, 60%, 45%)", Bonds: "hsl(175, 60%, 45%)",
  ETF: "hsl(265, 55%, 58%)", "Exchange-Traded Fund": "hsl(265, 55%, 58%)",
  "Mutual Fund": "hsl(42, 80%, 55%)", "Mutual Funds": "hsl(42, 80%, 55%)",
  Alternative: "hsl(152, 69%, 40%)", Alternatives: "hsl(152, 69%, 40%)",
  "Large Blend": "hsl(215, 70%, 55%)", "Large Growth": "hsl(210, 83%, 49%)",
  "Large Value": "hsl(215, 50%, 45%)",
  "Muni National Interm": "hsl(175, 60%, 45%)", "Corporate Bond": "hsl(200, 65%, 40%)",
  "Private Equity": "hsl(152, 69%, 40%)", "Private Debt": "hsl(175, 50%, 40%)",
  "Foreign Large Blend": "hsl(265, 55%, 58%)",
  Other: "hsl(220, 10%, 55%)", Unknown: "hsl(220, 10%, 55%)",
};

const FALLBACK_PALETTE = [
  "hsl(215, 70%, 55%)", "hsl(175, 60%, 45%)", "hsl(42, 80%, 55%)",
  "hsl(265, 55%, 58%)", "hsl(24, 100%, 55%)", "hsl(152, 69%, 40%)",
  "hsl(200, 65%, 40%)", "hsl(210, 83%, 49%)", "hsl(42, 80%, 45%)",
  "hsl(0, 0%, 55%)",
] as const;

function getSectorColor(sector: string, index?: number): string {
  if (!sector || sector === "Other" || sector === "Unknown") {
    return index != null ? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length] : "hsl(220, 10%, 55%)";
  }
  if (SECTOR_COLORS[sector]) return SECTOR_COLORS[sector];
  const lower = sector.toLowerCase();
  for (const [key, color] of Object.entries(SECTOR_COLORS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return color;
  }
  let hash = 0;
  for (let i = 0; i < sector.length; i++) {
    hash = ((hash << 5) - hash) + sector.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helpers                                                            */
/* ═══════════════════════════════════════════════════════════════════ */

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Treemap Cell — Accounts-style gradient                             */
/* ═══════════════════════════════════════════════════════════════════ */

function TreemapCell(props: any) {
  const { x, y, width, height } = props;
  const ticker: string = props.name ?? "";
  const fullName: string = props.fullName ?? "";
  const weight: number | undefined = props.weight;
  const marketValue: number = props.marketValue ?? 0;
  const fill: string = props.cellColor || getSectorColor(props.sector ?? "", props.index);

  if (!width || !height || width < 16 || height < 16) return null;

  const uid = `hg-${Math.round(x)}-${Math.round(y)}`;
  const isSmall = width < 80 || height < 45;
  const maxChars = Math.max(4, Math.floor(width / 7.5));
  const displayName = fullName.length > maxChars ? fullName.slice(0, maxChars - 1) + "…" : fullName;

  return (
    <g style={{ cursor: "pointer" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.28} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.12} />
        </linearGradient>
      </defs>
      {/* Cell background — translucent gradient */}
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={`url(#${uid})`} rx={6}
        stroke={fill} strokeOpacity={0.35} strokeWidth={1}
      />
      {/* Left accent bar */}
      <rect x={x + 1} y={y + 1} width={3} height={height - 2} rx={1.5}
        fill={fill} fillOpacity={0.65} />
      {/* Ticker */}
      {width > 40 && height > 24 && (
        <text
          x={x + 12} y={y + (isSmall ? height / 2 - (height > 38 ? 4 : 0) : 18)}
          textAnchor="start" dominantBaseline={isSmall && height <= 38 ? "central" : "auto"}
          fill={fill} fillOpacity={0.95} fontSize={isSmall ? 10 : 12} fontWeight={700}
          style={{ fontFamily: "'DM Mono', 'SF Mono', monospace" }}
        >
          {ticker}
        </text>
      )}
      {/* Fund name */}
      {width > 70 && height > 42 && (
        <text
          x={x + 12} y={y + (isSmall ? height / 2 + 8 : 32)}
          textAnchor="start" dominantBaseline="auto"
          fill="var(--color-text-primary, #E2E6EF)" fillOpacity={0.7}
          fontSize={isSmall ? 9 : 10.5} fontWeight={400}
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {displayName}
        </text>
      )}
      {/* Value */}
      {width > 50 && height > 56 && (
        <text
          x={x + 12} y={y + (isSmall ? height / 2 + 22 : 47)}
          textAnchor="start" dominantBaseline="auto"
          fill={fill} fillOpacity={0.85} fontSize={isSmall ? 9 : 11} fontWeight={600}
          style={{ fontFamily: "var(--font-data, 'DM Mono', monospace)" }}
        >
          {formatCurrency(marketValue)}
        </text>
      )}
      {/* Weight in top-right for large cells */}
      {width > 90 && height > 32 && weight != null && (
        <text
          x={x + width - 8} y={y + 16}
          textAnchor="end" dominantBaseline="auto"
          fill="var(--color-text-primary, #E2E6EF)" fillOpacity={0.4}
          fontSize={9} fontWeight={500}
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {weight.toFixed(1)}%
        </text>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Card Row (from previous design)                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function HoldingRow({
  ticker, name, marketValue, weight, sector, color, maxValue,
}: {
  ticker: string; name: string; marketValue: number; weight: number;
  sector: string; color: string; maxValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const barWidth = maxValue > 0 ? (marketValue / maxValue) * 100 : 0;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: P.odSurf3, borderRadius: 8,
        border: `1px solid ${P.odBorder2}`,
        cursor: "pointer", transition: "all 0.15s ease", overflow: "hidden",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(35,43,62,0.9)"; e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = P.odSurf3; e.currentTarget.style.borderColor = P.odBorder2; }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 12 }}>
        <div style={{ width: 4, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{
          fontFamily: "'DM Mono', 'SF Mono', monospace", fontSize: 12, fontWeight: 700,
          color: P.odT1, background: `${color}18`, padding: "3px 8px", borderRadius: 4,
          minWidth: 48, textAlign: "center", flexShrink: 0,
        }}>{ticker}</div>
        <div style={{
          flex: 1, minWidth: 0, fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 12, color: P.odT2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ width: `${barWidth}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.3s ease" }} />
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: P.odT2, minWidth: 40, textAlign: "right" }}>
            {weight.toFixed(1)}%
          </span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: P.odT1, minWidth: 72, textAlign: "right", flexShrink: 0 }}>
          {formatCurrency(marketValue)}
        </span>
        <div style={{ color: P.odT3, flexShrink: 0 }}>
          {expanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
        </div>
      </div>
      {expanded && (
        <div style={{
          padding: "0 14px 12px 30px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px 16px", borderTop: `1px solid ${P.odBorder2}`, paddingTop: 10, marginLeft: 4,
        }}>
          <DetailCell label="Sector" value={sector || "—"} />
          <DetailCell label="Market Value" value={formatCurrency(marketValue)} />
          <DetailCell label="Portfolio Weight" value={`${weight.toFixed(2)}%`} />
        </div>
      )}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const, color: P.odT3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: 500, color: P.odT1 }}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  View Toggle                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function ViewToggle({ mode, onModeChange }: { mode: "cards" | "map"; onModeChange: (m: "cards" | "map") => void }) {
  return (
    <div style={{
      display: "flex", gap: 2, padding: 2,
      background: "rgba(255,255,255,0.04)",
      borderRadius: 6, border: `1px solid ${P.odBorder2}`,
    }}>
      {(["map", "cards"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onModeChange(m)}
          style={{
            padding: "4px 10px", fontSize: 10,
            fontWeight: mode === m ? 600 : 400,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: mode === m ? P.odT1 : P.odT3,
            background: mode === m ? `${P.odLBlue}18` : "transparent",
            border: "none", borderRadius: 4,
            cursor: "pointer", transition: "all 0.15s ease",
            letterSpacing: ".02em", textTransform: "uppercase" as const,
          }}
        >
          {m === "map" ? "Map" : "List"}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Live Pulse CSS                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

const livePulseStyle = `
@keyframes holdingsLivePulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 0.92; }
}
`;

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

export function HoldingsTreemap({ topHoldingsByValue, isLiveData, sourceBadge }: HoldingsTreemapProps) {
  const [viewMode, setViewMode] = useState<"cards" | "map">("map");

  const processedHoldings = useMemo(
    () => topHoldingsByValue
      .map((h, i) => ({ ...h, color: getSectorColor(h.sector, i) }))
      .sort((a, b) => b.marketValue - a.marketValue),
    [topHoldingsByValue],
  );

  const maxValue = useMemo(
    () => processedHoldings.length > 0 ? processedHoldings[0].marketValue : 0,
    [processedHoldings],
  );

  const treemapData = useMemo(
    () => processedHoldings.map((h, i) => ({
      name: h.ticker,
      fullName: h.name,
      size: h.marketValue,
      marketValue: h.marketValue,
      weight: h.weight,
      sector: h.sector,
      cellColor: h.color,
      index: i,
    })),
    [processedHoldings],
  );

  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    processedHoldings.forEach((h, i) => {
      cfg[`h-${i}`] = { label: h.ticker, color: h.color };
    });
    return cfg;
  }, [processedHoldings]);

  const uniqueSectors = useMemo(() => {
    const seen = new Set<string>();
    const result: { sector: string; color: string }[] = [];
    for (const h of processedHoldings) {
      if (!seen.has(h.sector)) {
        seen.add(h.sector);
        result.push({ sector: h.sector, color: h.color });
      }
    }
    return result;
  }, [processedHoldings]);

  if (!topHoldingsByValue || topHoldingsByValue.length === 0) return null;

  return (
    <div style={{ padding: "16px 20px" }}>
      <style>{livePulseStyle}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingUp style={{ width: 15, height: 15, color: P.odLBlue }} />
          <h3 style={{
            fontFamily: "'Oswald', 'Inter', system-ui, sans-serif",
            fontSize: 14, fontWeight: 600, color: P.odT2,
            letterSpacing: ".04em", textTransform: "uppercase" as const, margin: 0,
          }}>
            Top Holdings
          </h3>
          {sourceBadge}
          {isLiveData && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 9, fontWeight: 600, fontFamily: "'DM Mono', monospace",
              color: P.odGreen, background: `${P.odGreen}18`,
              padding: "2px 8px", borderRadius: 99,
              animation: "holdingsLivePulse 3s ease-in-out infinite",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: P.odGreen, boxShadow: `0 0 6px ${P.odGreen}`,
              }} />
              LIVE
            </span>
          )}
        </div>
        <ViewToggle mode={viewMode} onModeChange={setViewMode} />
      </div>

      {/* Sector legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 12 }}>
        {uniqueSectors.map(({ sector, color }) => (
          <span key={sector} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif", color: P.odT3,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            {sector}
          </span>
        ))}
      </div>

      {/* Map view — accounts-style treemap */}
      {viewMode === "map" && (
        <div style={{ animation: "holdingsLivePulse 4s ease-in-out infinite" }}>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="none"
              content={<TreemapCell />}
            >
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(val, _name, item) => {
                      const d = item?.payload;
                      const w = d?.weight;
                      return `${d?.fullName || ""} · ${formatCurrency(Number(val))}${w != null ? ` · ${Number(w).toFixed(1)}%` : ""}`;
                    }}
                  />
                }
              />
            </Treemap>
          </ChartContainer>
        </div>
      )}

      {/* Cards view */}
      {viewMode === "cards" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {processedHoldings.map((h) => (
            <HoldingRow
              key={h.ticker}
              ticker={h.ticker} name={h.name} marketValue={h.marketValue}
              weight={h.weight} sector={h.sector} color={h.color} maxValue={maxValue}
            />
          ))}
        </div>
      )}
    </div>
  );
}
