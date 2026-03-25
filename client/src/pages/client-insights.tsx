import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import NextLink from "next/link";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  Target,
  Activity,
  Zap,
  Shield,
  Eye,
  PieChart,
  ChevronRight,
  ChevronDown,
  Bell,
  Briefcase,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Gauge,
  Star,
  ThumbsUp,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { Serif, Mono, Lbl, Supporting, TS } from "@/components/design/typography";
import { Pill } from "@/components/design/pill";
import { NavTabs } from "@/components/design/nav-tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";

const TIER_COLORS: Record<string, string> = {
  A: "hsl(224, 85%, 49%)",
  B: "hsl(174, 100%, 29%)",
  C: "hsl(269, 100%, 65%)",
  D: "hsl(37, 100%, 49%)",
  E: "hsl(340, 80%, 55%)",
  F: "hsl(200, 50%, 60%)",
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  HIGH: { bg: P.rL, text: P.red, border: `${P.red}40` },
  MEDIUM: { bg: P.aL, text: P.amb, border: `${P.amb}40` },
  LOW: { bg: P.odSurf2, text: P.lt, border: P.odBorder },
};

type TabId = "book" | "alerts" | "opportunities" | "risk" | "performance";

interface TrendPoint { period: string; value: number }

interface InsightsDashboard {
  bookAnalytics: {
    totalAum: number; totalClients: number; totalRevenue: number; avgAumPerClient: number;
    clientRanking: Array<{ id: string; name: string; totalAum: number; revenue: number; feeRate: number; rank: number; cumulativePct: number; segment: string; engagementScore: number | null }>;
    hhi: { hhi: number; riskLevel: string; riskColor: string; mitigationStrategy: string };
    revenueConcentration: { top5Pct: number; top10Pct: number; top20Pct: number; medianRevenuePerClient: number; totalRevenue: number; whatIfTop5Loss: number; mitigationStrategies: Array<{ strategy: string; projectedLift: number; description: string }> };
  };
  segmentation: { byTier: Array<{ tier: string; label: string; count: number; totalAum: number; avgAum: number; totalRevenue: number }>; byLifeStage: Array<{ stage: string; count: number; totalAum: number; avgAum: number }>; byGrowth: Array<{ category: string; count: number; totalAum: number; avgAum: number }> };
  alerts: Array<{ id: string; category: string; priority: string; clientId: string; clientName: string; trigger: string; action: string; objective: string; timeline: string; owner: string; status: string; dueDate: string }>;
  opportunityPipeline: {
    crossSell: Array<{ service: string; penetrationRate: number; clientsWithout: number; revenueOpportunity: number; priority: string }>;
    referralCandidates: Array<{ clientId: string; clientName: string; score: number; tier: string; factors: Record<string, number>; projectedReferrals: number }>;
    assetsNotHeld: Array<{ clientId: string; clientName: string; estimatedOutsideAssets: number; breakdown: Array<{ category: string; estimated: number }>; captureTimeline: string; probability: number }>;
    upgradeCandidates: Array<{ clientId: string; clientName: string; currentTier: string; recommendedTier: string; currentRevenue: number; projectedRevenue: number; revenueLift: number }>;
    totalOpportunityValue: number;
  };
  riskDashboard: {
    concentration: { aumHhi: number; revenueHhi: number; aumRiskLevel: string; revenueRiskLevel: string };
    compliance: { missingIps: number; outdatedDisclosures: number; capacityConcerns: boolean; items: Array<{ clientId: string; clientName: string; issue: string; severity: string }> };
    retentionRisks: Array<{ clientId: string; clientName: string; riskScore: number; factors: string[]; improvementPlan: string }>;
    marketSensitivity: Array<{ clientId: string; clientName: string; currentAum: number; impact15Pct: number; impact25Pct: number; behavioralRisk: string; riskTolerance: string }>;
  };
  performanceMetrics: {
    avgSatisfaction: number; npsScore: number; revenueGrowthPct: number; totalRevenue: number; avgResponseTime: number;
    clientsServed: number; reviewsCompleted: number; reviewsOverdue: number;
    satisfactionTrend: TrendPoint[]; revenueTrend: TrendPoint[]; activityVolumeTrend: TrendPoint[];
    serviceEfficiency: { activitiesPerClient: number; avgDaysBetweenContacts: number; reviewCompletionRate: number };
  };
}

