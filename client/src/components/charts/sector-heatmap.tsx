"use client";

import { useState, useMemo } from "react";
import { P } from "@/styles/tokens";

/**
 * Concentration Visualization — 3-view chart with view toggle
 *
 * Replaces the broken sparse heatmap with three rendering options:
 * A. Fixed heatmap — proper headers, brand blue color scale, hover tooltips
 * B. Ranked bars — best for sparse data, shows where the money is
 * C. Bubble matrix — compact, density-aware, SVG bubbles
 *
 * Data is real holdings from Orion, grouped by risk category × sector/ticker.
 * Props interface preserved exactly for backward compatibility.
 */

/* ── Types ─────────────────────────────────────────────────── */

export interface HoldingForHeatmap {
  sector: string;
  marketValue: number | string;
  riskCategory?: string;
  productType?: string;
  ticker?: string;
  name?: string;
  description?: string;
}

export interface SectorHeatmapProps {
  holdings: HoldingForHeatmap[];
  groupBy?: "riskCategory" | "productType";
  sourceBadge?: React.ReactNode;
}

/* ── Brand tokens ──────────────────────────────────────────── */

const C = {
  card: "#0F1D2B",
  t1: "#ECF0F5",
  t2: "#7B8FA6",
  t3: "#3D5068",
  bdr: "rgba(0,120,162,0.07)",
  bdrH: "rgba(0,120,162,0.16)",
  grid: "rgba(0,120,162,0.05)",
  eq: "#0078A2",
  fi: "#48B8D0",
  alt: "#8EB935",
  warn: "#F47D20",
  cash: "#4E5A66",
};
const F = "'Aptos','Segoe UI',system-ui,sans-serif";

