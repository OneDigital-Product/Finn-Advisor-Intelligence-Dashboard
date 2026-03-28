import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, Users, X, Zap, ChevronRight, ChevronLeft, Filter, Building2, ChevronDown, ExternalLink, Bot, AlertTriangle } from "lucide-react";
// P import removed — OD palette now uses CSS custom properties via Token Bridge
import { Serif, Mono } from "@/components/design/typography";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";

// ---------------------------------------------------------------------------
// OD Dark palette — CSS custom property bridge (Token Bridge pattern)
// ---------------------------------------------------------------------------
const OD = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  surface2: "var(--color-surface-raised)",
  surface3: "var(--color-surface-overlay)",
  border: "var(--color-border)",
  border2: "var(--color-border-subtle)",
  t1: "var(--color-text-primary)",
  t2: "var(--color-text-secondary)",
  t3: "var(--color-text-tertiary)",
  t4: "var(--color-text-muted)",
  blue: "var(--color-brand-primary)",
  lblue: "var(--color-brand-secondary)",
  green: "var(--color-success)",
  lgreen: "var(--color-success-light)",
  orange: "var(--color-orange)",
  yellow: "var(--color-warning)",
  deep: "var(--color-brand-deep)",
  eq: "var(--color-chart-equity)",
  fi: "var(--color-chart-fi)",
  alt: "var(--color-chart-alt)",
  ca: "var(--color-chart-cash)",
} as const;

const tierColors: Record<string, { bg: string; text: string }> = {
  A: { bg: "rgba(79,179,205,0.1)", text: OD.lblue },
  B: { bg: "rgba(79,179,205,0.1)", text: OD.lblue },
  C: { bg: "rgba(79,179,205,0.1)", text: OD.lblue },
  "1": { bg: "rgba(79,179,205,0.1)", text: OD.lblue },
  "2": { bg: "rgba(79,179,205,0.1)", text: OD.lblue },
  "3": { bg: "rgba(79,179,205,0.1)", text: OD.lblue },
};

const riskLabels: Record<string, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
  "moderately conservative": "Mod. Conservative",
  "moderately aggressive": "Mod. Aggressive",
};

type SortKey = "aum" | "name" | "ret";
type SubTab = "all" | "households" | "businesses" | "team";

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------
const avatarPairs: [string, string][] = [
  ["rgba(59,139,212,0.25)", "#3B8BD4"],
  ["rgba(29,158,117,0.25)", "#1D9E75"],
  ["rgba(127,119,221,0.25)", "#7F77DD"],
  ["rgba(239,159,39,0.25)", "#EF9F27"],
  ["rgba(79,179,205,0.2)", "#4FB3CD"],
  ["rgba(244,125,32,0.2)", "#F47D20"],
  ["rgba(142,185,53,0.2)", "#8EB935"],
];

function getAvatarColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return avatarPairs[Math.abs(h) % avatarPairs.length];
}