export default function ClientInsightsPage() {
  const [tab, setTab] = useState<TabId>("book");
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<InsightsDashboard>({
    queryKey: ["/api/client-insights"],
  });

  const alertStatusMutation = useMutation({
    mutationFn: async ({ alertId, status }: { alertId: string; status: string }) => {
      return apiRequest("PATCH", `/api/client-insights/alerts/${alertId}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/client-insights"] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1100 }} className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ maxWidth: 1100 }} className="space-y-4">
        <Serif as="h1" style={{ fontSize: TS.title, fontWeight: 600, color: P.odT1 }}>Client Insights Dashboard</Serif>
        <div style={{ padding: 32, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, textAlign: "center" }}>
          <AlertTriangle style={{ width: 32, height: 32, color: P.red, margin: "0 auto 12px" }} />
          <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT2, display: "block", marginBottom: 8 }}>
            Unable to load insights
          </Serif>
          <Supporting style={{ marginBottom: 16 }}>
            {error instanceof Error ? error.message : "An error occurred while generating the client insights dashboard. Please try again."}
          </Supporting>
          <button
            onClick={() => refetch()}
            style={{
              padding: "8px 20px", borderRadius: 6, border: `1px solid ${P.blue}`, background: P.bIce,
              color: P.blue, fontWeight: 600, fontSize: 12, cursor: "pointer",
            }}
            data-testid="button-retry-insights"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const emptyBook: InsightsDashboard["bookAnalytics"] = { totalAum: 0, totalClients: 0, totalRevenue: 0, avgAumPerClient: 0, clientRanking: [], hhi: { hhi: 0, riskLevel: "low", riskColor: "green", mitigationStrategy: "" }, revenueConcentration: { top5Pct: 0, top10Pct: 0, top20Pct: 0, medianRevenuePerClient: 0, totalRevenue: 0, whatIfTop5Loss: 0, mitigationStrategies: [] } };
  const emptyPerf: InsightsDashboard["performanceMetrics"] = { avgSatisfaction: 0, npsScore: 0, revenueGrowthPct: 0, totalRevenue: 0, avgResponseTime: 0, clientsServed: 0, reviewsCompleted: 0, reviewsOverdue: 0, satisfactionTrend: [], revenueTrend: [], activityVolumeTrend: [], serviceEfficiency: { activitiesPerClient: 0, avgDaysBetweenContacts: 0, reviewCompletionRate: 0 } };

  const book = data?.bookAnalytics ?? emptyBook;
  const seg = data?.segmentation ?? { byTier: [], byLifeStage: [], byGrowth: [] };
  const alerts = data?.alerts ?? [];
  const opp = data?.opportunityPipeline ?? { crossSell: [], referralCandidates: [], assetsNotHeld: [], upgradeCandidates: [], totalOpportunityValue: 0 };
  const risk = data?.riskDashboard ?? { concentration: { aumHhi: 0, revenueHhi: 0, aumRiskLevel: "Low", revenueRiskLevel: "Low" }, compliance: { missingIps: 0, outdatedDisclosures: 0, capacityConcerns: false, items: [] }, retentionRisks: [], marketSensitivity: [] };
  const perf = data?.performanceMetrics ?? emptyPerf;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "book", label: "Book Analytics" },
    { id: "alerts", label: "Proactive Alerts", count: alerts.length },
    { id: "opportunities", label: "Opportunity Pipeline" },
    { id: "risk", label: "Risk Dashboard" },
    { id: "performance", label: "Performance" },
  ];

  const toggleAlert = (id: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 1100 }} className="space-y-4">
      <Serif as="h1" style={{ fontSize: TS.title, fontWeight: 600, color: P.odT1 }} data-testid="text-page-title">
        Client Insights Dashboard
      </Serif>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { l: "Total AUM", v: formatCurrency(book.totalAum || 0), c: P.odBg, icon: <DollarSign style={{ width: 14, height: 14 }} />, testId: "text-total-aum" },
          { l: "Total Clients", v: String(book.totalClients || 0), c: P.odT2, icon: <Users style={{ width: 14, height: 14 }} />, testId: "text-total-clients" },
          { l: "Est. Revenue", v: formatCurrency(book.totalRevenue || 0), c: P.grn, icon: <TrendingUp style={{ width: 14, height: 14 }} />, testId: "text-total-revenue" },
          { l: "Active Alerts", v: String(alerts.length || 0), c: alerts.length > 5 ? P.red : P.amb, icon: <Bell style={{ width: 14, height: 14 }} />, testId: "text-active-alerts" },
        ].map((m, i) => (
          <div
            key={i}
            className="animate-fu"
            style={{
              padding: "16px 20px", borderRadius: 6, background: P.odSurf,
              border: `1px solid ${P.odBorder}`, animationDelay: `${i * 50}ms`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Lbl>{m.l}</Lbl>
              <div style={{ color: m.c }}>{m.icon}</div>
            </div>
            <Serif style={{ fontSize: TS.title, fontWeight: 600, color: m.c }} data-testid={m.testId}>{m.v}</Serif>
          </div>
        ))}
      </div>

      <NavTabs tabs={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === "book" && (
        <div className="space-y-4">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Gauge style={{ width: 14, height: 14, color: book.hhi?.riskColor === "red" ? P.red : book.hhi?.riskColor === "yellow" ? P.amb : P.grn }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Concentration Index (HHI)</Serif>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                <Serif style={{ fontSize: 36, fontWeight: 700, color: book.hhi?.riskColor === "red" ? P.red : book.hhi?.riskColor === "yellow" ? P.amb : P.grn }} data-testid="text-hhi-score">
                  {book.hhi?.hhi || 0}
                </Serif>
                <Pill
                  label={book.hhi?.riskLevel || "low"}
                  c={book.hhi?.riskColor === "red" ? P.red : book.hhi?.riskColor === "yellow" ? P.amb : P.grn}
                  bg={book.hhi?.riskColor === "red" ? P.rL : book.hhi?.riskColor === "yellow" ? P.aL : P.gL}
                />
              </div>
              <Supporting>{book.hhi?.mitigationStrategy}</Supporting>
              <div style={{ marginTop: 12, padding: 10, borderRadius: 4, background: P.odSurf2 }}>
                <Lbl>HHI Scale</Lbl>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  {[
                    { label: "< 1500", desc: "Diversified", color: P.grn },
                    { label: "1500-2500", desc: "Moderate", color: P.amb },
                    { label: "> 2500", desc: "Concentrated", color: P.red },
                  ].map((s, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ height: 4, borderRadius: 99, background: s.color, marginBottom: 4 }} />
                      <Mono style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</Mono>
                      <div style={{ fontSize: 10, color: P.lt }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <DollarSign style={{ width: 14, height: 14, color: P.blue }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Revenue Concentration</Serif>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Top 5", value: `${(book.revenueConcentration?.top5Pct || 0).toFixed(1)}%` },
                  { label: "Top 10", value: `${(book.revenueConcentration?.top10Pct || 0).toFixed(1)}%` },
                  { label: "Top 20", value: `${(book.revenueConcentration?.top20Pct || 0).toFixed(1)}%` },
                ].map((s, i) => (
                  <div key={i} style={{ padding: 10, borderRadius: 4, background: P.odSurf2, textAlign: "center" }}>
                    <Serif style={{ fontSize: 18, fontWeight: 700, color: P.odT2, display: "block" }} data-testid={`text-revenue-top-${s.label.toLowerCase().replace(" ", "")}`}>{s.value}</Serif>
                    <Lbl>{s.label} Revenue</Lbl>
                  </div>
                ))}
              </div>
              <div style={{ padding: 10, borderRadius: 4, background: `${P.red}08`, border: `1px solid ${P.red}15`, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <AlertTriangle style={{ width: 12, height: 12, color: P.red }} />
                  <Lbl style={{ color: P.red }}>What-If: Loss of Top 5 Clients</Lbl>
                </div>
                <Serif style={{ fontSize: 20, fontWeight: 700, color: P.red }} data-testid="text-whatif-loss">
                  -{formatCurrency(book.revenueConcentration?.whatIfTop5Loss || 0)}
                </Serif>
                <Supporting style={{ marginTop: 2 }}>
                  {book.totalRevenue > 0 ? `${((book.revenueConcentration?.whatIfTop5Loss || 0) / book.totalRevenue * 100).toFixed(1)}% of total revenue` : ""}
                </Supporting>
              </div>
              <Lbl style={{ display: "block", marginBottom: 6 }}>Mitigation Strategies</Lbl>
              {(book.revenueConcentration?.mitigationStrategies || []).map((s: { strategy: string; projectedLift: number; description: string }, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 4, marginBottom: 4, background: P.odSurf2 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: P.odT2 }}>{s.strategy}</span>
                    <Supporting style={{ fontSize: 10 }}>{s.description}</Supporting>
                  </div>
                  <Mono style={{ fontSize: 11, fontWeight: 700, color: P.grn }}>+{formatCurrency(s.projectedLift)}</Mono>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <BarChart3 style={{ width: 14, height: 14, color: P.blue }} />
              <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Top 20 Clients by AUM</Serif>
            </div>
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.odBorder}` }}>
                    {["Rank", "Client", "Segment", "AUM", "Revenue", "Cumulative %", "Engagement"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: P.lt, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(book.clientRanking || []).map((c) => (
                    <tr key={c.id} className="hv-glow" style={{ borderBottom: `1px solid ${P.odBorder}`, cursor: "pointer" }} data-testid={`row-client-${c.id}`}>
                      <td style={{ padding: "8px 10px" }}>
                        <Mono style={{ fontSize: 11, fontWeight: 600, color: P.odT3 }}>#{c.rank}</Mono>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <NextLink href={`/clients/${c.id}`}>
                          <span style={{ fontWeight: 600, color: P.odT2, fontSize: 12 }}>{c.name}</span>
                        </NextLink>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Pill label={`Tier ${c.segment}`} c={P.blue} bg={P.bFr} />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Mono style={{ fontSize: 12, fontWeight: 600, color: P.odT2 }}>{formatCurrency(c.totalAum)}</Mono>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Mono style={{ fontSize: 11, color: P.grn }}>{formatCurrency(c.revenue)}</Mono>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 50, height: 4, borderRadius: 99, background: P.odSurf2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(100, c.cumulativePct)}%`, background: P.blue, borderRadius: 99 }} />
                          </div>
                          <Mono style={{ fontSize: 10, color: P.lt }}>{c.cumulativePct.toFixed(1)}%</Mono>
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.engagementScore !== null ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                            background: c.engagementScore >= 70 ? P.gL : c.engagementScore >= 40 ? P.aL : P.rL,
                            color: c.engagementScore >= 70 ? P.grn : c.engagementScore >= 40 ? P.amb : P.red,
                          }}>{c.engagementScore}</span>
                        ) : <span style={{ fontSize: 10, color: P.lt }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <SegmentPanel title="By Tier" icon={<PieChart style={{ width: 14, height: 14, color: P.blue }} />} data={seg.byTier || []} labelKey="label" />
            <SegmentPanel title="By Life Stage" icon={<Users style={{ width: 14, height: 14, color: P.grn }} />} data={seg.byLifeStage || []} labelKey="stage" />
            <SegmentPanel title="By Growth" icon={<TrendingUp style={{ width: 14, height: 14, color: P.amb }} />} data={seg.byGrowth || []} labelKey="category" />
          </div>
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-3">
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {["HIGH", "MEDIUM", "LOW"].map(p => {
              const count = alerts.filter((a) => a.priority === p).length;
              const s = PRIORITY_STYLES[p];
              return (
                <div key={p} style={{ padding: "8px 16px", borderRadius: 6, background: s.bg, border: `1px solid ${s.border}`, textAlign: "center", minWidth: 80 }}>
                  <Serif style={{ fontSize: 18, fontWeight: 700, color: s.text, display: "block" }}>{count}</Serif>
                  <Lbl style={{ color: s.text }}>{p}</Lbl>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Bell style={{ width: 14, height: 14, color: P.amb }} />
              <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Alert Queue</Serif>
              <Pill label={`${alerts.length} active`} c={P.amb} bg={P.aL} />
            </div>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              {alerts.map((alert) => {
                const ps = PRIORITY_STYLES[alert.priority] || PRIORITY_STYLES.LOW;
                const expanded = expandedAlerts.has(alert.id);
                return (
                  <div
                    key={alert.id}
                    style={{
                      padding: "12px 14px", borderRadius: 6, marginBottom: 8,
                      border: `1px solid ${ps.border}`, background: alert.priority === "HIGH" ? `${P.rL}80` : P.odSurf,
                      cursor: "pointer",
                    }}
                    onClick={() => toggleAlert(alert.id)}
                    data-testid={`alert-card-${alert.id}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <AlertCircle style={{ width: 14, height: 14, color: ps.text, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: P.odT2 }}>{alert.trigger}</span>
                          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                            <NextLink href={`/clients/${alert.clientId}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              <span style={{ fontSize: 11, color: P.blue, fontWeight: 600 }}>{alert.clientName}</span>
                            </NextLink>
                            <Pill label={alert.category.replace(/_/g, " ")} c={P.odT3} bg={P.odSurf2} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <Pill label={alert.priority} c={ps.text} bg={ps.bg} />
                        <Mono style={{ fontSize: 10, color: P.lt }}>{alert.dueDate}</Mono>
                        {expanded ? <ChevronDown style={{ width: 14, height: 14, color: P.lt }} /> : <ChevronRight style={{ width: 14, height: 14, color: P.lt }} />}
                      </div>
                    </div>
                    {expanded && (
                      <div style={{ marginTop: 10, padding: 10, borderRadius: 4, background: P.odSurf2 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                          <div><Lbl>Action</Lbl><p style={{ color: P.odT2, marginTop: 2 }}>{alert.action}</p></div>
                          <div><Lbl>Objective</Lbl><p style={{ color: P.odT2, marginTop: 2 }}>{alert.objective}</p></div>
                          <div><Lbl>Timeline</Lbl><p style={{ color: P.odT2, marginTop: 2 }}>{alert.timeline}</p></div>
                          <div><Lbl>Owner</Lbl><p style={{ color: P.odT2, marginTop: 2 }}>{alert.owner}</p></div>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 10, borderTop: `1px solid ${P.odBorder}`, paddingTop: 10 }}>
                          <Lbl style={{ alignSelf: "center", marginRight: 4 }}>Status:</Lbl>
                          <Pill label={alert.status} c={alert.status === "completed" ? P.grn : alert.status === "in-progress" ? P.blue : alert.status === "deferred" ? P.lt : P.amb} bg={alert.status === "completed" ? P.gL : alert.status === "in-progress" ? P.bIce : P.odSurf2} />
                          {(["in-progress", "completed", "deferred"] as const).filter(s => s !== alert.status).map(newStatus => (
                            <button
                              key={newStatus}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                alertStatusMutation.mutate({ alertId: alert.id, status: newStatus });
                              }}
                              disabled={alertStatusMutation.isPending}
                              style={{
                                padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                                border: `1px solid ${P.odBorder}`, background: P.odSurf, color: P.odT3,
                              }}
                              data-testid={`button-alert-${alert.id}-${newStatus}`}
                            >
                              {newStatus === "in-progress" ? "Start" : newStatus === "completed" ? "Complete" : "Defer"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {alerts.length === 0 && (
                <p style={{ fontSize: 12, color: P.lt, textAlign: "center", padding: "32px 0" }}>No proactive alerts generated.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "opportunities" && (
        <div className="space-y-4">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, textAlign: "center" }}>
              <Serif style={{ fontSize: 22, fontWeight: 700, color: P.grn, display: "block" }} data-testid="text-total-opportunity">
                {formatCurrency(opp.totalOpportunityValue || 0)}
              </Serif>
              <Lbl>Total Opportunity Value</Lbl>
            </div>
            <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, textAlign: "center" }}>
              <Serif style={{ fontSize: 22, fontWeight: 700, color: P.blue, display: "block" }}>
                {(opp.referralCandidates || []).length}
              </Serif>
              <Lbl>Referral Candidates</Lbl>
            </div>
            <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, textAlign: "center" }}>
              <Serif style={{ fontSize: 22, fontWeight: 700, color: P.amb, display: "block" }}>
                {(opp.upgradeCandidates || []).length}
              </Serif>
              <Lbl>Upgrade Candidates</Lbl>
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Briefcase style={{ width: 14, height: 14, color: P.blue }} />
              <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Cross-Sell Analysis</Serif>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {(opp.crossSell || []).map((cs, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 6, marginBottom: 4, border: `1px solid ${P.odBorder}` }} data-testid={`crosssell-${i}`}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: P.odT2 }}>{cs.service}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <div style={{ width: 80, height: 4, borderRadius: 99, background: P.odSurf2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${cs.penetrationRate}%`, background: P.blue, borderRadius: 99 }} />
                      </div>
                      <Mono style={{ fontSize: 10, color: P.lt }}>{cs.penetrationRate.toFixed(0)}% penetration</Mono>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Mono style={{ fontSize: 12, fontWeight: 600, color: P.grn }}>{formatCurrency(cs.revenueOpportunity)}</Mono>
                    <div><Pill label={cs.priority} c={cs.priority === "HIGH" ? P.red : cs.priority === "MEDIUM" ? P.amb : P.lt} bg={cs.priority === "HIGH" ? P.rL : cs.priority === "MEDIUM" ? P.aL : P.odSurf2} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <UserCheck style={{ width: 14, height: 14, color: P.grn }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Referral Potential</Serif>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {(opp.referralCandidates || []).map((rc) => (
                  <div key={rc.clientId} style={{ padding: "10px 12px", borderRadius: 6, marginBottom: 4, border: `1px solid ${P.odBorder}` }} data-testid={`referral-${rc.clientId}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <NextLink href={`/clients/${rc.clientId}`}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: P.odT2 }}>{rc.clientName}</span>
                      </NextLink>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                          background: rc.tier === "Advocate" ? P.gL : rc.tier === "Promoter" ? P.bIce : rc.tier === "At-Risk" ? P.rL : P.odSurf2,
                          color: rc.tier === "Advocate" ? P.grn : rc.tier === "Promoter" ? P.blue : rc.tier === "At-Risk" ? P.red : P.odT3,
                        }}>{rc.tier}</span>
                        <Mono style={{ fontSize: 12, fontWeight: 700, color: P.odT2 }}>{rc.score}</Mono>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {Object.entries(rc.factors || {}).map(([k, v]) => (
                        <div key={k} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: 3, borderRadius: 99, background: P.odSurf2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${v}%`, background: v >= 70 ? P.grn : v >= 40 ? P.amb : P.red, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 10, color: P.lt, textTransform: "capitalize" }}>{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <ArrowUpRight style={{ width: 14, height: 14, color: P.amb }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Assets Not Held</Serif>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {(opp.assetsNotHeld || []).map((a) => (
                  <div key={a.clientId} style={{ padding: "10px 12px", borderRadius: 6, marginBottom: 4, border: `1px solid ${P.odBorder}` }} data-testid={`assets-not-held-${a.clientId}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <NextLink href={`/clients/${a.clientId}`}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: P.odT2 }}>{a.clientName}</span>
                      </NextLink>
                      <Mono style={{ fontSize: 12, fontWeight: 700, color: P.grn }}>{formatCurrency(a.estimatedOutsideAssets)}</Mono>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Mono style={{ fontSize: 10, color: P.lt }}>{a.captureTimeline}</Mono>
                      <span style={{ fontSize: 10, fontWeight: 600, color: a.probability > 60 ? P.grn : P.amb }}>{a.probability}% prob.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(opp.upgradeCandidates || []).length > 0 && (
            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <TrendingUp style={{ width: 14, height: 14, color: P.grn }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Service Tier Upgrades</Serif>
              </div>
              {(opp.upgradeCandidates || []).map((u) => (
                <div key={u.clientId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 6, marginBottom: 4, border: `1px solid ${P.odBorder}` }} data-testid={`upgrade-${u.clientId}`}>
                  <div style={{ flex: 1 }}>
                    <NextLink href={`/clients/${u.clientId}`}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: P.odT2 }}>{u.clientName}</span>
                    </NextLink>
                    <div style={{ fontSize: 11, color: P.odT3, marginTop: 2 }}>
                      {u.currentTier} → {u.recommendedTier}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Mono style={{ fontSize: 11, color: P.grn, fontWeight: 600 }}>+{formatCurrency(u.revenueLift)}/yr</Mono>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "risk" && (
        <div className="space-y-4">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <PieChart style={{ width: 14, height: 14, color: P.blue }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Concentration Risk</Serif>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "AUM HHI", value: risk.concentration?.aumHhi || 0, level: risk.concentration?.aumRiskLevel || "Low" },
                  { label: "Revenue HHI", value: risk.concentration?.revenueHhi || 0, level: risk.concentration?.revenueRiskLevel || "Low" },
                ].map((r, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                    <Serif style={{ fontSize: 22, fontWeight: 700, color: r.level === "High" ? P.red : r.level === "Moderate" ? P.amb : P.grn, display: "block" }} data-testid={`text-risk-${r.label.toLowerCase().replace(" ", "-")}`}>
                      {r.value}
                    </Serif>
                    <Lbl>{r.label}</Lbl>
                    <Pill label={r.level} c={r.level === "High" ? P.red : r.level === "Moderate" ? P.amb : P.grn} bg={r.level === "High" ? P.rL : r.level === "Moderate" ? P.aL : P.gL} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Shield style={{ width: 14, height: 14, color: P.amb }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Compliance Attention</Serif>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Missing IPS", value: risk.compliance?.missingIps || 0, color: P.red },
                  { label: "Outdated Disclosures", value: risk.compliance?.outdatedDisclosures || 0, color: P.amb },
                  { label: "Capacity", value: risk.compliance?.capacityConcerns ? "⚠" : "✓", color: risk.compliance?.capacityConcerns ? P.amb : P.grn },
                ].map((c, i) => (
                  <div key={i} style={{ padding: 10, borderRadius: 4, background: P.odSurf2, textAlign: "center" }}>
                    <Serif style={{ fontSize: 18, fontWeight: 700, color: c.color, display: "block" }}>{c.value}</Serif>
                    <Lbl>{c.label}</Lbl>
                  </div>
                ))}
              </div>
              {(risk.compliance?.items || []).length > 0 && (
                <div>
                  <Lbl style={{ display: "block", marginBottom: 6 }}>Issues Requiring Attention</Lbl>
                  {(risk.compliance?.items || []).map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderRadius: 4, marginBottom: 2, borderLeft: `3px solid ${item.severity === "high" ? P.red : P.amb}` }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: P.odT2 }}>{item.clientName}</span>
                        <span style={{ fontSize: 10, color: P.lt, marginLeft: 6 }}>{item.issue}</span>
                      </div>
                      <Pill label={item.severity} c={item.severity === "high" ? P.red : P.amb} bg={item.severity === "high" ? P.rL : P.aL} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <AlertTriangle style={{ width: 14, height: 14, color: P.red }} />
              <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Client Retention Risk</Serif>
              <Pill label={`${(risk.retentionRisks || []).length} at risk`} c={P.red} bg={P.rL} />
            </div>
            <div style={{ maxHeight: 350, overflowY: "auto" }}>
              {(risk.retentionRisks || []).map((r) => (
                <div key={r.clientId} style={{ padding: "12px 14px", borderRadius: 6, marginBottom: 6, border: `1px solid ${r.riskScore > 60 ? `${P.red}30` : P.odBorder}` }} data-testid={`retention-risk-${r.clientId}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <NextLink href={`/clients/${r.clientId}`}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: P.odT2 }}>{r.clientName}</span>
                    </NextLink>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      color: r.riskScore > 60 ? P.red : P.amb,
                      background: r.riskScore > 60 ? P.rL : P.aL,
                    }}>Risk: {r.riskScore}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                    {(r.factors || []).map((f: string, i: number) => (
                      <Pill key={i} label={f} c={P.red} bg={P.rL} />
                    ))}
                  </div>
                  <Supporting>{r.improvementPlan}</Supporting>
                </div>
              ))}
              {(risk.retentionRisks || []).length === 0 && (
                <p style={{ fontSize: 12, color: P.lt, textAlign: "center", padding: "24px 0" }}>No retention risks identified.</p>
              )}
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <TrendingDown style={{ width: 14, height: 14, color: P.red }} />
              <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Market Sensitivity Analysis</Serif>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.odBorder}` }}>
                    {["Client", "Current AUM", "-15% Scenario", "-25% Scenario", "Behavioral Risk", "Risk Tolerance"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: P.lt, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(risk.marketSensitivity || []).map((m) => (
                    <tr key={m.clientId} style={{ borderBottom: `1px solid ${P.odBorder}` }} data-testid={`market-risk-${m.clientId}`}>
                      <td style={{ padding: "8px 10px" }}>
                        <NextLink href={`/clients/${m.clientId}`}>
                          <span style={{ fontWeight: 600, color: P.odT2 }}>{m.clientName}</span>
                        </NextLink>
                      </td>
                      <td style={{ padding: "8px 10px" }}><Mono style={{ fontSize: 11, color: P.odT2 }}>{formatCurrency(m.currentAum)}</Mono></td>
                      <td style={{ padding: "8px 10px" }}><Mono style={{ fontSize: 11, color: P.red }}>{formatCurrency(m.impact15Pct)}</Mono></td>
                      <td style={{ padding: "8px 10px" }}><Mono style={{ fontSize: 11, color: P.red, fontWeight: 700 }}>{formatCurrency(m.impact25Pct)}</Mono></td>
                      <td style={{ padding: "8px 10px" }}><Pill label={m.behavioralRisk} c={m.behavioralRisk === "High" ? P.red : P.amb} bg={m.behavioralRisk === "High" ? P.rL : P.aL} /></td>
                      <td style={{ padding: "8px 10px" }}><span style={{ fontSize: 11, color: P.odT3 }}>{m.riskTolerance}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "performance" && (
        <div className="space-y-4">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { l: "Client Satisfaction", v: `${perf.avgSatisfaction || 0}`, c: perf.avgSatisfaction >= 70 ? P.grn : P.amb, icon: <Star style={{ width: 14, height: 14 }} />, testId: "text-satisfaction" },
              { l: "NPS Score", v: `${perf.npsScore || 0}`, c: perf.npsScore >= 50 ? P.grn : perf.npsScore >= 0 ? P.amb : P.red, icon: <ThumbsUp style={{ width: 14, height: 14 }} />, testId: "text-nps" },
              { l: "Revenue Growth", v: `${(perf.revenueGrowthPct || 0).toFixed(1)}%`, c: P.grn, icon: <TrendingUp style={{ width: 14, height: 14 }} />, testId: "text-revenue-growth" },
              { l: "Avg Response", v: `${(perf.avgResponseTime || 0).toFixed(1)}h`, c: perf.avgResponseTime <= 4 ? P.grn : P.amb, icon: <Clock style={{ width: 14, height: 14 }} />, testId: "text-response-time" },
            ].map((m, i) => (
              <div
                key={i}
                className="animate-fu"
                style={{
                  padding: "16px 20px", borderRadius: 6, background: P.odSurf,
                  border: `1px solid ${P.odBorder}`, animationDelay: `${i * 50}ms`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Lbl>{m.l}</Lbl>
                  <div style={{ color: m.c }}>{m.icon}</div>
                </div>
                <Serif style={{ fontSize: TS.title, fontWeight: 600, color: m.c }} data-testid={m.testId}>{m.v}</Serif>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <DollarSign style={{ width: 14, height: 14, color: P.grn }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Revenue Summary</Serif>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                  <Serif style={{ fontSize: 20, fontWeight: 700, color: P.grn, display: "block" }}>{formatCurrency(perf.totalRevenue || 0)}</Serif>
                  <Lbl>Total Revenue</Lbl>
                </div>
                <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                  <Serif style={{ fontSize: 20, fontWeight: 700, color: P.grn, display: "block" }}>+{(perf.revenueGrowthPct || 0).toFixed(1)}%</Serif>
                  <Lbl>YoY Growth</Lbl>
                </div>
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: P.grn }} />
                <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Service Efficiency</Serif>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                  <Serif style={{ fontSize: 20, fontWeight: 700, color: P.odT2, display: "block" }} data-testid="text-clients-served">{perf.clientsServed || 0}</Serif>
                  <Lbl>Clients Served</Lbl>
                </div>
                <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                  <Serif style={{ fontSize: 20, fontWeight: 700, color: P.grn, display: "block" }} data-testid="text-reviews-done">{perf.reviewsCompleted || 0}</Serif>
                  <Lbl>Reviews Done</Lbl>
                </div>
                <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                  <Serif style={{ fontSize: 20, fontWeight: 700, color: P.red, display: "block" }} data-testid="text-reviews-overdue">{perf.reviewsOverdue || 0}</Serif>
                  <Lbl>Reviews Overdue</Lbl>
                </div>
              </div>
              {perf.serviceEfficiency && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                    <Serif style={{ fontSize: 16, fontWeight: 700, color: P.odT2, display: "block" }} data-testid="text-activities-per-client">{perf.serviceEfficiency.activitiesPerClient}</Serif>
                    <Lbl>Activities/Client</Lbl>
                  </div>
                  <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                    <Serif style={{ fontSize: 16, fontWeight: 700, color: P.odT2, display: "block" }} data-testid="text-avg-contact-days">{perf.serviceEfficiency.avgDaysBetweenContacts}d</Serif>
                    <Lbl>Avg Days Between Contacts</Lbl>
                  </div>
                  <div style={{ padding: 12, borderRadius: 6, background: P.odSurf2, textAlign: "center" }}>
                    <Serif style={{ fontSize: 16, fontWeight: 700, color: perf.serviceEfficiency.reviewCompletionRate >= 80 ? P.grn : P.amb, display: "block" }} data-testid="text-review-completion">{perf.serviceEfficiency.reviewCompletionRate}%</Serif>
                    <Lbl>Review Completion</Lbl>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(perf.satisfactionTrend?.length > 0 || perf.activityVolumeTrend?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {perf.satisfactionTrend?.length > 0 && (
                <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <TrendingUp style={{ width: 14, height: 14, color: P.blue }} />
                    <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Engagement Trend (Quarterly)</Serif>
                  </div>
                  {perf.satisfactionTrend.map((pt: { period: string; value: number }, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 4, marginBottom: 4, background: P.odSurf2 }}>
                      <Lbl>{pt.period}</Lbl>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 100, height: 6, borderRadius: 3, background: P.odBorder, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, pt.value)}%`, height: "100%", borderRadius: 3, background: pt.value >= 60 ? P.grn : pt.value >= 40 ? P.amb : P.red }} />
                        </div>
                        <Mono style={{ fontSize: 11, color: P.odT2, minWidth: 30, textAlign: "right" }} data-testid={`text-engagement-trend-${i}`}>{pt.value}%</Mono>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {perf.activityVolumeTrend?.length > 0 && (
                <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Activity style={{ width: 14, height: 14, color: P.blue }} />
                    <Serif style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Activity Volume (Quarterly)</Serif>
                  </div>
                  {perf.activityVolumeTrend.map((pt: { period: string; value: number }, i: number) => {
                    const maxVal = Math.max(...perf.activityVolumeTrend.map((t: { value: number }) => t.value), 1);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 4, marginBottom: 4, background: P.odSurf2 }}>
                        <Lbl>{pt.period}</Lbl>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 100, height: 6, borderRadius: 3, background: P.odBorder, overflow: "hidden" }}>
                            <div style={{ width: `${(pt.value / maxVal) * 100}%`, height: "100%", borderRadius: 3, background: P.blue }} />
                          </div>
                          <Mono style={{ fontSize: 11, color: P.odT2, minWidth: 30, textAlign: "right" }} data-testid={`text-activity-trend-${i}`}>{pt.value}</Mono>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SegmentPanel({ title, icon, data, labelKey }: { title: string; icon: React.ReactNode; data: Array<Record<string, number | string>>; labelKey: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        {icon}
        <Serif style={{ fontSize: 14, fontWeight: 600, color: P.odT1 }}>{title}</Serif>
      </div>
      {data.length === 0 && <Supporting style={{ textAlign: "center", padding: "16px 0" }}>No data</Supporting>}
      {data.map((d, i) => (
        <div key={i} style={{ padding: "8px 10px", borderRadius: 4, marginBottom: 4, background: P.odSurf2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: P.odT2 }}>{d[labelKey]}</span>
            <Mono style={{ fontSize: 10, color: P.odT3 }}>{d.count} clients</Mono>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Mono style={{ fontSize: 10, color: P.grn }}>{formatCurrency(Number(d.totalAum) || 0)}</Mono>
            <Mono style={{ fontSize: 10, color: P.lt }}>avg {formatCurrency(Number(d.avgAum) || 0)}</Mono>
          </div>
        </div>
      ))}
    </div>
  );
}
