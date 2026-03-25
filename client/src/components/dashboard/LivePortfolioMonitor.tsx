import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Users, Search } from "lucide-react";

/* ── OD Brand Palette ── */
const OD = {
  deepBlue: "var(--color-brand-deep)",
  medBlue: "var(--color-brand-primary)",
  medGreen: "var(--color-success)",
  orange: "var(--color-orange)",
  lightBlue: "var(--color-brand-secondary)",
  lightGreen: "var(--color-success-light)",
  yellow: "var(--color-warning)",
  bgDark: "var(--color-bg)",
  bgMed: "var(--color-surface)",
  text1: "var(--color-text-primary)",
  text2: "var(--color-text-secondary)",
  text3: "var(--color-text-tertiary)",
  border: "var(--color-border)",
  borderLight: "var(--color-border-subtle)",
};

const F = {
  headline: "'Oswald', sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ── Helpers ── */
function clientName(c: any): string {
  if (c.firstName && c.lastName) return `${c.firstName} ${c.lastName}`;
  if (c.name) return c.name;
  if (c.householdName) return c.householdName;
  return "Unknown";
}
function clientAum(c: any): number {
  return c.totalAum ?? c.currentAUM ?? c.aum ?? 0;
}
function sfId(raw?: string | number): string {
  if (!raw) return "SF-00000";
  const s = String(raw);
  if (s.length > 5) return `SF-${s.slice(-5)}`;
  return `SF-${s.padStart(5, "0")}`;
}
function timeSince(ts?: string): string {
  if (!ts) return "—";
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return '$' + (value / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return '$' + (value / 1_000).toFixed(0) + 'K';
  return '$' + value.toFixed(0);
}

/* ── Risk + Status maps ── */
const riskColors: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: OD.medGreen, bg: 'rgba(142,185,53,0.07)', border: 'rgba(142,185,53,0.35)' },
  moderate: { color: OD.yellow, bg: 'rgba(255,198,11,0.06)', border: 'rgba(255,198,11,0.3)' },
  high: { color: OD.orange, bg: 'rgba(244,125,32,0.07)', border: 'rgba(244,125,32,0.35)' },
  aggressive: { color: OD.lightBlue, bg: 'rgba(79,179,205,0.07)', border: 'rgba(79,179,205,0.3)' },
};
const statusColors: Record<string, { color: string; bg: string }> = {
  active: { color: OD.medGreen, bg: 'rgba(142,185,53,0.1)' },
  review: { color: OD.yellow, bg: 'rgba(255,198,11,0.1)' },
  inactive: { color: OD.orange, bg: 'rgba(244,125,32,0.1)' },
  prospect: { color: OD.lightBlue, bg: 'rgba(79,179,205,0.1)' },
};

