/**
 * Portfolio Data Panels — Risk Distribution · Top Holdings · Product Type
 *
 * Three-panel grid matching OneDigital master visualization spec (dark mode):
 *   Equity #0078A2, FI #48B8D0, Alt #8EB935, Warn #F47D20, Cash #4E5A66.
 *   NO red anywhere — orange for warnings/alerts.
 *
 * Risk Distribution: grouped by asset class with expand/collapse, proportional bars.
 * Top Holdings: ticker badges colored by asset class, proportional weight bars.
 * Product Type: Hand-crafted SVG donut with interactive linked legend.
 */
import { useState, useMemo, type ReactNode } from "react";
import { P } from "@/styles/tokens";

/* ═══════════════════════════════════════════════════════════════════ */
/*  Design Tokens — master spec dark mode                             */
/* ═══════════════════════════════════════════════════════════════════ */

/** Data-semantic palette from the chart-system-complete spec */
const DS = {
  equity: "#0078A2",
  fi: "#48B8D0",
  alt: "#8EB935",
  warn: "#F47D20",
  cash: "#4E5A66",
} as const;

const C = {
  // Use P tokens for generic background / text where they exist
  bg: P.odBg,            // #0d1117
  surface: P.odSurf,     // #161b27
  card: "#0F1D2B",       // spec card bg (differs from P.odSurf2)
  textP: P.odT1,         // #f0f2f5
  textS: P.odT2,         // #C7D0DD
  textT: P.odT3,         // #94A3B8

  border: "rgba(0,120,162,0.07)",
  borderHover: "rgba(0,120,162,0.16)",
  grid: "rgba(0,120,162,0.05)",
  hoverRow: "rgba(0,120,162,0.04)",

  // Data-semantic colors (hard hex from spec — different from P.od* chart ramp)
  equity: DS.equity,
  fi: DS.fi,
  alt: DS.alt,
  warn: DS.warn,
  cash: DS.cash,

  // 15% opacity backgrounds for badges
  equityBg: "rgba(0,120,162,0.15)",
  fiBg: "rgba(72,184,208,0.15)",
  altBg: "rgba(142,185,53,0.15)",
  warnBg: "rgba(244,125,32,0.15)",
  cashBg: "rgba(78,90,102,0.15)",

  font: "'Aptos','Segoe UI',system-ui,sans-serif",
} as const;

/* ═══════════════════════════════════════════════════════════════════ */
/*  Asset-Class Classification                                        */
/* ═══════════════════════════════════════════════════════════════════ */

const EQUITY_KEYWORDS = [
  "large cap", "large blend", "large growth", "large value",
  "mid cap", "mid blend", "small cap", "small blend", "small growth", "small value",
  "equity", "stock", "common stock", "adr", "technology", "healthcare",
  "financial", "consumer", "industrial", "energy", "materials",
  "international", "foreign", "emerging", "diversified em",
  "us large", "us small", "us mid",
];

const FI_KEYWORDS = [
  "bond", "fixed income", "muni", "corporate bond", "treasury",
  "high yield", "core", "interm", "intermediate", "govt",
  "credit", "mortgage", "tips", "inflation",
  "private debt",
];

const ALT_KEYWORDS = [
  "alternative", "private equity", "real estate", "reit",
  "limited partnership", "annuity", "variable annuity",
  "real assets", "hedge", "commodity", "infrastructure",
  "prime money market",
];

type AssetClass = "equity" | "fi" | "alt" | "other";

function classifyAssetClass(name: string): AssetClass {
  const lower = name.toLowerCase();
  if (EQUITY_KEYWORDS.some(kw => lower.includes(kw))) return "equity";
  if (FI_KEYWORDS.some(kw => lower.includes(kw))) return "fi";
  if (ALT_KEYWORDS.some(kw => lower.includes(kw))) return "alt";
  return "other";
}

