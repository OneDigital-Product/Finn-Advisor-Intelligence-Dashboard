import { useMemo, useState } from "react";
import { PieChart, Pie, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SunburstProps {
  allocationBreakdown: { name: string; value: number; pct?: number }[];
  sectorExposure: {
    name: string;
    count: number;
    value: number;
    pct: number;
  }[];
  topHoldingsByValue: {
    ticker: string;
    name: string;
    marketValue: number;
    weight: number;
    sector: string;
  }[];
  sourceBadge?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Design                                                             */
/* ------------------------------------------------------------------ */

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444",
  "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#A855F7",
  "#84CC16", "#6366F1", "#22D3EE", "#FB923C", "#E879F9",
  "#78716C",
] as const;

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtFull(v: number): string {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type ViewMode = "donut" | "bar" | "table";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AllocationSunburst({
  allocationBreakdown,
  sectorExposure,
  topHoldingsByValue,
  sourceBadge,
}: SunburstProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("donut");
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    allocationBreakdown.forEach((item, i) => {
      cfg[`asset-${i}`] = { label: item.name, color: COLORS[i % COLORS.length] };
    });
    return cfg;
  }, [allocationBreakdown]);

  // Map asset class names → holdings for the detail drill-down
  const holdingsByClass = useMemo(() => {
    const map: Record<string, typeof topHoldingsByValue> = {};
    for (const h of topHoldingsByValue) {
      const key = h.sector || "Other";
      if (!map[key]) map[key] = [];
      map[key].push(h);
    }
    return map;
  }, [topHoldingsByValue]);

  if (!allocationBreakdown || allocationBreakdown.length === 0) return null;

  const data = allocationBreakdown.filter(d => d.value > 0);
  const total = data.reduce((s, a) => s + a.value, 0);

  const tabs: { id: ViewMode; label: string }[] = [
    { id: "donut", label: "Donut" },
    { id: "bar", label: "Bar" },
    { id: "table", label: "Table" },
  ];

  const handleSliceClick = (i: number) => {
    setSelected(selected === i ? null : i);
  };

  // Find holdings matching the selected asset class
  const selectedClass = selected !== null ? data[selected] : null;
  const selectedHoldings = selectedClass
    ? (holdingsByClass[selectedClass.name] || []).sort((a, b) => b.marketValue - a.marketValue)
    : [];

  // Active highlight index = selected (sticky) or hovered (transient)
  const activeIdx = selected ?? hovered;

  return (
    <div style={{ padding: "20px 24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 15, fontWeight: 600, color: "#F9FAFB",
            letterSpacing: "-0.01em", margin: 0,
          }}>Asset Allocation</h3>
          {sourceBadge}
        </div>
        <div style={{
          display: "flex", gap: 2, padding: 2,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setViewMode(t.id); setSelected(null); }}
              style={{
                padding: "5px 12px", fontSize: 11,
                fontWeight: viewMode === t.id ? 600 : 400,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: viewMode === t.id ? "#F9FAFB" : "#6B7280",
                background: viewMode === t.id ? "rgba(59,130,246,0.15)" : "transparent",
                border: "none", borderRadius: 6, cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── DONUT VIEW ── */}
      {viewMode === "donut" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "start" }}>
            {/* Donut chart */}
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val) => {
                        const v = Number(val);
                        const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0.0";
                        return `${fmt(v)} (${pct}%)`;
                      }}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  stroke="#0F1219" strokeWidth={3}
                  paddingAngle={2}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={`c-${i}`}
                      fill={COLORS[i % COLORS.length]}
                      opacity={activeIdx === null || activeIdx === i ? 1 : 0.25}
                      style={{ transition: "opacity 0.2s ease", cursor: "pointer" }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => handleSliceClick(i)}
                    />
                  ))}
                </Pie>
                {/* Center stat — shows selected class or total */}
                <text
                  x="50%" y="44%"
                  textAnchor="middle" dominantBaseline="central"
                  fill="#F9FAFB" fontSize={selectedClass ? 16 : 20} fontWeight={700}
                  fontFamily="'Inter', system-ui, sans-serif"
                >
                  {selectedClass ? fmt(selectedClass.value) : fmt(total)}
                </text>
                <text
                  x="50%" y="55%"
                  textAnchor="middle" dominantBaseline="central"
                  fill="#6B7280" fontSize={9}
                  fontFamily="'Inter', system-ui, sans-serif"
                  letterSpacing="0.06em"
                >
                  {selectedClass ? selectedClass.name.toUpperCase() : "TOTAL AUM"}
                </text>
              </PieChart>
            </ChartContainer>

            {/* Legend panel — 2-column grid to cut vertical space in half */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "1px 12px",
              paddingTop: 4,
            }}>
              {data.map((item, i) => {
                const pct = item.pct ?? (total > 0 ? (item.value / total) * 100 : 0);
                const isActive = activeIdx === i;
                const isSelected = selected === i;
                const matchingHoldings = holdingsByClass[item.name] || [];
                return (
                  <div
                    key={item.name}
                    onClick={() => handleSliceClick(i)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 8px",
                      borderRadius: 6,
                      background: isSelected
                        ? "rgba(59,130,246,0.08)"
                        : isActive
                          ? "rgba(255,255,255,0.03)"
                          : "transparent",
                      border: isSelected
                        ? `1px solid ${COLORS[i % COLORS.length]}40`
                        : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      minWidth: 0,
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                      background: COLORS[i % COLORS.length],
                    }} />
                    <span style={{
                      flex: 1, fontSize: 11.5, fontWeight: 500, color: "#E5E7EB",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      minWidth: 0,
                    }}>
                      {item.name}
                    </span>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600,
                      fontFamily: "'DM Mono', monospace",
                      color: "#F9FAFB", flexShrink: 0,
                    }}>
                      {pct.toFixed(1)}%
                    </span>
                    <span style={{
                      fontSize: 11, fontFamily: "'DM Mono', monospace",
                      color: "#6B7280", flexShrink: 0,
                    }}>
                      {fmt(item.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── DETAIL PANEL (when asset class is selected) ── */}
          {selectedClass && (
            <div style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${COLORS[selected! % COLORS.length]}30`,
            }}>
              {/* Detail header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: 3,
                    background: COLORS[selected! % COLORS.length],
                  }} />
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: "#F9FAFB",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}>
                    {selectedClass.name}
                  </span>
                  <span style={{
                    fontSize: 12, color: "#6B7280",
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    {fmtFull(selectedClass.value)}
                  </span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    padding: "4px 10px", fontSize: 10, fontWeight: 500,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: "#9CA3AF", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>

              {selectedHoldings.length > 0 ? (
                <div style={{ overflow: "hidden", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                        {["Ticker", "Name", "Value", "Weight"].map((h) => (
                          <th key={h} style={{
                            textAlign: h === "Ticker" || h === "Name" ? "left" : "right",
                            fontSize: 10, fontWeight: 600,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            color: "#6B7280", padding: "8px 12px",
                            letterSpacing: "0.04em", textTransform: "uppercase",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedHoldings.map((h, hi) => (
                        <tr key={h.ticker + hi} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{
                            padding: "8px 12px", fontSize: 13, fontWeight: 600,
                            color: "#F9FAFB", fontFamily: "'DM Mono', monospace",
                            whiteSpace: "nowrap",
                          }}>
                            {h.ticker}
                          </td>
                          <td style={{
                            padding: "8px 12px", fontSize: 12, color: "#9CA3AF",
                            maxWidth: 200, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {h.name}
                          </td>
                          <td style={{
                            padding: "8px 12px", fontSize: 13, fontWeight: 600,
                            fontFamily: "'DM Mono', monospace", color: "#E5E7EB",
                            textAlign: "right",
                          }}>
                            {fmt(h.marketValue)}
                          </td>
                          <td style={{
                            padding: "8px 12px", fontSize: 13,
                            fontFamily: "'DM Mono', monospace", color: "#E5E7EB",
                            textAlign: "right",
                          }}>
                            {h.weight.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  padding: "20px 16px", textAlign: "center",
                  fontSize: 12, color: "#6B7280",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  No individual holdings data available for this asset class.
                  <br />
                  <span style={{ fontSize: 11, color: "#4B5563" }}>
                    Holdings are matched by sector — this class may use a different grouping.
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── BAR VIEW ── */}
      {viewMode === "bar" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "4px 16px",
          padding: "4px 0",
        }}>
          {data.map((item, i) => {
            const pct = item.pct ?? (total > 0 ? (item.value / total) * 100 : 0);
            const isHov = hovered === i;
            return (
              <div
                key={item.name}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 48px 56px",
                  gap: 8, alignItems: "center",
                  padding: "5px 8px", borderRadius: 6,
                  background: isHov ? "rgba(255,255,255,0.03)" : "transparent",
                  cursor: "default", transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: COLORS[i % COLORS.length] }} />
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: "#D1D5DB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#F9FAFB", textAlign: "right" }}>
                  {pct.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#6B7280", textAlign: "right" }}>
                  {fmt(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div style={{ overflow: "hidden", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["Asset Class", "Value", "Weight", ""].map((h, hi) => (
                  <th key={h || hi} style={{
                    textAlign: hi === 0 ? "left" : "right",
                    fontSize: 10, fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: "#6B7280", padding: "10px 14px",
                    letterSpacing: "0.04em", textTransform: "uppercase",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => {
                const pct = item.pct ?? (total > 0 ? (item.value / total) * 100 : 0);
                const isHov = hovered === i;
                return (
                  <tr
                    key={item.name}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: isHov ? "rgba(255,255,255,0.03)" : "transparent",
                      transition: "background 0.15s ease", cursor: "default",
                    }}
                  >
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#E5E7EB", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: COLORS[i % COLORS.length] }} />
                        {item.name}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#F9FAFB", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {fmt(item.value)}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#F9FAFB", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: "10px 14px", width: 80, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ height: 6, borderRadius: 3, width: "100%", background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, borderRadius: 3, background: COLORS[i % COLORS.length], opacity: 0.8 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