/* ── Sparkline ── */
function Sparkline({ value, width = 88, height = 28, aumHistory }: { value: number; width?: number; height?: number; aumHistory?: { date: string; aum: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const up = value >= 0;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    // Use REAL AUM history if available, otherwise show nothing
    let data: number[];
    if (aumHistory && aumHistory.length >= 2) {
      // Real data from Orion — extract AUM values
      data = aumHistory.map(pt => pt.aum);
    } else {
      // No real data available — render empty canvas
      return;
    }

    ctx.clearRect(0, 0, width, height);
    const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
    const pts = data.map((v2, i) => ({ x: (i / (data.length - 1)) * width, y: height - 3 - ((v2 - mn) / r) * (height - 6) }));

    // Fill
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, up ? 'rgba(142,185,53,0.25)' : 'rgba(244,125,32,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = up ? OD.medGreen : OD.orange;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // End dot
    const L = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(L.x, L.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = up ? OD.medGreen : OD.orange;
    ctx.fill();
  }, [value, width, height, up]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}

/* ── Grid columns ── */
const GRID = "200px 120px 100px 110px 80px 160px 90px 90px 80px";

/* ── Skeleton ── */
function SkeletonRow({ i }: { i: number }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: GRID, height: 58, alignItems: "center",
      padding: "0 24px", borderBottom: `1px solid ${OD.borderLight}`, opacity: 0.4 - i * 0.04,
    }}>
      {[140, 80, 60, 70, 50, 100, 60, 60, 50].map((w, j) => (
        <div key={j} style={{
          width: w, height: 14, borderRadius: 3,
          background: "rgba(34,37,48,0.8)",
          animation: "lpm-pulse 1.6s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

/* ── Detail Row (expanded) ── */
function DetailRow({ client, detail, risk }: { client: any; detail: any; risk: string }) {
  const dc = detail?.client; // detail endpoint nests client data under .client
  const dEmail = dc?.email || client.email || "";
  const dPhone = dc?.phone || client.phone || "";
  const dOccupation = dc?.occupation || client.occupation || "";
  const goalCount = Array.isArray(detail?.financialGoals) ? detail.financialGoals.length : (detail?.financialGoals ?? client.financialGoals ?? 0);
  const dGoals = goalCount;
  const dCreated = dc?.createdDate || client.createdDate || "";
  const dRisk = dc?.riskTolerance || risk;
  const dRc = riskColors[dRisk] || riskColors.moderate;

  const fields = [
    { label: "Email", src: "SFDC: Contact.Email", value: dEmail || "—", color: OD.text1 },
    { label: "Phone", src: "SFDC: Contact.Phone", value: dPhone || "—", color: OD.text1 },
    { label: "Risk Tolerance", src: "SFDC: FinServ__RiskTolerance__c", value: capitalize(dRisk), color: dRc.color },
    { label: "Occupation", src: "SFDC: Contact.Occupation", value: dOccupation || "—", color: OD.text1 },
    { label: "Financial Goals", src: "SFDC: FinancialGoals__c", value: dGoals ? `${dGoals} goals` : "—", color: OD.lightBlue },
    { label: "Created", src: "SFDC: Account.CreatedDate", value: dCreated ? new Date(dCreated).toLocaleDateString() : "—", color: OD.text1 },
  ];

  return (
    <div style={{
      background: "rgba(0,52,79,0.15)",
      borderBottom: `1px solid ${OD.border}`,
      borderLeft: `2px solid ${OD.medBlue}`,
      animation: "lpm-fadeIn 0.2s ease",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
        padding: "14px 24px", gap: 0,
      }}>
        {fields.map((m, idx) => (
          <div key={m.label} style={{
            padding: idx > 0 ? "0 16px" : "0 16px 0 0",
            borderLeft: idx > 0 ? `1px solid ${OD.border}` : "none",
          }}>
            <div style={{
              fontFamily: F.mono, fontSize: 8, fontWeight: 300,
              letterSpacing: ".2em", color: OD.text3, textTransform: "uppercase",
              marginBottom: 2,
            }}>
              {m.label}
            </div>
            <div style={{
              fontFamily: F.mono, fontSize: 6.5, color: OD.medBlue,
              letterSpacing: ".12em", textTransform: "uppercase",
              marginBottom: 4, opacity: 0.7,
            }}>
              {m.src}
            </div>
            <div style={{
              fontFamily: F.headline, fontWeight: 600, fontSize: 18,
              color: m.color,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   LivePortfolioMonitor — OD Brand Design
   ════════════════════════════════════════════════════ */
export function LivePortfolioMonitor() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "flagged" | "highValue" | "review">("all");
  const [detailCache, setDetailCache] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const { data: clientsData, isLoading } = useQuery<{
    clients: any[];
    total: number;
    isLiveData: boolean;
  }>({
    queryKey: ["/api/clients?limit=10&sort=aum&dir=-1"],
    staleTime: 3 * 60 * 1000, // 3 min — matches ENRICHED_CLIENTS_TTL on server
    refetchInterval: 3 * 60 * 1000, // Aligns with server cache TTL
    refetchIntervalInBackground: false, // Stop polling when tab is hidden
  });

  // Fetch client detail when a row is expanded — uses React Query to share cache
  // with the client detail page (avoids duplicate fetches when navigating)
  const { data: expandedDetail } = useQuery<any>({
    queryKey: ["/api/clients", expandedRow],
    enabled: !!expandedRow && !detailCache[expandedRow],
    staleTime: 5 * 60 * 1000, // 5 min — matches client detail page staleTime
  });

  // Sync React Query result into local detailCache for expanded rows
  useEffect(() => {
    if (expandedRow && expandedDetail && !detailCache[expandedRow]) {
      setDetailCache(prev => ({ ...prev, [expandedRow]: expandedDetail }));
    }
  }, [expandedRow, expandedDetail, detailCache]);

  const { data: ds } = useQuery<any>({
    queryKey: ["/api/data-sources"],
    staleTime: 60000,
  });

  const clients = clientsData?.clients ?? [];
  const total = clientsData?.total ?? 0;

  // Fetch AUM history for sparklines — one query per visible client, cached 15 min
  const [aumHistoryCache, setAumHistoryCache] = useState<Record<string, any[]>>({});
  useEffect(() => {
    if (!clients.length) return;
    clients.forEach((c: any) => {
      const id = c.id || c.sfHouseholdId;
      if (!id || aumHistoryCache[id]) return;
      fetch(`/api/clients/${id}/aum-history`, { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data?.aumHistory?.length > 0) {
            setAumHistoryCache(prev => ({ ...prev, [id]: data.aumHistory }));
          }
        })
        .catch(() => {}); // Silent fail — synthetic sparkline will be used
    });
  }, [clients]);
  const isLive = clientsData?.isLiveData ?? false;
  const lastSync = ds?.lastRefreshed ?? ds?.lastSync;
  const syncLabel = lastSync ? timeSince(lastSync) : "2m ago";

  const filtered = useMemo(() => {
    return clients.filter((c: any) => {
      // Category filter
      if (filter === "flagged" && !(c.status === "review" || (c.segment ?? "").toUpperCase() === "D")) return false;
      if (filter === "highValue" && clientAum(c) < 1_000_000) return false;
      if (filter === "review" && c.status !== "review") return false;
      // Search filter — client-side only, operates on already-fetched data
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const name = clientName(c).toLowerCase();
        return name.includes(q);
      }
      return true;
    });
  }, [clients, filter, debouncedSearch]);

  const bookAum = clients.reduce((sum: number, c: any) => sum + clientAum(c), 0);

  return (
    <>
      <style>{`
        @keyframes lpm-pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
        @keyframes lpm-fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes od-pip { 0%,100%{opacity:1} 50%{opacity:.3} }
        .lpm-scroll::-webkit-scrollbar { width: 4px; }
        .lpm-scroll::-webkit-scrollbar-track { background: transparent; }
        .lpm-scroll::-webkit-scrollbar-thumb { background: ${OD.border}; border-radius: 2px; }
      `}</style>

      <div style={{
        borderTop: `1px solid ${OD.border}`,
        background: OD.bgMed,
      }}>
        {/* ── HEADER ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: `1px solid ${OD.border}`,
          background: OD.deepBlue,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{
              fontFamily: F.headline, fontWeight: 600, fontSize: 16,
              letterSpacing: ".08em", textTransform: "uppercase", color: OD.text1,
            }}>
              Live Portfolio Monitor
            </span>
            <span style={{
              fontFamily: F.mono, fontSize: 8.5, fontWeight: 300,
              letterSpacing: ".18em", color: OD.text3, textTransform: "uppercase",
            }}>
              Orion + Salesforce FSC · {total} accounts · synced {syncLabel}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Source badges */}
            <span style={{
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: F.mono, fontSize: 8, letterSpacing: ".18em",
              textTransform: "uppercase", padding: "3px 9px", borderRadius: 3,
              color: OD.lightBlue, background: "rgba(79,179,205,0.08)",
              border: "1px solid rgba(79,179,205,0.18)",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: OD.lightBlue, animation: "od-pip 2s ease-in-out infinite",
              }} />
              SFDC
            </span>
            <span style={{
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: F.mono, fontSize: 8, letterSpacing: ".18em",
              textTransform: "uppercase", padding: "3px 9px", borderRadius: 3,
              color: OD.lightGreen, background: "rgba(194,231,107,0.06)",
              border: "1px solid rgba(194,231,107,0.15)",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: OD.lightGreen, animation: "od-pip 2s ease-in-out infinite",
              }} />
              Orion
            </span>

            {/* Filters */}
            {(["all", "flagged", "highValue", "review"] as const).map((f) => (
              <button
                key={f}
                className="btn-filter"
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: ".1em",
                  textTransform: "uppercase", padding: "4px 10px",
                  border: `1px solid ${filter === f ? OD.medBlue : OD.border}`,
                  borderRadius: 3, cursor: "pointer",
                  background: filter === f ? "rgba(0,120,162,0.08)" : "transparent",
                  color: filter === f ? OD.lightBlue : OD.text3,
                }}
              >
                {f === "highValue" ? "High Value" : capitalize(f)}
              </button>
            ))}
          </div>
        </div>

        {/* ── SEARCH + ROW COUNT ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 24px", borderBottom: `1px solid ${OD.border}`,
          background: "rgba(0,0,0,0.12)",
        }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={12} style={{ position: "absolute", left: 8, color: OD.text3, pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: 200, height: 28, paddingLeft: 28, paddingRight: 8,
                fontSize: 11, fontFamily: F.body,
                background: "rgba(0,0,0,0.2)", border: `1px solid ${OD.border}`,
                borderRadius: 4, color: OD.text2, outline: "none",
              }}
            />
          </div>
          <span style={{
            fontFamily: F.mono, fontSize: 10, color: OD.text3,
            letterSpacing: ".1em",
          }}>
            Showing {filtered.length} of {clients.length} clients
          </span>
        </div>

        {/* ── TABLE HEAD ── */}
        <div style={{
          display: "grid", gridTemplateColumns: GRID,
          padding: "8px 24px", borderBottom: `1px solid ${OD.border}`,
          background: "rgba(0,0,0,0.25)",
        }}>
          {[
            { label: "Client", src: "SFDC", srcColor: OD.medBlue },
            { label: "AUM", src: "ORION", srcColor: OD.medGreen },
            { label: "Return YTD", src: "ORION", srcColor: OD.medGreen, align: "right" },
            { label: "Ann. Income", src: "SFDC", srcColor: OD.medBlue, align: "right" },
            { label: "Risk", src: "ORION", srcColor: OD.medGreen, align: "center" },
            { label: "Allocation", src: "ORION", srcColor: OD.medGreen },
            { label: "Status", src: "SFDC", srcColor: OD.medBlue, align: "center" },
            { label: "Trend" },
            { label: "Sync", align: "right" },
          ].map((col) => (
            <div key={col.label} style={{
              fontFamily: F.mono, fontSize: 8, fontWeight: 300,
              letterSpacing: ".22em", color: OD.text3, textTransform: "uppercase",
              cursor: "pointer", transition: "color .15s", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 4,
              justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
            }}>
              {col.label}
              {col.src && (
                <span style={{
                  fontSize: 6.5, padding: "1px 3px", borderRadius: 2,
                  border: `1px solid ${col.srcColor === OD.medGreen ? 'rgba(142,185,53,0.2)' : 'rgba(0,120,162,0.2)'}`,
                  color: col.srcColor,
                }}>
                  {col.src}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── TABLE BODY ── */}
        <div className="lpm-scroll" style={{ maxHeight: 520, overflowY: "auto" }}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} i={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients to display"
              description="Adjust your filters or sync portfolio data to see clients here."
              actionLabel="Clear Filters"
              onAction={() => setFilter("all")}
            />
          ) : (
            filtered.map((client: any) => {
              const id = client.sfHouseholdId ?? client.id ?? client._id;
              const rowKey = String(id);
              const isOpen = expandedRow === rowKey;
              const name = clientName(client);
              const aum = clientAum(client);
              const risk = (client.riskTolerance ?? "moderate").toLowerCase();
              const status = client.status ?? "active";
              const rc = riskColors[risk] ?? riskColors.moderate;
              const sc = statusColors[status] ?? statusColors.active;
              // Use real return data if available from client payload, otherwise null
              const retYtd: number | null = client.returnPct ?? client.netReturn ?? client.returnYtd ?? null;
              const up = retYtd !== null ? retYtd >= 0 : true;

              return (
                <React.Fragment key={rowKey}>
                  <div
                    onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                    style={{
                      display: "grid", gridTemplateColumns: GRID,
                      padding: "0 24px", height: 58, alignItems: "center",
                      borderBottom: `1px solid ${OD.borderLight}`,
                      cursor: "pointer", transition: "background .16s", position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,120,162,0.04)";
                      const bar = e.currentTarget.querySelector('.p-row-bar') as HTMLElement;
                      if (bar) bar.style.background = up ? OD.medBlue : OD.orange;
                    }}
                    onMouseLeave={(e) => {
                      if (!isOpen) {
                        e.currentTarget.style.background = "transparent";
                        const bar = e.currentTarget.querySelector('.p-row-bar') as HTMLElement;
                        if (bar) bar.style.background = "transparent";
                      }
                    }}
                  >
                    <div className="p-row-bar" style={{
                      position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
                      background: isOpen ? OD.medBlue : "transparent", transition: "background .2s",
                    }} />

                    {/* Client */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{
                        fontFamily: F.body, fontSize: 12.5, fontWeight: 600,
                        color: OD.text1, whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis", maxWidth: 190,
                      }}>
                        {name}
                      </span>
                      <span style={{
                        fontFamily: F.mono, fontSize: 8, fontWeight: 300,
                        letterSpacing: ".16em", color: OD.text3, textTransform: "uppercase",
                      }}>
                        {sfId(id)}
                      </span>
                    </div>

                    {/* AUM */}
                    <div style={{
                      fontFamily: F.headline, fontWeight: 600, fontSize: 15,
                      color: OD.lightBlue,
                    }}>
                      {fmtCompact(aum)}
                    </div>

                    {/* Return YTD */}
                    <div style={{
                      fontFamily: F.headline, fontWeight: 700, fontSize: retYtd !== null ? 16 : 13,
                      textAlign: "right", color: retYtd !== null ? (up ? OD.medGreen : OD.orange) : OD.text3,
                      transition: "color .3s",
                    }}
                      title={retYtd === null ? "Expand client for real-time performance data" : undefined}
                    >
                      {retYtd !== null ? `${up ? "+" : ""}${retYtd.toFixed(1)}%` : "—"}
                    </div>

                    {/* Ann. Income */}
                    <div style={{
                      fontFamily: F.headline, fontSize: client.estimatedAnnualIncome ? 14 : 13, fontWeight: 500,
                      color: client.estimatedAnnualIncome ? OD.text1 : OD.text3, textAlign: "right",
                    }}>
                      {client.estimatedAnnualIncome ? fmtCompact(client.estimatedAnnualIncome) : "—"}
                    </div>

                    {/* Risk */}
                    <div style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontSize: 7.5, fontWeight: 600,
                        letterSpacing: ".15em", textTransform: "uppercase",
                        padding: "2px 7px", borderRadius: 2,
                        color: rc.color, background: rc.bg,
                        border: `1px solid ${rc.border}`,
                      }}>
                        {capitalize(risk)}
                      </span>
                    </div>

                    {/* Allocation bar — shows "—" until real data is available */}
                    <div style={{ paddingRight: 8 }}>
                      <div style={{
                        display: "flex", height: 4, gap: 1, borderRadius: 2, overflow: "hidden",
                        marginBottom: 3, background: "rgba(45,55,72,0.4)",
                      }} />
                      <span style={{ fontFamily: F.mono, fontSize: 7, color: OD.text3 }}
                        title="Expand client for real allocation breakdown">
                        —
                      </span>
                    </div>

                    {/* Status */}
                    <div style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontSize: 7.5, fontWeight: 600,
                        letterSpacing: ".12em", textTransform: "uppercase",
                        padding: "2px 7px", borderRadius: 2,
                        color: sc.color, background: sc.bg,
                      }}>
                        {status === "active" ? "On Track" : capitalize(status)}
                      </span>
                    </div>

                    {/* Trend sparkline — uses real Orion AUM history when available */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      {retYtd !== null && aumHistoryCache[client.id || client.sfHouseholdId] ? (
                        <Sparkline value={retYtd} aumHistory={aumHistoryCache[client.id || client.sfHouseholdId]} />
                      ) : (
                        <span style={{ fontFamily: F.mono, fontSize: 8, color: OD.text3 }}>—</span>
                      )}
                    </div>

                    {/* Sync */}
                    <div style={{
                      textAlign: "right", fontFamily: F.mono, fontSize: 8, color: OD.text3,
                    }}>
                      {syncLabel}
                      <br />
                      <span style={{ fontSize: 7.5, color: OD.medBlue }}>Orion+SFDC</span>
                    </div>
                  </div>

                  {/* ── Detail Row ── */}
                  {isOpen && <DetailRow client={client} detail={detailCache[client.id]} risk={risk} />}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 24px", borderTop: `1px solid ${OD.border}`,
          background: "rgba(0,0,0,0.2)",
        }}>
          <span style={{
            fontFamily: F.mono, fontSize: 8.5, color: OD.text3,
            letterSpacing: ".12em", textTransform: "uppercase",
          }}>
            Showing {filtered.length} of {total} · SFDC: Account + FinancialAccount · Orion: /portfolios /performance /holdings · Click row to expand
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
              <span style={{ fontFamily: F.headline, fontWeight: 600, fontSize: 14, color: OD.lightBlue }}>
                {fmtCompact(bookAum)}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 7.5, color: OD.text3, letterSpacing: ".16em", textTransform: "uppercase" }}>
                Book AUM
              </span>
            </div>
            <div style={{ width: 1, height: 24, background: OD.border }} />
            {(() => {
              const returnsWithData = filtered.filter((c: any) => (c.returnPct ?? c.netReturn ?? c.returnYtd ?? null) !== null);
              const avgReturn = returnsWithData.length > 0
                ? returnsWithData.reduce((sum: number, c: any) => sum + (c.returnPct ?? c.netReturn ?? c.returnYtd ?? 0), 0) / returnsWithData.length
                : null;
              const totalIncome = filtered.reduce((sum: number, c: any) => sum + (c.estimatedAnnualIncome ?? 0), 0);
              return (
                <>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <span style={{ fontFamily: F.headline, fontWeight: 600, fontSize: 14, color: avgReturn !== null ? (avgReturn >= 0 ? OD.medGreen : OD.orange) : OD.text3 }}>
                      {avgReturn !== null ? `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%` : "—"}
                    </span>
                    <span style={{ fontFamily: F.mono, fontSize: 7.5, color: OD.text3, letterSpacing: ".16em", textTransform: "uppercase" }}>
                      Avg Return YTD
                    </span>
                  </div>
                  <div style={{ width: 1, height: 24, background: OD.border }} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <span style={{ fontFamily: F.headline, fontWeight: 600, fontSize: 14, color: totalIncome > 0 ? OD.text1 : OD.text3 }}>
                      {totalIncome > 0 ? fmtCompact(totalIncome) : "—"}
                    </span>
                    <span style={{ fontFamily: F.mono, fontSize: 7.5, color: OD.text3, letterSpacing: ".16em", textTransform: "uppercase" }}>
                      Total Income
                    </span>
                  </div>
                </>
              );
            })()}
            <div style={{ width: 1, height: 24, background: OD.border }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
              <span style={{ fontFamily: F.headline, fontWeight: 600, fontSize: 14, color: isLive ? OD.medGreen : OD.orange }}>
                {isLive ? "LIVE" : "MOCK"}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 7.5, color: OD.text3, letterSpacing: ".16em", textTransform: "uppercase" }}>
                Data Source
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
