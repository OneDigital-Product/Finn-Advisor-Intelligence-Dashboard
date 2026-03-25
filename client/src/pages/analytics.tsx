import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import NextLink from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Search,
  Sparkles,
  Loader2,
  Target,
  Activity,
  Zap,
  Mail,
  Phone,
  Video,
  ChevronRight,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { Serif, Mono, Lbl } from "@/components/design/typography";
import { Pill } from "@/components/design/pill";
import { Score } from "@/components/design/score";
import { NavTabs } from "@/components/design/nav-tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { formatCurrency } from "@/lib/format";

type AnalyticsTab = "book" | "engagement" | "ai";

const SEGMENT_COLORS: Record<string, { light: string; dark: string }> = {
  A: { light: "hsl(224, 85%, 49%)", dark: "hsl(24, 100%, 55%)" },
  B: { light: "hsl(174, 100%, 29%)", dark: "hsl(160, 72%, 45%)" },
  C: { light: "hsl(269, 100%, 65%)", dark: "hsl(40, 90%, 55%)" },
  D: { light: "hsl(37, 100%, 49%)", dark: "hsl(330, 100%, 64%)" },
};

export default function Analytics() {
  const [tab, setTab] = useState<AnalyticsTab>("book");
  const [nlQuery, setNlQuery] = useState("");
  const [queryResult, setQueryResult] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics"],
  });

  const { data: engData } = useQuery<any>({
    queryKey: ["/api/engagement/dashboard"],
  });

  const queryMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/query", { query: nlQuery }),
    onSuccess: async (res) => {
      const json = await res.json();
      setQueryResult(json.result);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const segmentData = data?.segmentAnalytics
    ? Object.entries(data.segmentAnalytics).map(([segment, vals]: [string, any]) => ({
        segment: `Tier ${segment}`,
        aum: vals.totalAum,
        clients: vals.count,
        revenue: vals.revenue,
        key: segment,
      }))
    : [];

  const pieData = segmentData.map(s => ({
    name: s.segment,
    value: s.aum,
    key: s.key,
  }));

  const capPct = data?.capacityMetrics?.utilizationPct || 0;
  const capColor = capPct > 85 ? P.red : capPct > 60 ? P.amb : P.grn;

  const tabs: { id: AnalyticsTab; label: string; count?: number }[] = [
    { id: "book", label: "Book Analysis" },
    { id: "engagement", label: "Engagement", count: engData?.signals?.length || 0 },
    { id: "ai", label: "AI Explorer" },
  ];

  return (
    <div style={{ maxWidth: 1100, width: "100%" }} className="space-y-4">
      {/* ── Tier 1: Always visible — Page header + KPI cards ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Serif as="h1" style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)" }} data-testid="text-page-title">Analytics</Serif>
        <NavTabs
          tabs={tabs}
          active={tab}
          onChange={(id) => setTab(id as AnalyticsTab)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: "Total AUM", value: formatCurrency(data?.totalAum || 0), icon: <DollarSign style={{ width: 16, height: 16, color: P.blue }} />, color: "var(--color-bg)", testId: "text-analytics-aum" },
          { label: "Total Clients", value: data?.totalClients || 0, icon: <Users style={{ width: 16, height: 16, color: P.grn }} />, color: "var(--color-text-secondary)" },
          { label: "At-Risk Clients", value: data?.atRiskClients?.length || 0, icon: <AlertTriangle style={{ width: 16, height: 16, color: P.amb }} />, color: P.amb },
          { label: "Capacity", value: `${capPct.toFixed(0)}%`, icon: <Target style={{ width: 16, height: 16, color: capColor }} />, color: capColor, bar: capPct },
        ].map((s, i) => (
          <div key={i} className="animate-fu" style={{
            padding: 16, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)",
            animationDelay: `${i * 50}ms`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Lbl>{s.label}</Lbl>
              {s.icon}
            </div>
            <Serif style={{ fontSize: 24, fontWeight: 600, color: s.color, display: "block" }} as="p" data-testid={s.testId}>{s.value}</Serif>
            {s.bar !== undefined && (
              <div style={{ height: 4, borderRadius: 99, background: "var(--color-surface-raised)", marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, width: `${s.bar}%`, background: capColor, transition: "width 1s ease" }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Tier 2: Tab panels ── */}

      {tab === "book" && (
        <div role="tabpanel" id="tabpanel-book" className="space-y-4">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <BarChart3 style={{ width: 16, height: 16, color: P.blue }} />
                <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>AUM by Segment</Serif>
              </div>
              <ChartContainer
                config={{
                  aum: { label: "AUM", color: "hsl(var(--chart-1))" },
                } satisfies ChartConfig}
                className="h-[250px] w-full"
              >
                <BarChart data={segmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="aum" fill="var(--color-aum)" radius={[0, 0, 0, 0]} name="AUM" />
                </BarChart>
              </ChartContainer>
            </div>

            <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Users style={{ width: 16, height: 16, color: P.grn }} />
                <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Client Segmentation</Serif>
              </div>
              <ChartContainer
                config={Object.fromEntries(
                  segmentData.map((seg) => [
                    seg.key,
                    {
                      label: seg.segment,
                      theme: SEGMENT_COLORS[seg.key] || { light: "hsl(200, 65%, 40%)", dark: "hsl(200, 65%, 55%)" },
                    },
                  ])
                ) satisfies ChartConfig}
                className="aspect-auto h-[220px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} nameKey="key" />}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="key"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.key}`} fill={`var(--color-${entry.key})`} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} style={{ fontSize: 20, fontWeight: 600, fill: "hsl(var(--foreground))" }}>
                                {data?.totalClients || 0}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}>
                                Clients
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            </div>

            <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle style={{ width: 16, height: 16, color: P.amb }} />
                  <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>At-Risk Clients</Serif>
                </div>
                <Pill label={`${data?.atRiskClients?.length || 0}`} c={P.amb} bg={P.aL} />
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {data?.atRiskClients?.map((client: any, idx: number) => (
                  <NextLink href={`/clients/${client.id}`} key={client.id}>
                    <div className="animate-si hv-glow" style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px",
                      borderRadius: 6, marginBottom: 6, border: "1px solid var(--color-border)",
                      cursor: "pointer", animationDelay: `${idx * 30}ms`,
                    }} data-testid={`at-risk-${client.id}`}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>{client.name}</span>
                        <Mono style={{ fontSize: 10, color: P.lt, display: "block", marginTop: 2 }}>
                          Last contact: {client.daysSinceContact} days ago
                        </Mono>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Mono style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{formatCurrency(client.totalAum)}</Mono>
                        <Pill label={`Tier ${client.segment}`} c={P.blue} bg={P.bFr} />
                      </div>
                    </div>
                  </NextLink>
                ))}
                {(!data?.atRiskClients || data.atRiskClients.length === 0) && (
                  <p style={{ fontSize: 12, color: P.lt, textAlign: "center", padding: "16px 0" }}>No at-risk clients</p>
                )}
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <TrendingUp style={{ width: 16, height: 16, color: P.grn }} />
                <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Revenue by Segment</Serif>
              </div>
              <ChartContainer
                config={{
                  revenue: { label: "Est. Revenue", color: "hsl(var(--chart-2))" },
                } satisfies ChartConfig}
                className="h-[200px] w-full"
              >
                <BarChart data={segmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 0, 0, 0]} name="Est. Revenue" />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          {/* Overdue Reviews */}
          {data?.overdueReviews?.length > 0 && (
            <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <AlertTriangle style={{ width: 16, height: 16, color: P.red }} />
                <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Overdue Reviews</Serif>
                <Pill label={`${data.overdueReviews.length}`} c={P.red} bg={P.rL} />
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {data.overdueReviews.map((client: any) => (
                  <NextLink href={`/clients/${client.id}`} key={client.id}>
                    <div className="hv-glow" style={{
                      display: "flex", justifyContent: "space-between", padding: "8px 10px",
                      borderRadius: 6, marginBottom: 4, cursor: "pointer",
                      borderLeft: `3px solid ${P.red}`,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>{client.name}</span>
                      <Mono style={{ fontSize: 10, color: P.red }}>{client.daysSinceContact}d overdue</Mono>
                    </div>
                  </NextLink>
                ))}
              </div>
            </div>
          )}

          {/* Referral Sources */}
          {data?.referralSources?.length > 0 && (
            <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Users style={{ width: 16, height: 16, color: P.blue }} />
                <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Referral Sources</Serif>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.referralSources.map((source: string) => (
                  <span key={source} style={{
                    fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 20,
                    background: "var(--color-surface-raised)", color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border)",
                  }}>{source}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "engagement" && (
        <div role="tabpanel" id="tabpanel-engagement" className="space-y-4">
          {/* Compliance & Capacity card */}
          <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Activity style={{ width: 16, height: 16, color: P.grn }} />
              <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Engagement Overview</Serif>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <Lbl>Compliance Health</Lbl>
                <Mono style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  {data?.complianceOverview?.current || 0}/{(data?.complianceOverview?.current || 0) + (data?.complianceOverview?.expiringSoon || 0) + (data?.complianceOverview?.overdue || 0) + (data?.complianceOverview?.pending || 0)} current
                </Mono>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: "var(--color-surface-raised)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${P.bHi}, ${P.grn})`,
                  width: `${((data?.complianceOverview?.current || 0) / Math.max(1, (data?.complianceOverview?.current || 0) + (data?.complianceOverview?.expiringSoon || 0) + (data?.complianceOverview?.overdue || 0) + (data?.complianceOverview?.pending || 0))) * 100}%`,
                  transition: "width 1s ease",
                }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Current", count: data?.complianceOverview?.current || 0, color: P.grn },
                { label: "Expiring Soon", count: data?.complianceOverview?.expiringSoon || 0, color: P.amb },
                { label: "Overdue", count: data?.complianceOverview?.overdue || 0, color: P.red },
                { label: "Pending", count: data?.complianceOverview?.pending || 0, color: P.lt },
              ].map((c, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 6, background: "var(--color-surface-raised)", textAlign: "center" }}>
                  <Serif style={{ fontSize: 18, fontWeight: 600, color: c.color, display: "block" }}>{c.count}</Serif>
                  <Lbl>{c.label}</Lbl>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <Lbl>Advisor Capacity</Lbl>
                <Mono style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  {data?.capacityMetrics?.currentClients || 0} / {data?.capacityMetrics?.maxCapacity || 0}
                </Mono>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: "var(--color-surface-raised)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, background: capColor,
                  width: `${capPct}%`, transition: "width 1s ease",
                }} />
              </div>
            </div>
          </div>

          {/* Engagement Intelligence card */}
          {engData && (
            <div style={{ padding: 20, borderRadius: 6, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap style={{ width: 16, height: 16, color: P.amb }} />
                  <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Engagement Intelligence</Serif>
                </div>
                <NextLink href="/engagement">
                  <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 600, color: P.blue, cursor: "pointer" }} data-testid="link-engagement-details">
                    Details <ChevronRight style={{ width: 12, height: 12 }} />
                  </span>
                </NextLink>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 12, borderRadius: 6, background: "var(--color-surface-raised)", textAlign: "center" }}>
                  <Serif style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-secondary)", display: "block" }} data-testid="text-engagement-scores">
                    {engData.scores?.length || 0}
                  </Serif>
                  <Lbl>Scored Clients</Lbl>
                </div>
                <div style={{ padding: 12, borderRadius: 6, background: "var(--color-surface-raised)", textAlign: "center" }}>
                  <Serif style={{ fontSize: 22, fontWeight: 700, color: P.amb, display: "block" }} data-testid="text-engagement-signals">
                    {engData.signals?.length || 0}
                  </Serif>
                  <Lbl>Active Signals</Lbl>
                </div>
                <div style={{ padding: 12, borderRadius: 6, background: "var(--color-surface-raised)", textAlign: "center" }}>
                  <Serif style={{ fontSize: 22, fontWeight: 700, color: P.blue, display: "block" }} data-testid="text-engagement-actions">
                    {engData.actions?.length || 0}
                  </Serif>
                  <Lbl>Pending Actions</Lbl>
                </div>
              </div>
              {(engData.actions?.length > 0) && (
                <div>
                  <Lbl style={{ marginBottom: 8, display: "block" }}>Top Recommended Actions</Lbl>
                  {engData.actions.slice(0, 3).map((action: any) => (
                    <div
                      key={action.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                        borderRadius: 6, marginBottom: 4,
                        borderLeft: `3px solid ${action.priority > 80 ? P.red : action.priority > 60 ? P.amb : P.blue}`,
                      }}
                      data-testid={`analytics-nba-${action.id}`}
                    >
                      {action.actionType === "email" ? <Mail style={{ width: 12, height: 12, color: P.blue }} /> :
                       action.actionType === "call" ? <Phone style={{ width: 12, height: 12, color: P.grn }} /> :
                       action.actionType === "meeting" ? <Video style={{ width: 12, height: 12, color: P.amb }} /> :
                       <Target style={{ width: 12, height: 12, color: "var(--color-text-tertiary)" }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>{action.title}</span>
                        {action.clientName && (
                          <span style={{ fontSize: 10, color: P.lt, marginLeft: 6 }}>{action.clientName}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                        background: action.priority > 80 ? P.rL : "var(--color-surface-raised)",
                        color: action.priority > 80 ? P.red : action.priority > 60 ? P.amb : "var(--color-text-tertiary)",
                      }}>{action.priority}</span>
                    </div>
                  ))}
                </div>
              )}
              {(engData.recentEvents?.length > 0) && (
                <div style={{ marginTop: 12 }}>
                  <Lbl style={{ marginBottom: 8, display: "block" }}>Recent Engagement Events</Lbl>
                  {engData.recentEvents.slice(0, 4).map((ev: any, idx: number) => (
                    <div key={ev.id || idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: P.blue, flexShrink: 0 }} />
                      <Mono style={{ fontSize: 10, color: P.lt, minWidth: 56 }}>
                        {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </Mono>
                      <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{ev.eventType?.replace(/_/g, " ")}</span>
                      {ev.clientName && <span style={{ fontSize: 10, color: P.lt }}>· {ev.clientName}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "ai" && (
        <div role="tabpanel" id="tabpanel-ai" className="space-y-4">
          <div style={{
            padding: 20, borderRadius: 6, background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Sparkles style={{ width: 16, height: 16, color: P.blue }} />
              <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Ask About Your Book</Serif>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Input
                placeholder="e.g., Show me clients with over $2M who have not had a review in 6 months"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nlQuery && queryMutation.mutate()}
                className="flex-1"
                data-testid="input-ai-query"
              />
              <Button
                size="sm"
                onClick={() => queryMutation.mutate()}
                disabled={queryMutation.isPending || !nlQuery}
                data-testid="button-ai-query"
              >
                {queryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {queryResult && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: "var(--color-surface-raised)", fontSize: 12, whiteSpace: "pre-wrap", color: "var(--color-text-tertiary)" }} data-testid="text-query-result">
                {queryResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