/* ── Helpers ───────────────────────────────────────────────── */

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v.toFixed(0)}`;
}

function classifyType(sector: string): "eq" | "fi" | "alt" | "cash" {
  const s = (sector || "").toLowerCase();
  if (/equity|stock|cap|blend|growth|value|adr|technology|healthcare|financial|consumer|industrial|energy|foreign|emerging|diversified/i.test(s)) return "eq";
  if (/bond|muni|fixed|treasury|credit|corporate|income|government/i.test(s)) return "fi";
  if (/private|alternative|hedge|real estate|commodity|infrastructure/i.test(s)) return "alt";
  return "cash";
}

function typeColor(t: string): string {
  return ({ eq: C.eq, fi: C.fi, alt: C.alt, cash: C.cash } as any)[t] || C.cash;
}

/* ── Data processing ───────────────────────────────────────── */

interface GridCell {
  row: string;
  col: string;
  value: number;
  count: number;
  assetType: string;
}

function buildGrid(holdings: HoldingForHeatmap[], groupBy: string) {
  const gridMap = new Map<string, GridCell>();
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();

  for (const h of holdings) {
    const row = (groupBy === "riskCategory" ? h.riskCategory : h.productType) || "Other";
    const col = h.sector || "Unknown";
    const mv = typeof h.marketValue === "string" ? parseFloat(h.marketValue) || 0 : h.marketValue || 0;
    if (mv <= 0) continue;

    const key = `${row}|${col}`;
    const existing = gridMap.get(key);
    if (existing) {
      existing.value += mv;
      existing.count += 1;
    } else {
      gridMap.set(key, { row, col, value: mv, count: 1, assetType: classifyType(col) });
    }
    rowTotals.set(row, (rowTotals.get(row) || 0) + mv);
    colTotals.set(col, (colTotals.get(col) || 0) + mv);
  }

  // Top 8 rows, top 7 columns by total value
  const rows = [...rowTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r]) => r);
  const cols = [...colTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([c]) => c);

  let maxValue = 0;
  for (const cell of gridMap.values()) {
    if (rows.includes(cell.row) && cols.includes(cell.col) && cell.value > maxValue) {
      maxValue = cell.value;
    }
  }

  // Build flat ranked list for bar view
  const flat: GridCell[] = [];
  for (const cell of gridMap.values()) {
    if (rows.includes(cell.row) && cols.includes(cell.col) && cell.value > 0) {
      flat.push(cell);
    }
  }
  flat.sort((a, b) => b.value - a.value);

  return { rows, cols, gridMap, rowTotals, colTotals, maxValue, flat };
}

/* ── View A: Fixed Heatmap ─────────────────────────────────── */

function HeatmapView({
  rows, cols, gridMap, rowTotals, maxValue,
}: {
  rows: string[]; cols: string[]; gridMap: Map<string, GridCell>;
  rowTotals: Map<string, number>; maxValue: number;
}) {
  const [hov, setHov] = useState<{ r: number; c: number } | null>(null);

  const cellColor = (v: number) => {
    if (v <= 0) return C.grid;
    const alpha = 0.12 + (v / maxValue) * 0.72;
    return `rgba(0,120,162,${alpha})`;
  };

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `160px repeat(${cols.length}, 1fr)`,
          gap: 3, minWidth: 600,
        }}>
          {/* Column headers */}
          <div />
          {cols.map((col) => {
            const at = classifyType(col);
            return (
              <div key={col} style={{
                textAlign: "center", padding: "8px 4px",
                borderBottom: `2px solid ${typeColor(at)}30`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: typeColor(at) }}>
                  {col.length > 16 ? col.slice(0, 14) + "…" : col}
                </div>
              </div>
            );
          })}

          {/* Rows */}
          {rows.map((row, ri) => {
            const total = rowTotals.get(row) || 0;
            return [
              <div key={`label-${ri}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 8px 0 0", fontSize: 11, color: C.t2,
              }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{row}</span>
                <span style={{ fontSize: 10, color: C.t3, fontVariantNumeric: "tabular-nums", flexShrink: 0, marginLeft: 6 }}>
                  {total > 0 ? fmtCurrency(total) : ""}
                </span>
              </div>,
              ...cols.map((col, ci) => {
                const key = `${row}|${col}`;
                const cell = gridMap.get(key);
                const v = cell?.value ?? 0;
                const isHov = hov?.r === ri && hov?.c === ci;
                const hasValue = v > 0;

                return (
                  <div key={`${ri}-${ci}`}
                    onMouseEnter={() => setHov({ r: ri, c: ci })}
                    onMouseLeave={() => setHov(null)}
                    style={{
                      background: cellColor(v),
                      border: isHov && hasValue ? `1px solid ${C.eq}` : "1px solid transparent",
                      borderRadius: 6, padding: "12px 6px",
                      textAlign: "center", fontSize: hasValue ? 11 : 0,
                      fontWeight: 600,
                      color: hasValue ? (v / maxValue > 0.5 ? C.t1 : C.t2) : "transparent",
                      fontVariantNumeric: "tabular-nums", minHeight: 44,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: hasValue ? "pointer" : "default",
                      transition: "all 150ms cubic-bezier(.4,0,.2,1)",
                      transform: isHov && hasValue ? "scale(1.04)" : "scale(1)",
                      position: "relative",
                    }}>
                    {hasValue ? fmtCurrency(v) : ""}
                    {isHov && hasValue && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                        transform: "translateX(-50%)", whiteSpace: "nowrap",
                        background: "rgba(10,18,28,0.95)", backdropFilter: "blur(12px)",
                        border: `1px solid ${C.bdrH}`, borderRadius: 10,
                        padding: "8px 14px", fontSize: 11, fontWeight: 400,
                        color: C.t2, pointerEvents: "none", zIndex: 10,
                      }}>
                        <span style={{ color: C.t1, fontWeight: 600 }}>{col}</span>
                        <span style={{ margin: "0 4px" }}>·</span>{row}
                        <span style={{ margin: "0 4px" }}>·</span>
                        <span style={{ color: C.t1, fontWeight: 600 }}>{fmtCurrency(v)}</span>
                        {cell && cell.count > 1 && <span style={{ color: C.t3, marginLeft: 4 }}>({cell.count} positions)</span>}
                      </div>
                    )}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>
      {/* Color scale legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: C.t3 }}>Low</span>
        <div style={{
          width: 120, height: 8, borderRadius: 4,
          background: "linear-gradient(to right, rgba(0,120,162,0.12), rgba(0,120,162,0.84))",
        }} />
        <span style={{ fontSize: 10, color: C.t3 }}>High concentration</span>
      </div>
    </>
  );
}

/* ── View B: Ranked Bars ───────────────────────────────────── */

function RankedBarsView({ flat }: { flat: GridCell[] }) {
  const [hov, setHov] = useState(-1);
  const maxVal = flat[0]?.value || 1;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {flat.slice(0, 12).map((d, i) => {
          const barW = (d.value / maxVal) * 100;
          const isHov = hov === i;
          const color = typeColor(d.assetType);
          return (
            <div key={i}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}
              style={{
                display: "grid", gridTemplateColumns: "120px 1fr 60px",
                gap: 10, alignItems: "center", padding: "10px 8px",
                borderRadius: 8, cursor: "pointer",
                background: isHov ? "rgba(0,120,162,0.04)" : "transparent",
                transition: "background 100ms",
              }}>
              <div style={{ fontSize: 11, color: C.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color, marginRight: 6 }}>●</span>
                {d.col}
              </div>
              <div style={{ position: "relative", height: 8, borderRadius: 4, background: C.grid }}>
                <div style={{
                  position: "absolute", inset: "0 auto 0 0", borderRadius: 4,
                  width: `${barW}%`,
                  background: `linear-gradient(90deg, ${color}60, ${color}BB)`,
                  transition: "width 400ms cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600, color: C.t1, textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}>{fmtCurrency(d.value)}</div>
            </div>
          );
        })}
      </div>
      {/* Asset class legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.bdr}` }}>
        {[{ color: C.eq, label: "Equity" }, { color: C.fi, label: "Fixed income" }, { color: C.alt, label: "Alternatives" }].map((l, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.t2 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: l.color, opacity: 0.9 }} />{l.label}
          </span>
        ))}
      </div>
    </>
  );
}

/* ── View C: Bubble Matrix ─────────────────────────────────── */

function BubbleView({
  rows, cols, gridMap, maxValue,
}: {
  rows: string[]; cols: string[]; gridMap: Map<string, GridCell>; maxValue: number;
}) {
  const [hov, setHov] = useState<{ r: number; c: number } | null>(null);
  const maxR = 22;
  const cellW = 72;
  const cellH = 52;
  const labelW = 160;

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <svg
          width={labelW + cols.length * cellW + 20}
          height={40 + rows.length * cellH + 10}
          style={{ overflow: "visible" }}
        >
          {/* Column headers */}
          {cols.map((col, ci) => {
            const at = classifyType(col);
            return (
              <text key={col}
                x={labelW + ci * cellW + cellW / 2} y={16}
                textAnchor="middle" fill={typeColor(at)}
                fontSize={10} fontWeight={600} fontFamily={F}>
                {col.length > 12 ? col.slice(0, 10) + "…" : col}
              </text>
            );
          })}
          {/* Rows */}
          {rows.map((row, ri) => {
            const y = 40 + ri * cellH + cellH / 2;
            return (
              <g key={ri}>
                <text x={labelW - 8} y={y + 4} textAnchor="end"
                  fill={C.t2} fontSize={11} fontFamily={F}>
                  {row.length > 18 ? row.slice(0, 16) + "…" : row}
                </text>
                <line x1={labelW} y1={y} x2={labelW + cols.length * cellW} y2={y}
                  stroke={C.grid} strokeDasharray="3 3" />
                {cols.map((col, ci) => {
                  const cell = gridMap.get(`${row}|${col}`);
                  const v = cell?.value ?? 0;
                  if (v <= 0) return null;
                  const r = Math.max(4, (v / maxValue) * maxR);
                  const cx = labelW + ci * cellW + cellW / 2;
                  const isHov = hov?.r === ri && hov?.c === ci;
                  const color = typeColor(cell?.assetType || "cash");
                  return (
                    <g key={`${ri}-${ci}`}
                      onMouseEnter={() => setHov({ r: ri, c: ci })}
                      onMouseLeave={() => setHov(null)}
                      style={{ cursor: "pointer" }}>
                      <circle cx={cx} cy={y} r={isHov ? r + 3 : r}
                        fill={color} fillOpacity={isHov ? 0.7 : 0.45}
                        stroke={color} strokeWidth={isHov ? 1.5 : 0.5}
                        style={{ transition: "all 150ms cubic-bezier(.4,0,.2,1)" }} />
                      {r > 10 && (
                        <text x={cx} y={y + 4} textAnchor="middle"
                          fill="#fff" fontSize={9} fontWeight={600} fontFamily={F}
                          style={{ pointerEvents: "none" }}>
                          {fmtCurrency(v)}
                        </text>
                      )}
                      {isHov && r <= 10 && (
                        <text x={cx} y={y - r - 8} textAnchor="middle"
                          fill={C.t1} fontSize={10} fontWeight={600} fontFamily={F}>
                          {fmtCurrency(v)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        {[{ color: C.eq, label: "Equity" }, { color: C.fi, label: "Fixed income" }, { color: C.alt, label: "Alternatives" }].map((l, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.t2 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: l.color, opacity: 0.9 }} />{l.label}
          </span>
        ))}
        <span style={{ fontSize: 10, color: C.t3, marginLeft: "auto" }}>Bubble size = dollar value</span>
      </div>
    </>
  );
}

/* ── Main Component ────────────────────────────────────────── */

type ViewMode = "heatmap" | "bars" | "bubble";

export function SectorHeatmap({ holdings, groupBy = "riskCategory", sourceBadge }: SectorHeatmapProps) {
  const [view, setView] = useState<ViewMode>("bars"); // Default to bars — best for sparse data

  const { rows, cols, gridMap, rowTotals, maxValue, flat } = useMemo(
    () => buildGrid(holdings, groupBy),
    [holdings, groupBy],
  );

  if (!holdings || holdings.length === 0) return null;
  if (flat.length === 0) return null;

  const groupByLabel = groupBy === "riskCategory" ? "Risk category" : "Product type";

  return (
    <div style={{
      background: C.card, borderRadius: 16,
      border: `1px solid ${C.bdr}`, padding: "24px 28px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, letterSpacing: -0.2 }}>
          Concentration
        </div>
        {sourceBadge}
      </div>
      <div style={{ fontSize: 12, color: C.t3, marginBottom: 20 }}>
        {view === "heatmap" && `${groupByLabel} × sector · cell brightness = dollar concentration`}
        {view === "bars" && `Ranked by dollar value · ${groupByLabel.toLowerCase()} × sector`}
        {view === "bubble" && `Bubble size = dollar value · color = asset class`}
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {([
          { id: "bars" as ViewMode, label: "Ranked" },
          { id: "heatmap" as ViewMode, label: "Heatmap" },
          { id: "bubble" as ViewMode, label: "Bubble" },
        ]).map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            fontFamily: F, fontSize: 11, fontWeight: 500, padding: "6px 14px",
            borderRadius: 6, border: "none", cursor: "pointer",
            background: view === t.id ? "rgba(0,120,162,0.15)" : "transparent",
            color: view === t.id ? C.eq : C.t3, transition: "all 120ms",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Views */}
      {view === "heatmap" && (
        <HeatmapView rows={rows} cols={cols} gridMap={gridMap} rowTotals={rowTotals} maxValue={maxValue} />
      )}
      {view === "bars" && (
        <RankedBarsView flat={flat} />
      )}
      {view === "bubble" && (
        <BubbleView rows={rows} cols={cols} gridMap={gridMap} maxValue={maxValue} />
      )}
    </div>
  );
}