function classifyHoldingSector(sector: string): AssetClass {
  const lower = sector.toLowerCase();
  if (FI_KEYWORDS.some(kw => lower.includes(kw))) return "fi";
  if (ALT_KEYWORDS.some(kw => lower.includes(kw))) return "alt";
  if (lower.includes("cash") || lower.includes("money market")) return "other";
  return "equity"; // default for stock sectors
}

const assetColor = (ac: AssetClass): string =>
  ({ equity: C.equity, fi: C.fi, alt: C.alt, other: C.cash }[ac]);

const assetBg = (ac: AssetClass): string =>
  ({ equity: C.equityBg, fi: C.fiBg, alt: C.altBg, other: C.cashBg }[ac]);

const assetLabel = (ac: AssetClass): string =>
  ({ equity: "Equity", fi: "Fixed Income", alt: "Alternatives", other: "Other" }[ac]);

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helpers                                                            */
/* ═══════════════════════════════════════════════════════════════════ */

function fmt(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Card Shell (spec: bg #0F1D2B, border-radius 16, border 1px)      */
/* ═══════════════════════════════════════════════════════════════════ */

function PanelCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: "24px 28px",
        fontFamily: C.font,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Hdr({ title, sub, badge }: { title: string; sub?: string; badge?: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.textP }}>{title}</span>
        {badge}
      </div>
      {sub && (
        <span style={{ fontSize: 11, color: C.textT, marginTop: 2, display: "block" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Risk Distribution — Grouped Horizontal Bar Clusters               */
/* ═══════════════════════════════════════════════════════════════════ */

interface RiskItem {
  name: string;
  count: number;
  value: number;
  pct: number;
}

interface RiskCluster {
  name: string;
  ac: AssetClass;
  color: string;
  total: number;
  items: { label: string; pct: number }[];
}

function buildClusters(data: RiskItem[]): RiskCluster[] {
  const groups: Record<AssetClass, { label: string; pct: number }[]> = {
    equity: [], fi: [], alt: [], other: [],
  };

  for (const item of data) {
    if (item.pct < 0.05) continue;
    const ac = classifyAssetClass(item.name);
    groups[ac].push({ label: item.name, pct: item.pct });
  }

  const order: AssetClass[] = ["equity", "fi", "alt", "other"];
  return order
    .filter(ac => groups[ac].length > 0)
    .map(ac => ({
      name: assetLabel(ac),
      ac,
      color: assetColor(ac),
      total: parseFloat(groups[ac].reduce((s, i) => s + i.pct, 0).toFixed(1)),
      items: groups[ac].sort((a, b) => b.pct - a.pct),
    }));
}

function RiskClusterPanel({
  cluster,
  startOpen,
}: {
  cluster: RiskCluster;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [hovIdx, setHovIdx] = useState(-1);
  const vis = open ? cluster.items : cluster.items.slice(0, 3);
  const top = cluster.items[0]?.pct || 1;
  const more = cluster.items.length > 3;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Cluster header: colored bar + name + total % */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 3, height: 16, borderRadius: 2, background: cluster.color,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textP }}>
            {cluster.name}
          </span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700, color: cluster.color,
          fontVariantNumeric: "tabular-nums",
        }}>
          {cluster.total}%
        </span>
      </div>

      {/* Items — horizontal bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 11 }}>
        {vis.map((item, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(-1)}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 56px 40px",
              gap: 8,
              alignItems: "center",
              padding: "4px 6px",
              borderRadius: 8,
              background: hovIdx === i ? C.hoverRow : "transparent",
              cursor: "pointer",
              transition: "background 150ms",
            }}
          >
            {/* Category name */}
            <span style={{
              fontSize: 11, color: C.textS,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {item.label}
            </span>

            {/* Proportional bar: 12px height, 5px top-right radius */}
            <div style={{
              height: 12, borderRadius: "0 5px 5px 0",
              background: C.grid, position: "relative",
            }}>
              <div style={{
                position: "absolute", inset: "0 auto 0 0",
                borderRadius: "0 5px 5px 0",
                width: `${(item.pct / top) * 100}%`,
                background: cluster.color,
                opacity: 0.75,
              }} />
            </div>

            {/* Percentage label */}
            <span style={{
              fontSize: 11, color: C.textT, textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>
              {item.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Expand / collapse button */}
      {more && (
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 10, color: C.equity, padding: "6px 0 0 11px",
            display: "flex", alignItems: "center", gap: 3,
            fontFamily: "inherit",
          }}
        >
          {open ? "Less" : `All ${cluster.items.length}`}
          <svg
            width="8" height="8" viewBox="0 0 8 8" fill="none"
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 150ms",
            }}
          >
            <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function RiskDistributionPanel({
  data,
  badge,
}: {
  data: RiskItem[];
  badge?: ReactNode;
}) {
  const clusters = useMemo(() => buildClusters(data), [data]);
  const totalCategories = clusters.reduce((s, c) => s + c.items.length, 0);

  return (
    <PanelCard>
      <Hdr title="Risk Distribution" sub={`${totalCategories} categories`} badge={badge} />
      <div style={{ maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
        {clusters.map((c, i) => (
          <RiskClusterPanel key={c.ac} cluster={c} startOpen={i === 0} />
        ))}
      </div>
    </PanelCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Top Holdings — Table with Ticker Badges + Proportion Bars         */
/* ═══════════════════════════════════════════════════════════════════ */

function HoldingRow({
  h,
  maxWeight,
}: {
  h: { ticker: string; name: string; marketValue: number; weight: number; sector: string };
  maxWeight: number;
}) {
  const [hov, setHov] = useState(false);
  const ac = classifyHoldingSector(h.sector);
  const color = assetColor(ac);
  const bg = assetBg(ac);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr 76px 60px",
        gap: 8,
        alignItems: "center",
        padding: "8px 6px",
        borderRadius: 8,
        background: hov ? C.hoverRow : "transparent",
        cursor: "pointer",
        transition: "background 150ms",
      }}
    >
      {/* Ticker badge: 10px weight 700, colored bg at 15% */}
      <div style={{
        fontSize: 10, fontWeight: 700, color,
        background: bg,
        padding: "4px 0", textAlign: "center", borderRadius: 6,
        letterSpacing: 0.3,
      }}>
        {h.ticker || "\u2014"}
      </div>

      {/* Category name */}
      <span style={{
        fontSize: 12, color: C.textS,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {h.name || h.sector}
      </span>

      {/* Proportion bar: 4px height, colored at 50% opacity on grid track */}
      <div style={{
        height: 4, borderRadius: 2,
        background: C.grid, position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: "0 auto 0 0", borderRadius: 2,
          width: `${maxWeight > 0 ? (h.weight / maxWeight) * 100 : 0}%`,
          background: color, opacity: 0.5,
        }} />
      </div>

      {/* Value + percentage */}
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: C.textP,
          fontVariantNumeric: "tabular-nums",
        }}>
          {fmt(h.marketValue)}
        </div>
        <div style={{
          fontSize: 10, color: C.textT,
          fontVariantNumeric: "tabular-nums",
        }}>
          {h.weight.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function TopHoldingsPanel({
  data,
  badge,
}: {
  data: { ticker: string; name: string; marketValue: number; weight: number; sector: string }[];
  badge?: ReactNode;
}) {
  const display = data.slice(0, 10);
  const maxWeight = Math.max(...display.map(h => h.weight));
  const totalPct = display.reduce((s, h) => s + h.weight, 0);

  return (
    <PanelCard>
      <Hdr
        title="Top Holdings"
        sub={`${totalPct.toFixed(1)}% of portfolio`}
        badge={badge}
      />
      <div>
        {display.map((h, i) => (
          <HoldingRow key={h.ticker || i} h={h} maxWeight={maxWeight} />
        ))}
      </div>
    </PanelCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Product Type — Hand-Crafted SVG Donut with Linked Legend           */
/* ═══════════════════════════════════════════════════════════════════ */

interface ProductItem {
  name: string;
  count: number;
  value: number;
  pct: number;
}

const PRODUCT_COLORS: Record<string, string> = {
  "stock/etf": C.equity,
  "stock / etf": C.equity,
  etf: C.equity,
  stock: C.equity,
  equity: C.equity,
  "mutual fund": C.alt,
  bond: C.fi,
  "fixed income": C.fi,
  annuity: C.warn,
  other: C.warn,
  cd: C.cash,
  cash: C.cash,
  "money market": C.cash,
};

const FALLBACK_PALETTE = [C.equity, C.fi, C.alt, C.warn, C.cash, "#7F77DD"];

function getProductColor(name: string, index: number): string {
  const lower = name.toLowerCase();
  if (PRODUCT_COLORS[lower]) return PRODUCT_COLORS[lower];
  for (const [key, val] of Object.entries(PRODUCT_COLORS)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

/**
 * Hand-crafted SVG donut (NO Recharts PieChart).
 * - Arc paths with gap between segments (0.035 rad)
 * - Active segment expands (outer +5, inner -2)
 * - Opacity: active 0.88, others dim to 0.18
 * - 200ms cubic-bezier(.4,0,.2,1) transitions
 */
function SvgDonut({
  data,
  active,
  onHover,
  size = 172,
}: {
  data: { label: string; pct: number; color: string }[];
  active: number;
  onHover: (i: number) => void;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 8;
  const ir = R * 0.62;
  const gap = 0.035;
  const minVis = 2.5;

  const segs = useMemo(() => {
    const adj = data.map(d => ({ ...d, v: Math.max(d.pct, minVis) }));
    const tot = adj.reduce((s, d) => s + d.v, 0);
    let angle = -Math.PI / 2;

    return adj.map((d, i) => {
      const sweep = (d.v / tot) * (Math.PI * 2 - gap * data.length);
      const s = angle + gap / 2;
      const e = angle + sweep - gap / 2;
      angle += sweep + gap;

      const isActive = active === i;
      const outerR = isActive ? R + 5 : R;
      const innerR = isActive ? ir - 2 : ir;
      const largeArc = (e - s) > Math.PI ? 1 : 0;

      return {
        d: [
          `M${cx + outerR * Math.cos(s)} ${cy + outerR * Math.sin(s)}`,
          `A${outerR} ${outerR} 0 ${largeArc} 1 ${cx + outerR * Math.cos(e)} ${cy + outerR * Math.sin(e)}`,
          `L${cx + innerR * Math.cos(e)} ${cy + innerR * Math.sin(e)}`,
          `A${innerR} ${innerR} 0 ${largeArc} 0 ${cx + innerR * Math.cos(s)} ${cy + innerR * Math.sin(s)}`,
          "Z",
        ].join(" "),
        color: d.color,
        i,
      };
    });
  }, [data, active, size, cx, cy, R, ir]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    >
      {segs.map(s => (
        <path
          key={s.i}
          d={s.d}
          fill={s.color}
          opacity={active >= 0 && active !== s.i ? 0.18 : 0.88}
          style={{
            transition: "opacity 200ms cubic-bezier(.4,0,.2,1), d 200ms cubic-bezier(.4,0,.2,1)",
            cursor: "pointer",
          }}
          onMouseEnter={() => onHover(s.i)}
          onMouseLeave={() => onHover(-1)}
        />
      ))}
    </svg>
  );
}

function ProductTypePanel({
  data,
  badge,
}: {
  data: ProductItem[];
  badge?: ReactNode;
}) {
  const [active, setActive] = useState(-1);

  const enriched = useMemo(() =>
    data.map((d, i) => ({
      ...d,
      color: getProductColor(d.name, i),
    })),
    [data],
  );

  const totalPos = enriched.reduce((s, d) => s + d.count, 0);

  return (
    <PanelCard>
      <Hdr
        title="Product Type"
        sub={`${totalPos.toLocaleString()} positions`}
        badge={badge}
      />
      <div style={{
        display: "flex",
        flexDirection: "row",
        gap: 32,
        alignItems: "center",
      }}>
        {/* SVG Donut — 172px, on the left */}
        <div style={{
          position: "relative", width: 172, height: 172, flexShrink: 0,
        }}>
          <SvgDonut
            data={enriched.map(d => ({ label: d.name, pct: d.pct, color: d.color }))}
            active={active}
            onHover={setActive}
            size={172}
          />
          {/* Center label */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            textAlign: "center", pointerEvents: "none",
            transition: "opacity 200ms cubic-bezier(.4,0,.2,1)",
          }}>
            {active >= 0 ? (
              <>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: C.textP,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {enriched[active].pct.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: 10, color: C.textS, marginTop: 2,
                  maxWidth: 76, lineHeight: 1.2,
                }}>
                  {enriched[active].name}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: C.textP,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {totalPos.toLocaleString()}
                </div>
                <div style={{
                  fontSize: 9, color: C.textT,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  Total
                </div>
              </>
            )}
          </div>
        </div>

        {/* Linked Legend — right side */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {enriched.map((p, i) => (
            <div
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(-1)}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: 12,
                alignItems: "center",
                padding: "7px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: active === i ? C.hoverRow : "transparent",
                opacity: active >= 0 && active !== i ? 0.35 : 1,
                transition: "all 200ms cubic-bezier(.4,0,.2,1)",
              }}
            >
              {/* Color dot + label */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: p.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, color: C.textP, fontWeight: 500 }}>
                  {p.name}
                </span>
              </div>

              {/* Spacer / fill (grid handles this) */}
              <div />

              {/* Percentage */}
              <span style={{
                fontSize: 13, fontWeight: 600, color: C.textP,
                fontVariantNumeric: "tabular-nums", textAlign: "right",
              }}>
                {p.pct.toFixed(1)}%
              </span>

              {/* Position count */}
              <span style={{
                fontSize: 10, color: C.textT,
                textAlign: "right", fontVariantNumeric: "tabular-nums",
                minWidth: 40,
              }}>
                {p.count} pos
              </span>
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Exported Composite                                                 */
/* ═══════════════════════════════════════════════════════════════════ */

interface PortfolioDataPanelsProps {
  riskDistribution?: { name: string; count: number; value: number; pct: number }[];
  topHoldingsByValue?: { ticker: string; name: string; marketValue: number; weight: number; sector: string }[];
  sectorExposure?: { name: string; count: number; value: number; pct: number }[];
  sourceBadge?: ReactNode;
}

export function PortfolioDataPanels({
  riskDistribution,
  topHoldingsByValue,
  sectorExposure,
  sourceBadge,
}: PortfolioDataPanelsProps) {
  const hasRisk = riskDistribution && riskDistribution.length > 0;
  const hasHoldings = topHoldingsByValue && topHoldingsByValue.length > 0;
  const hasProducts = sectorExposure && sectorExposure.length > 0;

  if (!hasRisk && !hasHoldings && !hasProducts) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Row 1: Risk Distribution (narrow) + Top Holdings (wide) */}
      {(hasRisk || hasHoldings) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: hasRisk && hasHoldings ? "minmax(240px, 1fr) minmax(320px, 1.6fr)" : "1fr",
          gap: 16,
          alignItems: "start",
        }}>
          {hasRisk && (
            <RiskDistributionPanel data={riskDistribution} badge={sourceBadge} />
          )}
          {hasHoldings && (
            <TopHoldingsPanel data={topHoldingsByValue} badge={sourceBadge} />
          )}
        </div>
      )}

      {/* Row 2: Product Type — full width, horizontal layout */}
      {hasProducts && (
        <ProductTypePanel data={sectorExposure} badge={sourceBadge} />
      )}
    </div>
  );
}