function initials(name: string): string {
  const parts = name.replace(/ &/, "").split(/[ ,]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0]?.toUpperCase() || "?";
}

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------
function SrcBadge({ type, children }: { type: "sf" | "or"; children: string }) {
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: ".08em",
        padding: "0px 3px",
        borderRadius: 2,
        textTransform: "uppercase" as const,
        lineHeight: "14px",
        color: type === "sf" ? OD.lblue : OD.green,
        background: type === "sf" ? "rgba(79,179,205,0.1)" : "rgba(142,185,53,0.1)",
        border: `1px solid ${type === "sf" ? "rgba(79,179,205,0.2)" : "rgba(142,185,53,0.2)"}`,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Allocation bar
// ---------------------------------------------------------------------------
function AllocationBar({ eq, fi, alt, ca, size = "sm" }: { eq: number; fi: number; alt: number; ca: number; size?: "sm" | "lg" }) {
  const h = size === "lg" ? 8 : 5;
  return (
    <div>
      <div style={{ display: "flex", height: h, gap: 1, borderRadius: h / 2, overflow: "hidden", marginBottom: 4 }}>
        {eq > 0 && <div style={{ width: `${eq}%`, background: OD.eq }} />}
        {fi > 0 && <div style={{ width: `${fi}%`, background: OD.fi }} />}
        {alt > 0 && <div style={{ width: `${alt}%`, background: OD.alt }} />}
        {ca > 0 && <div style={{ width: `${ca}%`, background: OD.ca }} />}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
        {[
          { label: "EQ", pct: eq, color: OD.eq },
          { label: "FI", pct: fi, color: OD.fi },
          { label: "ALT", pct: alt, color: OD.alt },
          { label: "CA", pct: ca, color: OD.ca },
        ].map(s => s.pct > 0 && (
          <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: OD.t4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
            {s.pct}%{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Snapshot generator
// ---------------------------------------------------------------------------
function generateSnapshot(preview: any, client: any): string {
  const parts: string[] = [];
  const alloc = preview?.allocation;
  if (alloc) {
    if (alloc.EQ > 60) parts.push(`Equity-heavy at ${alloc.EQ}%`);
    else if (alloc.FI > 40) parts.push(`Conservative with ${alloc.FI}% fixed income`);
    else parts.push("Balanced allocation across asset classes");
  }
  if (preview?.accounts?.count) {
    parts.push(`${preview.accounts.count} accounts${preview.accounts.primaryCustodian ? ` at ${preview.accounts.primaryCustodian}` : ""}`);
  }
  if (preview?.members?.count) {
    parts.push(`${preview.members.count} household member${preview.members.count > 1 ? "s" : ""}`);
  }
  if (preview?.holdings?.cashPosition?.percentage > 10) {
    parts.push(`High cash position (${preview.holdings.cashPosition.percentage}%) — consider deployment`);
  }
  if (client.complianceCases > 0) {
    parts.push(`${client.complianceCases} open compliance case${client.complianceCases > 1 ? "s" : ""} — requires attention`);
  } else {
    parts.push("No open compliance items");
  }
  if (preview?.holdings?.topHolding) {
    const totalAum = client.totalAum || 1;
    const pct = Math.round((preview.holdings.topHolding.value / totalAum) * 100);
    if (pct > 15) {
      parts.push(`Concentrated position in ${preview.holdings.topHolding.ticker} (${pct}%) — review diversification`);
    }
  }
  return parts.join(". ") + ".";
}

// ---------------------------------------------------------------------------
// Sparkline (canvas)
// ---------------------------------------------------------------------------
function Sparkline({ value, width = 80, height = 28 }: { value: number; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);

  useEffect(() => {
    if (dataRef.current.length === 0) {
      let v = 100;
      const d: number[] = [];
      for (let i = 0; i < 20; i++) {
        v += (value / 100) / 20 + (Math.random() - 0.46) * 1.2;
        d.push(v);
      }
      dataRef.current = d;
    }
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const data = dataRef.current;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
    const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - 2 - ((v - mn) / r) * (H - 4) }));
    // Fill
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, value >= 0 ? "rgba(142,185,53,0.2)" : "rgba(244,125,32,0.2)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fill();
    // Stroke
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = value >= 0 ? "#8EB935" : "#F47D20";
    ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
  }, [value]);

  return <canvas ref={ref} width={width} height={height} />;
}

// ---------------------------------------------------------------------------
// Grid column template
// ---------------------------------------------------------------------------
const GRID_COLS = "minmax(200px, 2fr) minmax(90px, 1fr) 70px minmax(130px, 1.5fr) 80px minmax(90px, 1fr) minmax(100px, 1fr) 70px";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Clients() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("aum");
  const [dir, setDir] = useState<number>(-1);
  const [subTab, setSubTab] = useState<SubTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sheetTriggerRef = useRef<HTMLElement | null>(null);
  const [segmentFilter, setSegmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const updateDebouncedSearch = useCallback((value: string) => {
    if (searchTimerRef[0]) clearTimeout(searchTimerRef[0]);
    searchTimerRef[0] = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  const entityTypeFilter = subTab === "businesses" ? "business" : subTab === "households" ? "individual" : "";

  const { data: clientData, isLoading, dataUpdatedAt } = useQuery<{ total: number; page: number; limit: number; clients: any[]; _errors?: string[]; _dataSources?: { orion?: string; salesforce?: string } }>({
    queryKey: ["/api/clients/paginated", { page, pageSize, segmentFilter, statusFilter, sort, dir, debouncedSearch, entityTypeFilter }],
    queryFn: () => {
      const qp = new URLSearchParams();
      qp.set("page", String(page));
      qp.set("limit", String(pageSize));
      qp.set("sort", sort);
      qp.set("sortDir", dir === -1 ? "desc" : "asc");
      if (debouncedSearch) qp.set("search", debouncedSearch);
      if (segmentFilter) qp.set("segment", segmentFilter);
      if (statusFilter) qp.set("status", statusFilter);
      if (entityTypeFilter) qp.set("entityType", entityTypeFilter);
      return fetch(`/api/clients?${qp.toString()}`, { credentials: "include" }).then(r => r.json());
    },
    staleTime: 10 * 60 * 1000, // 10 min — match server enriched cache TTL to prevent premature refetch on navigation
  });

  const clients = clientData?.clients || [];
  const apiErrors = clientData?._errors || [];
  const dataSources = clientData?._dataSources;
  const total = clientData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const totalAum = clients.reduce((s: number, c: any) => s + (c.totalAum || 0), 0);

  // Fetch real billing revenue when available (from Orion or SF)
  const { data: billingData } = useQuery<{ revenueYTD?: number; revenueSource?: string }>({
    queryKey: ["/api/clients/stats/revenue"],
    queryFn: () => fetch("/api/clients/stats", { credentials: "include" }).then(r => r.json()).then(d => ({
      revenueYTD: d.revenueYTD ?? 0,
      revenueSource: d.revenueSource ?? "estimated",
    })),
    staleTime: 5 * 60 * 1000, // 5 min — billing data doesn't change often
  });
  const revenueYTD = billingData?.revenueYTD ?? totalAum * 0.0085;
  const revenueSource = billingData?.revenueSource ?? "estimated";
  const revenueIsReal = revenueSource === "orion-billing" || revenueSource === "salesforce";

  // Compute real sync timestamp from React Query dataUpdatedAt
  const syncLabel = useMemo(() => {
    if (!dataUpdatedAt) return "";
    const secs = Math.round((Date.now() - dataUpdatedAt) / 1000);
    if (secs < 60) return "synced just now";
    const mins = Math.round(secs / 60);
    if (mins < 60) return `synced ${mins}m ago`;
    const hrs = Math.round(mins / 60);
    return `synced ${hrs}h ago`;
  }, [dataUpdatedAt]);

  const toggle = useCallback((s: SortKey) => {
    if (sort === s) setDir(d => d * -1);
    else { setSort(s); setDir(-1); }
    setPage(1);
  }, [sort]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Page header */}
      <div style={{ marginBottom: 5 }}>
        <h1 style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: ".05em",
          textTransform: "uppercase" as const,
          color: OD.t1,
          margin: 0,
        }}>
          Clients
        </h1>
      </div>
      <div style={{ fontSize: 12, color: OD.t3, marginBottom: 16, letterSpacing: ".01em" }}>
        {total} total · <span style={{ color: OD.green, fontWeight: 600 }}>{formatCurrency(totalAum)}</span> matched AUM · Orion + Salesforce FSC{syncLabel ? ` · ${syncLabel}` : ""}
      </div>

      {/* Data source status banner */}
      {apiErrors.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", marginBottom: 12,
          background: "rgba(244,125,32,0.08)",
          border: `1px solid rgba(244,125,32,0.2)`,
          borderRadius: 8,
        }}>
          <AlertTriangle style={{ width: 14, height: 14, color: OD.orange, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: OD.t2 }}>
            {apiErrors.join(" · ")}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {dataSources?.orion && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: dataSources.orion === "live" ? "rgba(142,185,53,0.15)" : "rgba(244,125,32,0.15)",
                color: dataSources.orion === "live" ? OD.green : OD.orange,
                letterSpacing: ".04em", textTransform: "uppercase",
              }}>Orion {dataSources.orion}</span>
            )}
            {dataSources?.salesforce && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: dataSources.salesforce === "live" ? "rgba(142,185,53,0.15)" : "rgba(244,125,32,0.15)",
                color: dataSources.salesforce === "live" ? OD.green : OD.orange,
                letterSpacing: ".04em", textTransform: "uppercase",
              }}>SF {dataSources.salesforce}</span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${OD.border}`, marginBottom: 0 }}>
        {([
          { id: "all" as SubTab, label: "All Clients" },
          { id: "households" as SubTab, label: "Households" },
          { id: "businesses" as SubTab, label: "Businesses" },
          { id: "team" as SubTab, label: "Team View" },
        ]).map(t => (
          <button
            key={t.id}
            className="btn-interactive"
            onClick={() => { setSubTab(t.id); setPage(1); }}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: subTab === t.id ? OD.lblue : OD.t3,
              padding: "10px 16px",
              cursor: "pointer",
              marginBottom: -1,
              transition: "all .15s",
              whiteSpace: "nowrap",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              borderBottomColor: subTab === t.id ? OD.blue : "transparent",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: OD.t4, width: 14, height: 14 }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); updateDebouncedSearch(e.target.value); }}
            placeholder="Search clients..."
            style={{
              width: "100%",
              height: 34,
              padding: "0 12px 0 34px",
              background: OD.surface,
              border: `1px solid ${OD.border}`,
              borderRadius: 6,
              color: OD.t1,
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              outline: "none",
            }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }}
              aria-label="Clear search"
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: OD.t4, display: "flex", background: "none", border: "none", padding: 0 }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
        <select
          value={segmentFilter}
          onChange={e => { setSegmentFilter(e.target.value); setPage(1); }}
          style={{
            height: 34, padding: "0 10px", background: OD.surface, border: `1px solid ${OD.border}`,
            borderRadius: 5, color: OD.t2, fontSize: 12, fontFamily: "'Inter', sans-serif", cursor: "pointer", outline: "none",
          }}
        >
          <option value="">All Tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            height: 34, padding: "0 10px", background: OD.surface, border: `1px solid ${OD.border}`,
            borderRadius: 5, color: OD.t2, fontSize: 12, fontFamily: "'Inter', sans-serif", cursor: "pointer", outline: "none",
          }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="review">Review</option>
          <option value="inactive">Inactive</option>
        </select>
        <div style={{ display: "flex", gap: 0 }}>
          {([
            { id: "aum" as SortKey, l: "AUM ↓" },
            { id: "name" as SortKey, l: "A–Z" },
          ]).map((s, i, arr) => (
            <button
              key={s.id}
              className="btn-filter"
              onClick={() => toggle(s.id)}
              style={{
                height: 34, padding: "0 12px", background: sort === s.id ? "var(--hover-active-bg)" : OD.surface,
                border: `1px solid ${sort === s.id ? OD.blue : OD.border}`,
                color: sort === s.id ? OD.lblue : OD.t3,
                fontSize: 11.5, fontWeight: 500, letterSpacing: ".04em", cursor: "pointer",
                whiteSpace: "nowrap",
                borderRadius: i === 0 ? "5px 0 0 5px" : i === arr.length - 1 ? "0 5px 5px 0" : 0,
                borderLeft: i > 0 ? "none" : undefined,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {s.l}
            </button>
          ))}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: OD.t4, whiteSpace: "nowrap" }}>
          Showing {clients.length} of {total}
        </span>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div>
          <div style={{
            display: "grid", gridTemplateColumns: GRID_COLS, padding: "8px 16px",
            border: `1px solid ${OD.border}`, background: "rgba(0,0,0,0.25)", borderRadius: "8px 8px 0 0",
          }}>
            {["Client", "AUM", "Tier", "Allocation", "Status", "Created", "Next Review", "Sync"].map(h => (
              <Skeleton key={h} style={{ height: 12, width: 60, background: OD.surface }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: GRID_COLS, padding: "16px", alignItems: "center",
              border: `1px solid ${OD.border}`, borderTop: "none", background: OD.surface,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Skeleton style={{ width: 34, height: 34, borderRadius: "50%", background: OD.surface2 }} />
                <div>
                  <Skeleton style={{ height: 14, width: 140, marginBottom: 4, background: OD.surface2 }} />
                  <Skeleton style={{ height: 10, width: 100, background: OD.surface2 }} />
                </div>
              </div>
              <Skeleton style={{ height: 16, width: 60, background: OD.surface2 }} />
              <Skeleton style={{ height: 18, width: 40, background: OD.surface2 }} />
              <Skeleton style={{ height: 5, width: 120, borderRadius: 3, background: OD.surface2 }} />
              <Skeleton style={{ height: 18, width: 50, background: OD.surface2 }} />
              <Skeleton style={{ height: 12, width: 70, background: OD.surface2 }} />
              <Skeleton style={{ height: 12, width: 30, background: OD.surface2 }} />
            </div>
          ))}
        </div>
      )}

      {/* Client table */}
      {!isLoading && (subTab === "all" || subTab === "households" || subTab === "businesses") && (
        <div style={{ overflowX: "auto", width: "100%" }}>
          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              padding: "8px 16px",
              border: `1px solid ${OD.border}`,
              borderBottom: "none",
              background: "rgba(0,0,0,0.25)",
              borderRadius: "8px 8px 0 0",
            }}
          >
            <div style={thStyle}>Client <SrcBadge type="sf">SFDC</SrcBadge></div>
            <div style={{ ...thStyle, justifyContent: "flex-end" }}>AUM <SrcBadge type="or">ORION</SrcBadge></div>
            <div style={{ ...thStyle, justifyContent: "center" }}>Tier <SrcBadge type="sf">SFDC</SrcBadge></div>
            <div style={thStyle}>Alloc. <SrcBadge type="or">ORION</SrcBadge></div>
            <div style={{ ...thStyle, justifyContent: "center" }}>Status <SrcBadge type="sf">SFDC</SrcBadge></div>
            <div style={thStyle}>Created <SrcBadge type="sf">SFDC</SrcBadge></div>
            <div style={thStyle}>Review <SrcBadge type="sf">SFDC</SrcBadge></div>
            <div style={{ ...thStyle, justifyContent: "flex-end" }}>Sync</div>
          </div>

          {/* Empty state */}
          {clients.length === 0 && (
            <div style={{
              border: `1px solid ${OD.border}`, borderTop: "none",
              background: OD.surface, borderRadius: "0 0 8px 8px",
            }}>
              <EmptyState
                icon={Search}
                title="No clients found"
                description="No clients match your search. Try different keywords or clear your filters."
                actionLabel="Clear Search"
                onAction={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }}
              />
            </div>
          )}

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {clients.map((client: any) => (
              <ClientRow
                key={client.id}
                client={client}
                expanded={expandedId === client.id}
                onToggle={() => {
                  if (expandedId !== client.id) {
                    sheetTriggerRef.current = document.activeElement as HTMLElement;
                  }
                  setExpandedId(expandedId === client.id ? null : client.id);
                }}
              />
            ))}
          </div>

          {/* Footer */}
          {clients.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                border: `1px solid ${OD.border}`,
                borderTop: "none",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "0 0 8px 8px",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: OD.t4, letterSpacing: ".1em", textTransform: "uppercase" as const }}>
                Showing {startItem}–{endItem} of {total} · SFDC: Account + FinancialAccount · Orion: /portfolios /performance /holdings · Click row to expand
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 1 }}>
                  <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, color: OD.lblue }}>{formatCurrency(totalAum)}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".15em", color: OD.t4, textTransform: "uppercase" as const }}>Book AUM</span>
                </div>
                <div style={{ width: 1, height: 24, background: OD.border }} />
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 1 }}>
                  <span title={revenueIsReal ? `Actual revenue from ${revenueSource}` : "Estimated at 85 bps of total AUM — billing endpoint not yet returning data"} style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, color: OD.green }}>{formatCurrency(revenueYTD)}</span>
                  <span title={revenueIsReal ? `Source: ${revenueSource}` : "Estimated at 85 bps of total AUM"} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".15em", color: OD.t4, textTransform: "uppercase" as const }}>{revenueIsReal ? "Revenue — YTD" : "Est. Revenue (85 bps)"}</span>
                </div>
                <div style={{ width: 1, height: 24, background: OD.border }} />
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 2 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".2em", color: OD.green, textTransform: "uppercase" as const }}>Live</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: OD.t4 }}>Data Source</span>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button
                className="btn-interactive"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={pageBtnStyle(page <= 1)}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
              </button>
              <span style={{ fontSize: 12, color: OD.t3, display: "flex", alignItems: "center", gap: 4 }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-interactive"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={pageBtnStyle(page >= totalPages)}
              >
                Next <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Team view */}
      {!isLoading && subTab === "team" && <TeamView clients={clients} />}

      {/* Client preview sheet — replaces inline row expansion */}
      <Sheet open={!!expandedId} onOpenChange={(open) => {
        if (!open) {
          setExpandedId(null);
          // Restore focus to the trigger row, or fallback to table region
          requestAnimationFrame(() => {
            if (sheetTriggerRef.current && document.contains(sheetTriggerRef.current)) {
              sheetTriggerRef.current.focus();
            } else {
              // Trigger may have re-rendered; fallback to table container
              const fallback = document.querySelector('[data-testid="text-page-title"]') as HTMLElement;
              fallback?.focus();
            }
            sheetTriggerRef.current = null;
          });
        }
      }}>
        <SheetContent side="right" className="w-[520px] sm:max-w-[520px] overflow-y-auto" style={{ background: OD.surface, borderColor: OD.border, padding: 0 }}>
          <SheetHeader className="sr-only">
            <SheetTitle>Client Preview</SheetTitle>
            <SheetDescription>Preview panel for selected client</SheetDescription>
          </SheetHeader>
          {expandedId && (
            <ClientPreviewPanel
              client={clients.find((c: any) => c.id === expandedId)}
              clientId={expandedId}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const thStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 400,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: OD.t4,
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  minWidth: 0,
};

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6,
    border: `1px solid ${OD.border}`, background: disabled ? OD.surface : OD.surface2,
    color: disabled ? OD.t4 : OD.t2, fontSize: 11, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    fontFamily: "'Inter', sans-serif",
  };
}

// ---------------------------------------------------------------------------
// Client Row — wrapped in React.memo so expanding one row doesn't re-render
// all 50 rows. Custom comparator checks identity + expansion state.
// ---------------------------------------------------------------------------
const ClientRow = React.memo(function ClientRow({ client, expanded, onToggle }: { client: any; expanded: boolean; onToggle: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedRef = useRef(false);

  const prefetchClient = useCallback(() => {
    const id = client.id;
    if (!id || prefetchedRef.current) return;
    prefetchedRef.current = true; // Only prefetch once per row mount — React Query cache handles the rest
    const opts = { staleTime: 10 * 60 * 1000 };
    // Prefetch ONLY summary (fast, 1s, populates header) + preview (populates slide-out panel)
    // Portfolio, members, and monolithic are deferred to click time — they're heavy and usually not needed until then
    qc.prefetchQuery({ queryKey: ["/api/clients", id, "summary"], queryFn: () => fetch(`/api/clients/${id}/summary`, { credentials: "include" }).then(r => r.ok ? r.json() : null), ...opts });
    qc.prefetchQuery({ queryKey: ["client-preview", id], queryFn: () => fetch(`/api/clients/${id}/preview`, { credentials: "include" }).then(r => r.ok ? r.json() : null), ...opts });
  }, [client.id, qc]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!expanded) (e.currentTarget as HTMLElement).style.background = OD.surface2;
    hoverTimer.current = setTimeout(prefetchClient, 300); // 300ms debounce (was 150ms) — reduces churn from fast scrolling
  }, [expanded, prefetchClient]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!expanded) (e.currentTarget as HTMLElement).style.background = OD.surface;
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }, [expanded]);
  const name = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unknown";
  const aum = client.totalAum || 0;
  const tier = client.segment || "";
  const tc = tier ? (tierColors[tier] || tierColors.C) : { bg: "rgba(45,55,72,0.3)", text: OD.t4 };
  const isBusiness = client.entityType === "business";
  const [avatarBg, avatarTxt] = getAvatarColor(name);
  const status = client.status === "active" ? "Active" : client.status === "review" ? "Review" : client.status === "inactive" ? "Inactive" : "Active";
  const statusClass = status === "Active" ? "ok" : status === "Review" ? "review" : "flag";
  const statusColors: Record<string, { color: string; bg: string }> = {
    ok: { color: OD.green, bg: "rgba(142,185,53,0.1)" },
    review: { color: OD.yellow, bg: "rgba(255,198,11,0.1)" },
    flag: { color: OD.orange, bg: "rgba(244,125,32,0.1)" },
  };
  const sc = statusColors[statusClass];
  const created = client.createdDate ? new Date(client.createdDate).toLocaleDateString("en-US") : "";

  // Allocation bar uses React Query cache from hover-prefetch
  const cachedPortfolio = qc.getQueryData<any>(["/api/clients", client.id, "portfolio"]);
  const cachedPreview = qc.getQueryData<any>(["client-preview", client.id]);
  const alloc = cachedPreview?.allocation ?? cachedPortfolio?.allocation ?? null;

  return (
    <>
      {/* Main row */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        tabIndex={0}
        role="row"
        aria-label={`${name}, AUM ${formatCurrency(aum)}`}
        aria-expanded={expanded}
        style={{
          display: "grid",
          gridTemplateColumns: GRID_COLS,
          padding: "0 16px",
          minHeight: 60,
          alignItems: "center",
          border: `1px solid ${OD.border}`,
          borderTop: "none",
          background: expanded ? OD.surface2 : OD.surface,
          cursor: "pointer",
          transition: "background .16s",
          position: "relative",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left accent */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
          background: expanded ? OD.lblue : "transparent", transition: "background .2s",
        }} />

        {/* Client */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600,
            flexShrink: 0, background: avatarBg, color: avatarTxt,
          }}>
            {isBusiness ? <Building2 size={14} /> : initials(name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: OD.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: OD.t4, letterSpacing: ".1em" }}>{client.id?.slice(0, 10)}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 10, letterSpacing: ".06em",
                background: isBusiness ? "rgba(127,119,221,0.12)" : "rgba(45,55,72,0.8)",
                color: isBusiness ? "#a78bfa" : OD.t3,
                border: isBusiness ? "1px solid rgba(127,119,221,0.25)" : "none",
              }}>
                {isBusiness ? "Business" : "Individual"}
              </span>
            </div>
          </div>
        </div>

        {/* AUM */}
        <div style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 600,
          color: OD.lblue, textAlign: "right",
        }}>
          {formatCurrency(aum)}
        </div>

        {/* Tier */}
        <div style={{ textAlign: "center" }}>
          <span style={{
            fontSize: 10, fontWeight: tier ? 600 : 400, padding: "1px 5px", borderRadius: 10,
            background: tc.bg, color: tc.text, letterSpacing: ".06em",
            border: `1px solid ${tier ? "rgba(79,179,205,0.2)" : "rgba(45,55,72,0.3)"}`,
            fontStyle: tier ? "normal" : "italic",
          }}>
            {tier ? `Tier ${tier}` : "—"}
          </span>
        </div>

        {/* Allocation */}
        <div style={{ paddingRight: 4 }}>
          {alloc ? (
            <AllocationBar eq={alloc.EQ || 0} fi={alloc.FI || 0} alt={alloc.ALT || 0} ca={alloc.CA || 0} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 5, width: 120, borderRadius: 3, background: "rgba(45,55,72,0.4)" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: OD.t4 }}>—</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{ textAlign: "center" }}>
          <span style={{
            display: "inline-block", fontSize: 10, fontWeight: 700,
            letterSpacing: ".12em", textTransform: "uppercase" as const,
            padding: "3px 8px", borderRadius: 2,
            color: sc.color, background: sc.bg,
          }}>
            {status === "Active" ? "On Track" : status}
          </span>
        </div>

        {/* Created */}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: OD.t3 }}>
          {created}
        </div>

        {/* Next Review */}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
          {client.nextReview ? (
            <span style={{
              color: new Date(client.nextReview) < new Date() ? "#ef4444" : OD.t3,
              fontWeight: new Date(client.nextReview) < new Date() ? 600 : 400,
            }}
              title={new Date(client.nextReview) < new Date() ? "Review overdue" : ""}
            >
              {new Date(client.nextReview).toLocaleDateString("en-US")}
            </span>
          ) : (
            <span style={{ color: OD.t4 }}>—</span>
          )}
        </div>

        {/* Sync */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: OD.green }}>Live</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: OD.t4, marginTop: 1 }}>Orion+SFDC</div>
        </div>
      </div>

    </>
  );
}, (prev, next) => {
  // Only re-render if identity, expansion state, or key data fields change
  return prev.client.id === next.client.id
    && prev.expanded === next.expanded
    && prev.client.totalAum === next.client.totalAum
    && prev.client.segment === next.client.segment
    && prev.client.status === next.client.status;
});

// ---------------------------------------------------------------------------
// Detail card (inside expanded panel)
// ---------------------------------------------------------------------------
function DetailCard({ src, label, value, color, mono, link }: { src: string; label: string; value: string; color?: string; mono?: boolean; link?: string }) {
  const isOrion = src === "Orion";
  return (
    <div style={{ padding: "14px 20px", borderRight: `1px solid ${OD.border2}` }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".18em",
        color: isOrion ? "rgba(142,185,53,0.6)" : "rgba(79,179,205,0.6)",
        textTransform: "uppercase" as const, marginBottom: 3,
      }}>
        {src}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 400,
        letterSpacing: ".18em", textTransform: "uppercase" as const,
        color: OD.t4, marginBottom: 5,
      }}>
        {label}
      </div>
      {link && value !== "—" ? (
        <a href={link} style={{
          fontFamily: mono ? "'Inter', sans-serif" : "'Oswald', sans-serif",
          fontWeight: mono ? 500 : 600,
          fontSize: mono ? 13 : 18,
          color: OD.lblue,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textDecoration: "none", display: "block",
        }}>
          {value}
        </a>
      ) : (
        <div style={{
          fontFamily: mono ? "'Inter', sans-serif" : "'Oswald', sans-serif",
          fontWeight: mono ? 500 : 600,
          fontSize: mono ? 13 : 18,
          color: value === "—" ? OD.t4 : (color || OD.t1),
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {value}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Preview Panel — rendered inside Sheet overlay
// ---------------------------------------------------------------------------
function ClientPreviewPanel({ client, clientId }: { client: any; clientId: string }) {
  const router = useRouter();

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ["client-preview", clientId],
    queryFn: () => fetch(`/api/clients/${clientId}/preview`, { credentials: "include" }).then(r => r.json()),
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });

  if (!client) return null;

  const name = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unknown";
  const aum = client.totalAum || 0;
  const tier = client.segment || "";
  const isBusiness = client.entityType === "business";
  const alloc = preview?.allocation ?? null;

  if (previewLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton style={{ height: 8, width: 50, marginBottom: 6, background: OD.surface2 }} />
              <Skeleton style={{ height: 20, width: 80, background: OD.surface2 }} />
            </div>
          ))}
        </div>
        <Skeleton style={{ height: 60, borderRadius: 6, background: OD.surface2 }} />
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Hero */}
      <div style={{
        padding: "20px 24px",
        borderBottom: `1px solid ${OD.border2}`,
        background: "rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: ".02em", color: OD.t1 }}>{name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: OD.t4, letterSpacing: ".12em", marginTop: 4 }}>
          {client.id?.slice(0, 10)} · {isBusiness ? "Business" : "Household"} · Tier {tier}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 24, color: OD.lblue }}>{formatCurrency(aum)}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".18em", color: OD.t4, textTransform: "uppercase" as const }}>AUM · Orion</div>
          </div>
          {preview.accounts?.count > 0 && (
            <>
              <div style={{ width: 1, height: 36, background: OD.border2 }} />
              <div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, color: OD.t2 }}>{preview.accounts.count}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".18em", color: OD.t4, textTransform: "uppercase" as const }}>Accounts</div>
              </div>
            </>
          )}
        </div>
        {alloc && (
          <div style={{ marginTop: 12 }}>
            <AllocationBar eq={alloc.EQ || 0} fi={alloc.FI || 0} alt={alloc.ALT || 0} ca={alloc.CA || 0} size="lg" />
          </div>
        )}
      </div>

      {/* Detail cards — 2-column grid for sheet width */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${OD.border2}` }}>
        <DetailCard src="SFDC" label="Email" value={preview.members?.list?.[0]?.email || client.email || "—"} mono link={(() => { const e = preview.members?.list?.[0]?.email || client.email; return e ? `mailto:${e}` : undefined; })()} />
        <DetailCard src="SFDC" label="Phone" value={
          (() => {
            const m = preview.members?.list?.[0];
            const phone = m?.phone || client.phone;
            if (!phone) return "—";
            const typeLabel = m?.phoneType ? ` · ${m.phoneType}` : "";
            return phone + typeLabel;
          })()
        } link={(() => { const p = preview.members?.list?.[0]?.phone || client.phone; return p ? `tel:${p}` : undefined; })()} />
        <DetailCard src="SFDC" label="Household" value={(() => {
          const list = preview.members?.list;
          if (!list || list.length === 0) return preview.members?.count ? `${preview.members.count} member${preview.members.count > 1 ? "s" : ""}` : "—";
          const shown = list.slice(0, 3).map((m: any) => {
            const n = `${m.firstName || ""} ${m.lastName || ""}`.trim();
            const rel = m.relationship ? ` (${m.relationship})` : "";
            return n + rel;
          });
          const overflow = list.length > 3 ? ` +${list.length - 3} more` : "";
          return shown.join(", ") + overflow;
        })()} mono />
        <DetailCard src="Orion" label="Holdings" value={preview.holdings?.count ? `${preview.holdings.count} positions` : "—"} />
        <DetailCard src="Orion" label="Top Holding" value={
          (() => {
            const th = preview.holdings?.topHolding;
            if (th?.ticker && th.value > 0) return `${th.ticker} · ${formatCurrency(th.value)}`;
            // Fallback to list data
            const lt = client.topHoldings?.[0];
            if (lt?.ticker) return `${lt.ticker} · ${formatCurrency(lt.value || lt.marketValue || 0)}`;
            return "—";
          })()
        } color={OD.lblue} />
        <DetailCard src="Orion" label="Cash Position" value={
          preview.holdings?.cashPosition?.value > 0
            ? `${formatCurrency(preview.holdings.cashPosition.value)} (${preview.holdings.cashPosition.percentage}%)`
            : "—"
        } />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${OD.border2}` }}>
        <DetailCard src="SFDC" label="Client Since" value={
          (() => {
            const d = preview.createdDate || preview.clientSince || client.createdDate;
            if (!d) return "—";
            return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          })()
        } />
        <DetailCard src="SFDC" label="Occupation" value={preview.occupation || client.occupation || "—"} />
        <DetailCard src="SFDC" label="Risk Tolerance" value={
          (() => {
            const rt = preview.riskTolerance || client.riskTolerance;
            if (!rt) return "—";
            return riskLabels[rt.toLowerCase()] || rt;
          })()
        } />
        <DetailCard src="SFDC" label="Review" value={preview.reviewFrequency || client.reviewFrequency || "—"} />
        <DetailCard src="SFDC" label="Last Review" value={
          (() => {
            const d = preview.lastReview || client.lastReview;
            if (!d) return "—";
            return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          })()
        } />
        <DetailCard src="SFDC" label="Next Review" value={
          (() => {
            const d = preview.nextReview || client.nextReview;
            if (!d) return "—";
            return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          })()
        } />
        <DetailCard src="SFDC" label="Service Model" value={preview.serviceModel || client.serviceModel || "—"} />
        {(preview.financialGoals || client.financialGoals) && <DetailCard src="SFDC" label="Investment Goals" value={preview.financialGoals || client.financialGoals} />}
      </div>

      {/* Member list */}
      {preview.members?.list?.length > 0 && (
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${OD.border2}` }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: OD.t4, marginBottom: 8 }}>
            Household Members
          </div>
          {preview.members.list.map((m: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: i < preview.members.list.length - 1 ? `1px solid ${OD.border2}` : "none" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: OD.t2 }}>{m.firstName} {m.lastName}</span>
              <span style={{ fontSize: 10, color: OD.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                {m.email || m.phone || m.maritalStatus || ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* AI Snapshot */}
      <div style={{ margin: "16px 20px", padding: "14px 16px", background: "rgba(0,120,162,0.08)", border: "1px solid rgba(0,120,162,0.2)", borderRadius: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(0,120,162,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={10} style={{ color: OD.lblue }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: OD.lblue }}>AI Snapshot · Fin</span>
          <span style={{ fontSize: 10, color: OD.t4 }}>— Generated from Orion + SFDC</span>
        </div>
        <div style={{ fontSize: 12.5, color: OD.t2, lineHeight: 1.65 }}>
          {generateSnapshot(preview, client)}
        </div>
      </div>

      {/* View full profile button */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 20px 16px", marginTop: "auto" }}>
        <button
          onClick={() => router.push(`/clients/${client.id}`)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 20px", borderRadius: "var(--radius-sm)",
            background: OD.deep, color: OD.lblue, fontSize: 12, fontWeight: 600,
            border: `1px solid rgba(79,179,205,0.3)`, cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
          className="btn-interactive"
        >
          View Full Profile <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team View (stub)
// ---------------------------------------------------------------------------
function TeamView({ clients }: { clients: any[] }) {
  const advisorGroups = clients.reduce((acc: Record<string, any[]>, client) => {
    const advisor = client.advisorName || "Unassigned";
    if (!acc[advisor]) acc[advisor] = [];
    acc[advisor].push(client);
    return acc;
  }, {});

  const teamEntries = Object.entries(advisorGroups).sort((a, b) => {
    const aumA = a[1].reduce((s: number, c: any) => s + (c.totalAum || 0), 0);
    const aumB = b[1].reduce((s: number, c: any) => s + (c.totalAum || 0), 0);
    return aumB - aumA;
  });

  if (teamEntries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <Users style={{ width: 40, height: 40, color: OD.t3, margin: "0 auto 12px" }} />
        <p style={{ fontSize: 13, color: OD.t3 }}>No team assignments found</p>
      </div>
    );
  }

  return (
    <div>
      {teamEntries.map(([advisor, members]) => {
        const teamAum = members.reduce((s: number, c: any) => s + (c.totalAum || 0), 0);
        return (
          <div key={advisor} style={{
            padding: 20, borderRadius: 8, background: OD.surface,
            border: `1px solid ${OD.border}`, marginBottom: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `linear-gradient(135deg, ${OD.deep}, ${OD.blue})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 600, color: OD.t1,
                }}>
                  {advisor.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, fontWeight: 600, color: OD.t1 }}>{advisor}</div>
                  <div style={{ fontSize: 11, color: OD.t3 }}>
                    {members.length} client{members.length > 1 ? "s" : ""} · <span style={{ color: OD.green }}>{formatCurrency(teamAum)}</span> AUM
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {members.slice(0, 6).map((c: any) => (
                <NextLink href={`/clients/${c.id}`} key={c.id} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: 6, background: OD.surface2, cursor: "pointer",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 4, background: OD.deep,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Oswald', sans-serif", fontSize: 10, fontWeight: 600, color: OD.t1,
                    }}>
                      {(c.firstName?.[0] || "?")}{(c.lastName?.[0] || "")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: OD.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.firstName} {c.lastName}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: OD.t4 }}>{formatCurrency(c.totalAum || 0)}</span>
                    </div>
                  </div>
                </NextLink>
              ))}
            </div>
            {members.length > 6 && (
              <div style={{ marginTop: 8, fontSize: 11, color: OD.t4, textAlign: "center" }}>
                + {members.length - 6} more clients
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
