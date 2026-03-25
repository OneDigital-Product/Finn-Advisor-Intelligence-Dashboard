/**
 * Gain / Loss Heatmap — Cards ↔ Map ↔ Table toggle
 *
 * Map view: dark gradient treemap cells styled like the Accounts treemap
 *           with gain/loss coloring and a live pulse animation.
 * Cards view: interactive rows with gain/loss pills.
 * Table view: dense sortable table.
 */
import { useMemo, useState } from "react";
import { Treemap } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { P } from "@/styles/tokens";

/* ═══════════════════════════════════════════════════════════════════ */
/*  Types                                                              */
/* ═══════════════════════════════════════════════════════════════════ */

interface GainLossHeatmapProps {
  holdings: {
    ticker?: string;
    name?: string;
    description?: string;
    marketValue?: number | string;
    unrealizedGainLoss?: number | string;
    costBasis?: number | string;
    sector?: string;
    weight?: number | string;
  }[];
  sourceBadge?: React.ReactNode;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helpers                                                            */
/* ═══════════════════════════════════════════════════════════════════ */

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatGainLoss(value: number): string {
  const sign = value >= 0 ? "+" : "";
  if (Math.abs(value) >= 1_000_000) return `${sign}$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${sign}$${(value / 1_000).toFixed(1)}K`;
  return `${sign}$${value.toFixed(0)}`;
}

/** HSL color from gain/loss percentage — green for gains, orange for losses (brand: no red) */
function glHsl(pct: number): string {
  if (Math.abs(pct) < 0.5) return "hsl(220, 10%, 55%)"; // neutral
  if (pct > 0) {
    const t = Math.min(1, pct / 30);
    if (t < 0.3) return "hsl(152, 40%, 40%)";
    if (t < 0.6) return "hsl(152, 60%, 42%)";
    return "hsl(152, 69%, 45%)";
  }
  // Losses use orange (no red in brand)
  const t = Math.min(1, Math.abs(pct) / 30);
  if (t < 0.3) return "hsl(30, 60%, 45%)";
  if (t < 0.6) return "hsl(24, 80%, 50%)";
  return "hsl(24, 100%, 55%)";
}

/** Text-safe color for gain/loss */
function glTextColor(pct: number): string {
  if (Math.abs(pct) < 0.5) return P.odT3;
  if (pct > 0) return "#10B981"; // green
  return P.odOrange; // orange, NOT red
}

function glBg(pct: number): string {
  if (Math.abs(pct) < 0.5) return "rgba(148,163,184,0.08)";
  if (pct > 0) return "rgba(16,185,129,0.08)";
  return "rgba(244,125,32,0.08)";
}

function glBorder(pct: number): string {
  if (Math.abs(pct) < 0.5) return "rgba(148,163,184,0.15)";
  if (pct > 0) return "rgba(16,185,129,0.2)";
  return "rgba(244,125,32,0.2)";
}

/* Weight-only palette when no GL data */
const WEIGHT_PALETTE = [
  "hsl(215, 70%, 55%)", "hsl(175, 60%, 45%)", "hsl(42, 80%, 55%)",
  "hsl(265, 55%, 58%)", "hsl(24, 100%, 55%)", "hsl(152, 69%, 40%)",
  "hsl(200, 65%, 40%)", "hsl(210, 83%, 49%)", "hsl(42, 80%, 45%)",
  "hsl(0, 0%, 55%)",
] as const;

/* ═══════════════════════════════════════════════════════════════════ */
/*  Treemap Cell — Accounts-style gradient + gain/loss color           */
/* ═══════════════════════════════════════════════════════════════════ */

function GainLossCell(props: any) {
  const { x, y, width, height, ticker, glValue, glPct, marketValue, cellColor } = props;
  if (!width || !height || width < 16 || height < 16) return null;

  const fill = cellColor || glHsl(glPct ?? 0);
  const uid = `gl-${Math.round(x)}-${Math.round(y)}`;
  const isSmall = width < 80 || height < 45;
  const maxChars = Math.max(4, Math.floor(width / 7.5));
  const fullName: string = props.fullName ?? "";
  const displayName = fullName.length > maxChars ? fullName.slice(0, maxChars - 1) + "…" : fullName;

  return (
    <g style={{ cursor: "pointer" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.28} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.12} />
        </linearGradient>
      </defs>
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={`url(#${uid})`} rx={6}
        stroke={fill} strokeOpacity={0.35} strokeWidth={1}
      />
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
      {/* Name */}
      {width > 70 && height > 42 && (
        <text
          x={x + 12} y={y + (isSmall ? height / 2 + 8 : 32)}
          textAnchor="start" dominantBaseline="auto"
          fill="var(--color-text-primary, #E2E6EF)" fillOpacity={0.65}
          fontSize={isSmall ? 9 : 10.5} fontWeight={400}
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {displayName}
        </text>
      )}
      {/* G/L value or market value */}
      {width > 50 && height > 56 && (
        <text
          x={x + 12} y={y + (isSmall ? height / 2 + 22 : 47)}
          textAnchor="start" dominantBaseline="auto"
          fill={fill} fillOpacity={0.85} fontSize={isSmall ? 9 : 11} fontWeight={600}
          style={{ fontFamily: "var(--font-data, 'DM Mono', monospace)" }}
        >
          {glPct != null && Math.abs(glPct) >= 0.5
            ? `${glPct >= 0 ? "+" : ""}${glPct.toFixed(1)}%`
            : formatCurrency(marketValue || 0)}
        </text>
      )}
      {/* G/L amount in top-right for large cells */}
      {width > 90 && height > 32 && glValue != null && Math.abs(glValue) > 0 && (
        <text
          x={x + width - 8} y={y + 16}
          textAnchor="end" dominantBaseline="auto"
          fill={fill} fillOpacity={0.55}
          fontSize={9} fontWeight={500}
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {formatGainLoss(glValue)}
        </text>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Card Row                                                           */
/* ═══════════════════════════════════════════════════════════════════ */

function GLRow({
  ticker, fullName, marketValue, glValue, glPct, sector, weight,
  hasGainLossData, colorIndex,
}: {
  ticker: string; fullName: string; marketValue: number; glValue: number;
  glPct: number; sector: string; weight: number; hasGainLossData: boolean;
  colorIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const textColor = hasGainLossData ? glTextColor(glPct) : WEIGHT_PALETTE[colorIndex % WEIGHT_PALETTE.length];
  const bgColor = hasGainLossData ? glBg(glPct) : `${WEIGHT_PALETTE[colorIndex % WEIGHT_PALETTE.length]}12`;
  const borderColor = hasGainLossData ? glBorder(glPct) : `${WEIGHT_PALETTE[colorIndex % WEIGHT_PALETTE.length]}30`;
  const GainIcon = glPct > 0.5 ? ArrowUpRight : glPct < -0.5 ? ArrowDownRight : Minus;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: P.odSurf3, borderRadius: 8, border: `1px solid ${P.odBorder2}`,
        cursor: "pointer", transition: "all 0.15s ease", overflow: "hidden",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(35,43,62,0.9)"; e.currentTarget.style.borderColor = borderColor; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = P.odSurf3; e.currentTarget.style.borderColor = P.odBorder2; }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 12 }}>
        <div style={{ width: 4, height: 32, borderRadius: 2, background: textColor, flexShrink: 0 }} />
        <div style={{
          fontFamily: "'DM Mono', 'SF Mono', monospace", fontSize: 12, fontWeight: 700,
          color: P.odT1, background: bgColor, border: `1px solid ${borderColor}`,
          padding: "3px 8px", borderRadius: 4, minWidth: 48, textAlign: "center", flexShrink: 0,
        }}>{ticker}</div>
        <div style={{
          flex: 1, minWidth: 0, fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 12, color: P.odT2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{fullName}</div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: P.odT2, minWidth: 68, textAlign: "right", flexShrink: 0 }}>
          {formatCurrency(marketValue)}
        </span>
        {hasGainLossData ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: bgColor, border: `1px solid ${borderColor}`,
            borderRadius: 6, padding: "4px 10px", flexShrink: 0, minWidth: 100, justifyContent: "center",
          }}>
            <GainIcon style={{ width: 12, height: 12, color: textColor }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: textColor }}>
              {formatGainLoss(glValue)}
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: textColor, opacity: 0.8 }}>
              ({glPct >= 0 ? "+" : ""}{glPct.toFixed(1)}%)
            </span>
          </div>
        ) : (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: P.odT2, minWidth: 48, textAlign: "right", flexShrink: 0 }}>
            {weight.toFixed(1)}%
          </span>
        )}
        <div style={{ color: P.odT3, flexShrink: 0 }}>
          {expanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
        </div>
      </div>
      {expanded && (
        <div style={{
          padding: "0 14px 12px 30px", display: "grid",
          gridTemplateColumns: hasGainLossData ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
          gap: "8px 16px", borderTop: `1px solid ${P.odBorder2}`, paddingTop: 10, marginLeft: 4,
        }}>
          <DetailCell label="Sector" value={sector || "—"} />
          <DetailCell label="Market Value" value={formatCurrency(marketValue)} />
          {hasGainLossData && (
            <>
              <DetailCell label="Unrealized G/L" value={formatGainLoss(glValue)} color={textColor} />
              <DetailCell label="G/L %" value={`${glPct >= 0 ? "+" : ""}${glPct.toFixed(2)}%`} color={textColor} />
            </>
          )}
          {!hasGainLossData && <DetailCell label="Portfolio Weight" value={`${weight.toFixed(2)}%`} />}
        </div>
      )}
    </div>
  );
}

function DetailCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const, color: P.odT3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: 500, color: color || P.odT1 }}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  View Toggle                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function ViewToggle({ mode, onModeChange }: { mode: string; onModeChange: (m: any) => void }) {
  const modes = ["map", "cards", "table"] as const;
  const labels: Record<string, string> = { map: "Map", cards: "List", table: "Table" };
  return (
    <div style={{
      display: "flex", gap: 2, padding: 2,
      background: "rgba(255,255,255,0.04)",
      borderRadius: 6, border: `1px solid ${P.odBorder2}`,
    }}>
      {modes.map((m) => (
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
          {labels[m]}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Live Pulse CSS                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

const livePulseStyle = `
@keyframes glLivePulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 0.92; }
}
`;

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

export function GainLossHeatmap({ holdings, sourceBadge }: GainLossHeatmapProps) {
  const [viewMode, setViewMode] = useState<"map" | "cards" | "table">("map");

  const { processedData, hasGainLossData, totals } = useMemo(() => {
    const data = holdings
      .map((h, i) => {
        const mv = typeof h.marketValue === "string" ? parseFloat(h.marketValue) || 0 : h.marketValue || 0;
        const gl = typeof h.unrealizedGainLoss === "string" ? parseFloat(h.unrealizedGainLoss) || 0 : (h.unrealizedGainLoss ?? 0);
        const cb = typeof h.costBasis === "string" ? parseFloat(h.costBasis) || 0 : 0;
        const costBasis = cb > 0 ? cb : (mv - gl);
        const glPct = costBasis > 0 && gl !== 0 ? (gl / costBasis) * 100 : 0;
        return {
          ticker: h.ticker || h.name || h.description || "?",
          fullName: h.name || h.description || h.ticker || "Unknown",
          size: Math.max(mv, 1),
          marketValue: mv,
          glValue: gl,
          glPct,
          sector: h.sector || "Unknown",
          weight: typeof h.weight === "string" ? parseFloat(h.weight) || 0 : (h.weight ?? 0),
          index: i,
        };
      })
      .filter((d) => d.marketValue > 0)
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 25);

    const hasGL = data.some((d) => d.glValue !== 0);
    const totalGL = data.reduce((sum, d) => sum + d.glValue, 0);
    const totalMV = data.reduce((sum, d) => sum + d.marketValue, 0);
    const gainers = data.filter(d => d.glValue > 0).length;
    const losers = data.filter(d => d.glValue < 0).length;

    const enriched = data.map((d, i) => ({
      ...d,
      cellColor: hasGL ? glHsl(d.glPct) : WEIGHT_PALETTE[i % WEIGHT_PALETTE.length],
    }));

    return {
      processedData: enriched,
      hasGainLossData: hasGL,
      totals: { gl: totalGL, mv: totalMV, gainers, losers },
    };
  }, [holdings]);

  const chartConfig = useMemo<ChartConfig>(() => ({
    size: { label: "Market Value", color: "#185FA5" },
  }), []);

  if (!holdings || holdings.length === 0 || processedData.length === 0) return null;

  return (
    <div style={{ padding: "16px 20px" }}>
      <style>{livePulseStyle}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{
            fontFamily: "'Oswald', 'Inter', system-ui, sans-serif",
            fontSize: 14, fontWeight: 600, color: P.odT2,
            letterSpacing: ".04em", textTransform: "uppercase" as const, margin: 0,
          }}>
            Gain / Loss
          </h3>
          {sourceBadge}
        </div>
        <ViewToggle mode={viewMode} onModeChange={setViewMode} />
      </div>

      {/* Summary stats */}
      {hasGainLossData && (
        <div style={{
          display: "flex", gap: 16, marginBottom: 12,
          padding: "8px 12px", borderRadius: 6,
          background: "rgba(255,255,255,0.02)", border: `1px solid ${P.odBorder2}`,
        }}>
          <StatPill label="Total G/L" value={formatGainLoss(totals.gl)} color={totals.gl >= 0 ? "#10B981" : P.odOrange} />
          <StatPill label="Gainers" value={String(totals.gainers)} color="#10B981" />
          <StatPill label="Losers" value={String(totals.losers)} color={P.odOrange} />
          <StatPill label="Holdings" value={String(processedData.length)} color={P.odT2} />
        </div>
      )}

      {/* Legend */}
      {viewMode === "map" && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          {hasGainLossData ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif", color: P.odT3 }}>
              <span style={{ width: 48, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${P.odOrange}, hsl(220,10%,55%), hsl(152,69%,45%))` }} />
              Loss → Neutral → Gain
            </span>
          ) : (
            <span style={{ fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif", color: P.odT3 }}>
              Area = market value · Color = holding
            </span>
          )}
        </div>
      )}

      {/* Map view */}
      {viewMode === "map" && (
        <div style={{ animation: "glLivePulse 4s ease-in-out infinite" }}>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <Treemap
              data={processedData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="none"
              content={<GainLossCell />}
            >
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(val, _name, item) => {
                      const d = item?.payload;
                      if (!d) return formatCurrency(Number(val));
                      if (hasGainLossData) {
                        return `${d.fullName} · ${formatCurrency(d.marketValue)} · G/L: ${formatGainLoss(d.glValue)} (${d.glPct >= 0 ? "+" : ""}${d.glPct.toFixed(1)}%)`;
                      }
                      return `${d.fullName} · ${formatCurrency(d.marketValue)} · ${d.weight.toFixed(1)}%`;
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
          {processedData.map((d, i) => (
            <GLRow
              key={d.ticker + i}
              ticker={d.ticker} fullName={d.fullName} marketValue={d.marketValue}
              glValue={d.glValue} glPct={d.glPct} sector={d.sector} weight={d.weight}
              hasGainLossData={hasGainLossData} colorIndex={i}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <div style={{ overflow: "hidden", borderRadius: 8, border: `1px solid ${P.odBorder2}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["Ticker", "Sector", "Value", hasGainLossData ? "G/L" : "Weight", hasGainLossData ? "G/L %" : "% Port"].map((h) => (
                  <th key={h} style={{
                    textAlign: h === "Ticker" || h === "Sector" ? "left" : "right",
                    fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                    color: P.odT3, padding: "10px 14px",
                    letterSpacing: "0.04em", textTransform: "uppercase" as const,
                    borderBottom: `1px solid ${P.odBorder2}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedData.map((d, i) => (
                <tr key={d.ticker + i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: P.odT1 }}>{d.ticker}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: P.odT3 }}>{d.sector}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: P.odT2, textAlign: "right" }}>
                    {formatCurrency(d.marketValue)}
                  </td>
                  {hasGainLossData ? (
                    <>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", textAlign: "right", color: glTextColor(d.glPct) }}>
                        {formatGainLoss(d.glValue)}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", textAlign: "right", color: glTextColor(d.glPct) }}>
                        {d.glPct >= 0 ? "+" : ""}{d.glPct.toFixed(1)}%
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: P.odT2, textAlign: "right" }}>
                        {d.weight.toFixed(1)}%
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: P.odT2, textAlign: "right" }}>
                        {d.weight.toFixed(1)}%
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const, color: P.odT3 }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
