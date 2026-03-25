import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import NextLink from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  UserCheck,
  Shield,
  CalendarClock,
  FileWarning,
  Activity,
  ChevronRight,
  AlertCircle,
  Database,
  Loader2,
  RefreshCw,
  Settings,
  Zap,
  ShieldAlert,
  BarChart3,
  XCircle,
  Eye,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { Serif, Mono, Lbl, Supporting, TS } from "@/components/design/typography";
import { Score } from "@/components/design/score";
import { Pill } from "@/components/design/pill";
import { NavTabs } from "@/components/design/nav-tabs";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function statusColor(status: string) {
  switch (status) {
    case "overdue": return "destructive" as const;
    case "expiring_soon": return "secondary" as const;
    case "current": return "default" as const;
    default: return "outline" as const;
  }
}

function riskTierColor(tier: string) {
  switch (tier) {
    case "high":
    case "prohibited": return P.red;
    case "standard": return P.amb;
    case "low": return P.grn;
    default: return P.lt;
  }
}

function riskTierBg(tier: string) {
  switch (tier) {
    case "high":
    case "prohibited": return P.rL;
    case "standard": return P.aL;
    case "low": return P.gL;
    default: return P.odSurf2;
  }
}

/* ── Group definitions for 2-tier navigation ── */
type GroupId = "kyc" | "regulatory" | "fiduciary";
type SubTab = string;

const TAB_GROUPS: { id: GroupId; label: string; subtabs: { id: SubTab; label: string }[] }[] = [
  {
    id: "kyc",
    label: "KYC & Screening",
    subtabs: [
      { id: "kyc-dashboard", label: "Dashboard" },
      { id: "screening-pipeline", label: "Screening Pipeline" },
      { id: "risk-ratings", label: "Risk Ratings" },
      { id: "screening", label: "AML Screening" },
    ],
  },
  {
    id: "regulatory",
    label: "Reviews & Compliance",
    subtabs: [
      { id: "reviews", label: "Review Schedule" },
      { id: "edd", label: "EDD" },
      { id: "documents", label: "Documents" },
      { id: "compliance", label: "Items" },
    ],
  },
  {
    id: "fiduciary",
    label: "Fiduciary & Audit",
    subtabs: [
      { id: "fiduciary-tab", label: "Fiduciary Validation" },
      { id: "audit", label: "Audit Trail" },
    ],
  },
];

function getGroupForTab(tabId: string): GroupId {
  for (const group of TAB_GROUPS) {
    if (group.subtabs.some(s => s.id === tabId)) return group.id;
  }
  return "kyc";
}

export default function Compliance() {
  const [activeTab, setActiveTab] = useState("kyc-dashboard");
  const activeGroup = getGroupForTab(activeTab);
  const currentGroup = TAB_GROUPS.find(g => g.id === activeGroup)!;

  const { data: complianceData, isLoading: complianceLoading } = useQuery<any>({
    queryKey: ["/api/compliance"],
  });

  const { data: kycData, isLoading: kycLoading } = useQuery<any>({
    queryKey: ["/api/kyc/dashboard"],
  });

  const { data: fiduciaryData, isLoading: fiduciaryLoading } = useQuery<any>({
    queryKey: ["/api/fiduciary/stats"],
  });

  const { data: fiduciaryAuditData } = useQuery<any>({
    queryKey: ["/api/fiduciary/audit-log"],
  });

  const isLoading = complianceLoading || kycLoading || fiduciaryLoading;

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

  const cScore = complianceData?.healthScore || 0;
  const cColor = cScore >= 80 ? P.grn : cScore >= 60 ? P.amb : P.red;
  const summary = kycData?.summary || {};

  return (
    <div style={{ maxWidth: 1100 }}>
      <Serif as="h1" style={{ fontSize: TS.title, fontWeight: 600, color: P.odT1, marginBottom: 4 }} data-testid="text-page-title">Compliance & Risk</Serif>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Supporting as="p">KYC/AML compliance, risk ratings, screening, and regulatory reviews</Supporting>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Score value={summary.complianceRate || cScore} size={42} color={cColor} label="Health" />
        </div>
      </div>

      {/* ── Tier 1: Group tabs ── */}
      <div style={{ marginBottom: 12 }}>
        <NavTabs
          tabs={TAB_GROUPS.map(g => ({ id: g.id, label: g.label }))}
          active={activeGroup}
          onChange={(groupId) => {
            const group = TAB_GROUPS.find(g => g.id === groupId)!;
            setActiveTab(group.subtabs[0].id);
          }}
        />
      </div>

      {/* ── Tier 2: Sub-tabs within active group ── */}
      {currentGroup.subtabs.length > 1 && (
        <div style={{ marginBottom: 20, paddingLeft: 4 }}>
          <div style={{ display: "inline-flex", gap: 2 }}>
            {currentGroup.subtabs.map(st => (
              <button
                key={st.id}
                onClick={() => setActiveTab(st.id)}
                className="btn-filter"
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${activeTab === st.id ? P.blue : P.odBorder}`,
                  background: activeTab === st.id ? P.bFr : "transparent",
                  color: activeTab === st.id ? P.blue : P.odT3,
                  fontSize: 11,
                  fontWeight: activeTab === st.id ? 600 : 500,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  transition: "all .15s ease",
                }}
                data-testid={`subtab-${st.id}`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab panels ── */}

      {activeTab === "kyc-dashboard" && (
        <div role="tabpanel" id="tabpanel-kyc-dashboard">
          <KycDashboard summary={summary} kycData={kycData} />
        </div>
      )}

      {activeTab === "screening-pipeline" && (
        <div role="tabpanel" id="tabpanel-screening-pipeline">
          <ScreeningPipelineTab summary={summary} screeningConfig={kycData?.screeningConfig} />
        </div>
      )}

      {activeTab === "risk-ratings" && (
        <div role="tabpanel" id="tabpanel-risk-ratings">
          <RiskRatingsTab ratings={kycData?.riskRatings || []} />
        </div>
      )}

      {activeTab === "screening" && (
        <div role="tabpanel" id="tabpanel-screening">
          <ScreeningTab results={kycData?.screeningResults || []} />
        </div>
      )}

      {activeTab === "reviews" && (
        <div role="tabpanel" id="tabpanel-reviews">
          <ReviewScheduleTab schedules={kycData?.reviewSchedules || []} />
        </div>
      )}

      {activeTab === "edd" && (
        <div role="tabpanel" id="tabpanel-edd">
          <EddTab records={kycData?.eddRecords || []} />
        </div>
      )}

      {activeTab === "documents" && (
        <div role="tabpanel" id="tabpanel-documents">
          <DocumentsTab documents={kycData?.expiringDocuments || []} />
        </div>
      )}

      {activeTab === "compliance" && (
        <div role="tabpanel" id="tabpanel-compliance" className="space-y-2">
          {complianceData?.items?.map((item: any, idx: number) => (
            <ComplianceItem key={item.id} item={item} idx={idx} />
          ))}
          {(!complianceData?.items || complianceData.items.length === 0) && (
            <EmptyState icon={<CheckCircle2 />} message="No compliance items" />
          )}
        </div>
      )}

      {activeTab === "fiduciary-tab" && (
        <div role="tabpanel" id="tabpanel-fiduciary">
          <FiduciaryValidationTab stats={fiduciaryData} auditData={fiduciaryAuditData} />
        </div>
      )}

      {activeTab === "audit" && (
        <div role="tabpanel" id="tabpanel-audit">
          <AuditTrailTab auditLog={kycData?.auditLog || []} complianceAudit={complianceData?.auditTrail || []} />
        </div>
      )}
    </div>
  );
}

function KycDashboard({ summary, kycData }: { summary: any; kycData: any }) {
  const stats = [
    { label: "Total Clients", count: summary.totalClients || 0, color: P.blue, bg: P.bFr, icon: <UserCheck style={{ width: 16, height: 16, color: P.blue }} />, sub: `${summary.ratedClients || 0} rated` },
    { label: "High Risk", count: summary.highRiskCount || 0, color: P.red, bg: P.rL, icon: <AlertTriangle style={{ width: 16, height: 16, color: P.red }} />, sub: "Requires EDD" },
    { label: "Pending Screening", count: summary.pendingScreenings || 0, color: P.amb, bg: P.aL, icon: <Search style={{ width: 16, height: 16, color: P.amb }} />, sub: "Awaiting review" },
    { label: "Upcoming Reviews", count: summary.upcomingReviews || 0, color: P.gold, bg: P.goldLt, icon: <CalendarClock style={{ width: 16, height: 16, color: P.gold }} />, sub: "Within 30 days" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {stats.map((s, i) => (
          <div key={i} className="animate-fu" style={{
            padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
            animationDelay: `${i * 50}ms`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Lbl>{s.label}</Lbl>
              {s.icon}
            </div>
            <Serif style={{ fontSize: TS.title, fontWeight: 600, color: s.color, display: "block" }} as="p">{s.count}</Serif>
            <div style={{ fontSize: TS.label, color: P.lt, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <Lbl>KYC Compliance Rate</Lbl>
            <Mono style={{ fontSize: TS.label, fontWeight: 600, color: summary.complianceRate >= 80 ? P.grn : P.amb }}>{summary.complianceRate || 0}%</Mono>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: P.odSurf2, overflow: "visible", position: "relative" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${summary.complianceRate || 0}%`,
              background: summary.complianceRate >= 80 ? `linear-gradient(90deg, ${P.bHi}, ${P.grn})` : `linear-gradient(90deg, ${P.amb}, ${P.gold})`,
              transition: "width 1s ease",
            }} />
            {/* Threshold markers */}
            <div style={{ position: "absolute", left: "80%", top: -2, bottom: -2, width: 1, borderLeft: `1px dashed ${P.odT3}`, opacity: 0.5 }} />
            <div style={{ position: "absolute", left: "95%", top: -2, bottom: -2, width: 1, borderLeft: `1px dashed ${P.odT3}`, opacity: 0.5 }} />
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: P.odT3 }}>
            <span style={{ position: "absolute", left: "80%", transform: "translateX(-50%)" }}>80% Target</span>
            <span style={{ position: "absolute", left: "95%", transform: "translateX(-50%)" }}>95%</span>
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <Lbl style={{ marginBottom: 12, display: "block" }}>Risk Distribution</Lbl>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Low", count: summary.lowRiskCount || 0, c: P.grn, bg: P.gL },
              { label: "Standard", count: summary.standardRiskCount || 0, c: P.amb, bg: P.aL },
              { label: "High", count: summary.highRiskCount || 0, c: P.red, bg: P.rL },
            ].map((r, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, background: r.bg }}>
                <Serif style={{ fontSize: TS.title, fontWeight: 600, color: r.c, display: "block" }} as="p">{r.count}</Serif>
                <div style={{ fontSize: TS.label, color: r.c, fontWeight: 500 }}>{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <Lbl>Screening Coverage</Lbl>
            <Mono style={{ fontSize: TS.label, fontWeight: 600, color: (summary.screeningCoverage || 0) >= 80 ? P.grn : P.amb }}>{summary.screeningCoverage || 0}%</Mono>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: P.odSurf2, overflow: "visible", position: "relative" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${summary.screeningCoverage || 0}%`,
              background: (summary.screeningCoverage || 0) >= 80 ? `linear-gradient(90deg, ${P.bHi}, ${P.grn})` : `linear-gradient(90deg, ${P.amb}, ${P.gold})`,
              transition: "width 1s ease",
            }} />
            {/* Threshold markers */}
            <div style={{ position: "absolute", left: "80%", top: -2, bottom: -2, width: 1, borderLeft: `1px dashed ${P.odT3}`, opacity: 0.5 }} />
            <div style={{ position: "absolute", left: "95%", top: -2, bottom: -2, width: 1, borderLeft: `1px dashed ${P.odT3}`, opacity: 0.5 }} />
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: P.odT3 }}>
            <span style={{ position: "absolute", left: "80%", transform: "translateX(-50%)" }}>80% Target</span>
            <span style={{ position: "absolute", left: "95%", transform: "translateX(-50%)" }}>95%</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: TS.label, color: P.odT3 }}>
            <span>{summary.screenedClients || 0} screened</span>
            <span>{summary.totalScreenings || 0} total screenings</span>
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <Lbl style={{ marginBottom: 12, display: "block" }}>Watchlist Database</Lbl>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, background: P.bFr }}>
              <Serif style={{ fontSize: TS.title, fontWeight: 600, color: P.blue, display: "block" }} as="p">{summary.ofacEntryCount || 0}</Serif>
              <div style={{ fontSize: TS.label, color: P.blue, fontWeight: 500 }}>OFAC SDN</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, background: P.goldLt }}>
              <Serif style={{ fontSize: TS.title, fontWeight: 600, color: P.gold, display: "block" }} as="p">{summary.pepEntryCount || 0}</Serif>
              <div style={{ fontSize: TS.label, color: P.gold, fontWeight: 500 }}>PEP</div>
            </div>
          </div>
        </div>
      </div>

      {(summary.overdueReviews > 0 || summary.pendingEdd > 0 || summary.expiringDocuments > 0) && (
        <div style={{ padding: 16, borderRadius: 6, background: P.rL, border: `1px solid ${P.red}20`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, color: P.red }} />
            <Lbl style={{ color: P.red }}>Action Required</Lbl>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {summary.overdueReviews > 0 && (
              <div style={{ fontSize: TS.label, color: P.red }}>{summary.overdueReviews} overdue review{summary.overdueReviews > 1 ? "s" : ""}</div>
            )}
            {summary.pendingEdd > 0 && (
              <div style={{ fontSize: TS.label, color: P.red }}>{summary.pendingEdd} pending EDD case{summary.pendingEdd > 1 ? "s" : ""}</div>
            )}
            {summary.expiringDocuments > 0 && (
              <div style={{ fontSize: TS.label, color: P.red }}>{summary.expiringDocuments} expiring document{summary.expiringDocuments > 1 ? "s" : ""}</div>
            )}
          </div>
        </div>
      )}

      {kycData?.auditLog?.length > 0 && (
        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <Lbl style={{ marginBottom: 12, display: "block" }}>Recent KYC Activity</Lbl>
          {kycData.auditLog.slice(0, 5).map((entry: any, i: number) => (
            <div key={entry.id} className="animate-si" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: i < 4 ? `1px solid ${P.odSurf2}` : "none",
              animationDelay: `${i * 40}ms`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Activity style={{ width: 14, height: 14, color: P.blue }} />
                <div>
                  <div style={{ fontSize: TS.label, fontWeight: 500, color: P.odT2 }}>{formatAuditAction(entry.action)}</div>
                  <div style={{ fontSize: TS.label, color: P.lt }}>{entry.clientName} · {entry.performedBy}</div>
                </div>
              </div>
              <Mono style={{ fontSize: TS.label, color: P.lt }}>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ""}</Mono>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScreeningPipelineTab({ summary, screeningConfig }: { summary: any; screeningConfig: any }) {
  const { toast } = useToast();

  const { data: pipelineData, isLoading } = useQuery<any>({
    queryKey: ["/api/kyc/screening-pipeline"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/kyc/ofac/seed-sample", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/screening-pipeline"] });
      toast({ title: "Sample data loaded", description: `${data.sdnInserted} OFAC SDN entries and ${data.pepInserted} PEP entries loaded.` });
    },
  });

  const screenAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/kyc/screen-all", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/screening-pipeline"] });
      toast({
        title: "Batch screening complete",
        description: `${data.screened} clients screened. ${data.matchesFound} matches found, ${data.autoResolved} auto-resolved.`,
      });
    },
  });

  const stats = pipelineData?.stats || {};

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Serif as="h2" style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1, display: "block" }}>Screening Pipeline</Serif>
          <div style={{ fontSize: TS.label, color: P.odT3, marginTop: 2 }}>OFAC SDN, PEP, and internal watchlist screening status</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 4, border: `1px solid ${P.blue}`, background: P.bFr, color: P.blue, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
            data-testid="btn-seed-watchlists"
          >
            {seedMutation.isPending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Database style={{ width: 12, height: 12 }} />}
            Load Sample Watchlists
          </button>
          <button
            onClick={() => screenAllMutation.mutate()}
            disabled={screenAllMutation.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 4, border: `1px solid ${P.grn}`, background: P.gL, color: P.grn, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
            data-testid="btn-screen-all"
          >
            {screenAllMutation.isPending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Zap style={{ width: 12, height: 12 }} />}
            Screen All Clients
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Pending Review", count: stats.pending || 0, c: P.red, bg: P.rL, icon: <AlertTriangle style={{ width: 14, height: 14, color: P.red }} /> },
          { label: "Auto-Resolved", count: stats.autoResolved || 0, c: P.amb, bg: P.aL, icon: <RefreshCw style={{ width: 14, height: 14, color: P.amb }} /> },
          { label: "Confirmed Match", count: stats.confirmed || 0, c: P.red, bg: P.rL, icon: <AlertCircle style={{ width: 14, height: 14, color: P.red }} /> },
          { label: "Clear", count: stats.clear || 0, c: P.grn, bg: P.gL, icon: <CheckCircle2 style={{ width: 14, height: 14, color: P.grn }} /> },
          { label: "Not Screened", count: stats.unscreened || 0, c: P.lt, bg: P.odSurf2, icon: <Clock style={{ width: 14, height: 14, color: P.lt }} /> },
        ].map((s, i) => (
          <div key={i} className="animate-fu" style={{
            padding: 14, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
            animationDelay: `${i * 50}ms`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Lbl style={{ fontSize: TS.label }}>{s.label}</Lbl>
              {s.icon}
            </div>
            <Serif style={{ fontSize: TS.title, fontWeight: 600, color: s.c, display: "block" }} as="p">{s.count}</Serif>
          </div>
        ))}
      </div>

      {screeningConfig && (
        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Settings style={{ width: 14, height: 14, color: P.odT3 }} />
            <Lbl>Screening Configuration</Lbl>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div>
              <div style={{ fontSize: TS.label, color: P.lt, marginBottom: 2 }}>Match Threshold</div>
              <Mono style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{screeningConfig.nameMatchThreshold || 85}%</Mono>
            </div>
            <div>
              <div style={{ fontSize: TS.label, color: P.lt, marginBottom: 2 }}>Auto-Resolve Below</div>
              <Mono style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{screeningConfig.autoResolveThreshold || 65}%</Mono>
            </div>
            <div>
              <div style={{ fontSize: TS.label, color: P.lt, marginBottom: 2 }}>High Confidence</div>
              <Mono style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{screeningConfig.highConfidenceThreshold || 90}%</Mono>
            </div>
            <div>
              <div style={{ fontSize: TS.label, color: P.lt, marginBottom: 2 }}>Re-screening</div>
              <Mono style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>Every {screeningConfig.rescreeningFrequencyDays || 90} days</Mono>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {[
              { label: "OFAC SDN", enabled: screeningConfig.ofacEnabled !== false },
              { label: "PEP Database", enabled: screeningConfig.pepEnabled !== false },
              { label: "Internal Watchlist", enabled: screeningConfig.internalWatchlistEnabled !== false },
            ].map((w, i) => (
              <Pill
                key={i}
                label={w.label}
                c={w.enabled ? P.grn : P.lt}
                bg={w.enabled ? P.gL : P.odSurf2}
              />
            ))}
          </div>
          {summary.lastRescreeningRun && (
            <div style={{ fontSize: TS.label, color: P.lt, marginTop: 8 }}>
              Last re-screening: {new Date(summary.lastRescreeningRun).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          {(pipelineData?.pending?.length > 0) && (
            <div style={{ marginBottom: 16 }}>
              <Lbl style={{ marginBottom: 8, display: "block", color: P.red }}>
                Pending Manual Review ({pipelineData.pending.length})
              </Lbl>
              {pipelineData.pending.map((result: any, idx: number) => (
                <PipelineMatchItem key={result.id} result={result} idx={idx} />
              ))}
            </div>
          )}

          {(pipelineData?.autoResolved?.length > 0) && (
            <div style={{ marginBottom: 16 }}>
              <Lbl style={{ marginBottom: 8, display: "block", color: P.amb }}>
                Auto-Resolved ({stats.autoResolved || 0})
              </Lbl>
              {pipelineData.autoResolved.map((result: any, idx: number) => (
                <div key={result.id} className="animate-si" style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "10px 18px",
                  borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
                  borderLeft: `3px solid ${P.amb}`, marginBottom: 6,
                  animationDelay: `${idx * 20}ms`,
                }} data-testid={`pipeline-autoresolved-${result.id}`}>
                  <RefreshCw style={{ width: 14, height: 14, color: P.amb }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: TS.label, fontWeight: 500, color: P.odT2 }}>{result.clientName}</span>
                      <Pill label={`${result.matchConfidence}%`} c={P.amb} bg={P.aL} />
                      <Pill label={result.watchlistName} c={P.lt} bg={P.odSurf2} />
                    </div>
                    <div style={{ fontSize: TS.label, color: P.lt, marginTop: 2 }}>{result.notes}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(pipelineData?.unscreened?.length > 0) && (
            <div>
              <Lbl style={{ marginBottom: 8, display: "block" }}>
                Not Yet Screened ({pipelineData.unscreened.length})
              </Lbl>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pipelineData.unscreened.map((client: any) => (
                  <NextLink key={client.id} href={`/clients/${client.id}`}>
                    <span style={{
                      padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.odBorder}`,
                      background: P.odSurf, fontSize: TS.label, color: P.odT3, cursor: "pointer",
                    }} data-testid={`unscreened-${client.id}`}>
                      {client.name}
                    </span>
                  </NextLink>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PipelineMatchItem({ result, idx }: { result: any; idx: number }) {
  const { toast } = useToast();

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution, notes }: { id: string; resolution: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/kyc/screening/${id}/resolve`, { resolution, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/screening-pipeline"] });
      toast({ title: "Screening resolved" });
    },
  });

  return (
    <div className="animate-si" style={{
      padding: "14px 18px", borderRadius: 6, background: P.rL,
      border: `1px solid ${P.red}20`, marginBottom: 8,
      animationDelay: `${idx * 30}ms`,
    }} data-testid={`pipeline-pending-${result.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle style={{ width: 14, height: 14, color: P.red }} />
          <NextLink href={`/clients/${result.clientId}`}>
            <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{result.clientName}</span>
          </NextLink>
          <Pill label={`${result.matchConfidence}% match`} c={P.red} bg={P.rL} />
          <Pill label={result.watchlistName} c={P.lt} bg={P.odSurf2} />
        </div>
      </div>
      {result.matchDetails?.reason && (
        <div style={{ fontSize: TS.label, color: P.odT3, marginBottom: 4 }}>
          {result.matchDetails.reason}
        </div>
      )}
      {result.matchDetails?.matchedName && (
        <div style={{ fontSize: TS.label, color: P.odT3, marginBottom: 8 }}>
          Matched: "{result.matchDetails.matchedName}" vs Client: "{result.matchDetails.clientName}"
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => resolveMutation.mutate({ id: result.id, resolution: "false_positive", notes: "Reviewed and cleared" })}
          disabled={resolveMutation.isPending}
          style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.grn}`, background: P.gL, color: P.grn, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
          data-testid={`btn-pipeline-clear-${result.id}`}
        >
          Clear - False Positive
        </button>
        <button
          onClick={() => resolveMutation.mutate({ id: result.id, resolution: "true_match", notes: "Confirmed match" })}
          disabled={resolveMutation.isPending}
          style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.red}`, background: P.rL, color: P.red, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
          data-testid={`btn-pipeline-confirm-${result.id}`}
        >
          Confirm Match
        </button>
      </div>
    </div>
  );
}

function RiskRatingsTab({ ratings }: { ratings: any[] }) {
  const { toast } = useToast();

  const rateMutation = useMutation({
    mutationFn: async ({ clientId, pepStatus, sourceOfWealth }: { clientId: string; pepStatus: boolean; sourceOfWealth: string }) => {
      const res = await apiRequest("POST", `/api/kyc/clients/${clientId}/rate`, { pepStatus, sourceOfWealth });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/dashboard"] });
      toast({ title: "Risk rating calculated", description: "Client risk profile has been updated." });
    },
  });

  if (ratings.length === 0) {
    return <EmptyState icon={<Shield />} message="No risk ratings yet. Rate clients from their profile to begin." />;
  }

  return (
    <div className="space-y-2">
      {ratings.map((rating: any, idx: number) => (
        <div key={rating.id} className="animate-si hv-glow" style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
          borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
          borderLeft: `3px solid ${riskTierColor(rating.riskTier)}`,
          animationDelay: `${idx * 30}ms`,
        }} data-testid={`risk-rating-${rating.id}`}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <NextLink href={`/clients/${rating.clientId}`}>
                <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{rating.clientName}</span>
              </NextLink>
              <Pill label={rating.riskTier} c={riskTierColor(rating.riskTier)} bg={riskTierBg(rating.riskTier)} icon={rating.riskTier === "high" || rating.riskTier === "prohibited" ? <ShieldAlert style={{ width: 10, height: 10 }} /> : rating.riskTier === "standard" ? <Shield style={{ width: 10, height: 10 }} /> : <ShieldCheck style={{ width: 10, height: 10 }} />} />
              {rating.pepStatus && <Pill label="PEP" c={P.red} bg={P.rL} icon={<AlertTriangle style={{ width: 10, height: 10 }} />} />}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: TS.label, color: P.odT3 }}>
              <span>Residency: {rating.residencyRisk}</span>
              <span>Occupation: {rating.occupationRisk}</span>
              <span>Wealth: {rating.sourceOfWealthRisk}</span>
              <span>PEP: {rating.pepRisk}</span>
              {rating.factors?.screeningRisk !== undefined && <span>Screening: {rating.factors.screeningRisk}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Score value={100 - rating.riskScore} size={36} color={riskTierColor(rating.riskTier)} />
            <Mono style={{ fontSize: TS.label, color: P.lt, display: "block", marginTop: 2 }}>Score: {rating.riskScore}</Mono>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScreeningTab({ results }: { results: any[] }) {
  const { toast } = useToast();

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution, notes }: { id: string; resolution: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/kyc/screening/${id}/resolve`, { resolution, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/screening-pipeline"] });
      toast({ title: "Screening resolved" });
    },
  });

  if (results.length === 0) {
    return <EmptyState icon={<Search />} message="No screening results. Run AML screening on clients to begin." />;
  }

  const pending = results.filter(r => r.matchStatus === "potential_match" && !r.resolvedAt);
  const resolved = results.filter(r => r.resolvedAt || r.matchStatus === "clear");

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Lbl style={{ marginBottom: 8, display: "block", color: P.red }}>Pending Review ({pending.length})</Lbl>
          {pending.map((result: any, idx: number) => (
            <div key={result.id} className="animate-si" style={{
              padding: "14px 18px", borderRadius: 6, background: P.rL,
              border: `1px solid ${P.red}20`, marginBottom: 8,
              animationDelay: `${idx * 30}ms`,
            }} data-testid={`screening-pending-${result.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: P.red }} />
                  <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{result.clientName}</span>
                  <Pill label={`${result.matchConfidence}% match`} c={P.red} bg={P.rL} />
                  <Pill label={result.watchlistName} c={P.lt} bg={P.odSurf2} />
                </div>
                <Mono style={{ fontSize: TS.label, color: P.lt }}>{result.screeningType === "automated_composite" ? "Automated" : "Manual"}</Mono>
              </div>
              {result.matchDetails?.reason && (
                <div style={{ fontSize: TS.label, color: P.odT3, marginBottom: 8 }}>Reason: {result.matchDetails.reason}</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => resolveMutation.mutate({ id: result.id, resolution: "false_positive", notes: "Reviewed and cleared" })}
                  style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.grn}`, background: P.gL, color: P.grn, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
                  data-testid={`btn-clear-${result.id}`}
                >
                  Clear - False Positive
                </button>
                <button
                  onClick={() => resolveMutation.mutate({ id: result.id, resolution: "true_match", notes: "Confirmed match" })}
                  style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.red}`, background: P.rL, color: P.red, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
                  data-testid={`btn-confirm-${result.id}`}
                >
                  Confirm Match
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Lbl style={{ marginBottom: 8, display: "block" }}>All Results ({resolved.length})</Lbl>
      {resolved.map((result: any, idx: number) => (
        <div key={result.id} className="animate-si" style={{
          display: "flex", alignItems: "center", gap: 14, padding: "10px 18px",
          borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
          borderLeft: `3px solid ${result.matchStatus === "clear" ? P.grn : result.matchStatus === "false_positive" ? P.amb : P.red}`,
          marginBottom: 6, animationDelay: `${idx * 20}ms`,
        }} data-testid={`screening-result-${result.id}`}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: TS.label, fontWeight: 500, color: P.odT2 }}>{result.clientName}</span>
              <Pill
                label={result.matchStatus === "clear" ? "Clear" : result.matchStatus === "false_positive" ? (result.resolution === "auto_resolved" ? "Auto-Resolved" : "False Positive") : result.matchStatus}
                c={result.matchStatus === "clear" ? P.grn : result.matchStatus === "false_positive" ? P.amb : P.red}
                bg={result.matchStatus === "clear" ? P.gL : result.matchStatus === "false_positive" ? P.aL : P.rL}
              />
              {result.watchlistName && <Pill label={result.watchlistName} c={P.lt} bg={P.odSurf2} />}
            </div>
          </div>
          <Mono style={{ fontSize: TS.label, color: P.lt }}>{result.createdAt ? new Date(result.createdAt).toLocaleDateString() : ""}</Mono>
        </div>
      ))}
    </div>
  );
}

function ReviewScheduleTab({ schedules }: { schedules: any[] }) {
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/kyc/reviews/${id}/complete`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/dashboard"] });
      toast({ title: "Review completed", description: "Next review has been scheduled." });
    },
  });

  if (schedules.length === 0) {
    return <EmptyState icon={<CalendarClock />} message="No review schedules. Reviews are created when clients are risk-rated." />;
  }

  const now = new Date().toISOString().split("T")[0];
  const overdue = schedules.filter(s => s.status === "scheduled" && s.nextReviewDate < now);
  const upcoming = schedules.filter(s => s.status === "scheduled" && s.nextReviewDate >= now);
  const completed = schedules.filter(s => s.status === "completed");

  return (
    <div>
      {overdue.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Lbl style={{ marginBottom: 8, display: "block", color: P.red }}>Overdue ({overdue.length})</Lbl>
          {overdue.map((s: any, idx: number) => (
            <ReviewItem key={s.id} schedule={s} isOverdue onComplete={() => completeMutation.mutate({ id: s.id })} idx={idx} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Lbl style={{ marginBottom: 8, display: "block" }}>Scheduled ({upcoming.length})</Lbl>
          {upcoming.map((s: any, idx: number) => (
            <ReviewItem key={s.id} schedule={s} isOverdue={false} onComplete={() => completeMutation.mutate({ id: s.id })} idx={idx} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <Lbl style={{ marginBottom: 8, display: "block", color: P.grn }}>Completed ({completed.length})</Lbl>
          {completed.slice(0, 10).map((s: any, idx: number) => (
            <ReviewItem key={s.id} schedule={s} isOverdue={false} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewItem({ schedule, isOverdue, onComplete, idx }: { schedule: any; isOverdue: boolean; onComplete?: () => void; idx: number }) {
  const borderColor = schedule.status === "completed" ? P.grn : isOverdue ? P.red : P.amb;
  return (
    <div className="animate-si hv-glow" style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 18px",
      borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
      borderLeft: `3px solid ${borderColor}`, marginBottom: 6,
      animationDelay: `${idx * 30}ms`,
    }} data-testid={`review-schedule-${schedule.id}`}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NextLink href={`/clients/${schedule.resolvedClientId || schedule.clientId}`}>
            <span style={{ fontSize: TS.label, fontWeight: 600, color: P.odT2 }}>{schedule.clientName}</span>
          </NextLink>
          <Pill label={schedule.riskTier} c={riskTierColor(schedule.riskTier)} bg={riskTierBg(schedule.riskTier)} icon={schedule.riskTier === "high" || schedule.riskTier === "prohibited" ? <ShieldAlert style={{ width: 10, height: 10 }} /> : <Shield style={{ width: 10, height: 10 }} />} />
          <Pill label={schedule.status} c={schedule.status === "completed" ? P.grn : isOverdue ? P.red : P.amb} bg={schedule.status === "completed" ? P.gL : isOverdue ? P.rL : P.aL} icon={schedule.status === "completed" ? <CheckCircle2 style={{ width: 10, height: 10 }} /> : <Clock style={{ width: 10, height: 10 }} />} />
        </div>
        <div style={{ fontSize: TS.label, color: P.odT3, marginTop: 3 }}>
          Next: {schedule.nextReviewDate} · Every {schedule.reviewFrequencyMonths} months
        </div>
      </div>
      {onComplete && schedule.status === "scheduled" && (
        <button
          onClick={onComplete}
          style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.grn}`, background: P.gL, color: P.grn, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
          data-testid={`btn-complete-review-${schedule.id}`}
        >
          Complete
        </button>
      )}
    </div>
  );
}

function EddTab({ records }: { records: any[] }) {
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/kyc/edd/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/dashboard"] });
      toast({ title: "EDD record updated" });
    },
  });

  if (records.length === 0) {
    return <EmptyState icon={<FileWarning />} message="No Enhanced Due Diligence records. EDD is triggered for high-risk clients." />;
  }

  const pending = records.filter(r => r.status === "pending" || r.status === "in_progress");
  const completed = records.filter(r => r.status === "completed");

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Lbl style={{ marginBottom: 8, display: "block", color: P.amb }}>Active EDD Cases ({pending.length})</Lbl>
          {pending.map((record: any, idx: number) => (
            <EddItem key={record.id} record={record} idx={idx} onStatusChange={(status) => updateMutation.mutate({ id: record.id, data: { status } })} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <Lbl style={{ marginBottom: 8, display: "block", color: P.grn }}>Completed ({completed.length})</Lbl>
          {completed.map((record: any, idx: number) => (
            <EddItem key={record.id} record={record} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function EddItem({ record, idx, onStatusChange }: { record: any; idx: number; onStatusChange?: (status: string) => void }) {
  const statusColor = record.status === "completed" ? P.grn : record.status === "in_progress" ? P.amb : P.red;
  const requiredDocs = Array.isArray(record.requiredDocuments) ? record.requiredDocuments : [];
  const collectedDocs = Array.isArray(record.collectedDocuments) ? record.collectedDocuments : [];

  return (
    <div className="animate-si" style={{
      padding: "14px 18px", borderRadius: 6, background: P.odSurf,
      border: `1px solid ${P.odBorder}`, borderLeft: `3px solid ${statusColor}`,
      marginBottom: 8, animationDelay: `${idx * 30}ms`,
    }} data-testid={`edd-record-${record.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NextLink href={`/clients/${record.resolvedClientId || record.clientId}`}>
            <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{record.clientName}</span>
          </NextLink>
          <Pill label={record.status} c={statusColor} bg={record.status === "completed" ? P.gL : record.status === "in_progress" ? P.aL : P.rL} />
        </div>
        {record.assignedTo && <Mono style={{ fontSize: TS.label, color: P.lt }}>Assigned: {record.assignedTo}</Mono>}
      </div>
      <div style={{ fontSize: TS.label, color: P.odT3, marginBottom: 6 }}>{record.triggerReason}</div>

      {requiredDocs.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: TS.label, color: P.lt, fontWeight: 600, marginBottom: 4 }}>Required Documents ({collectedDocs.length}/{requiredDocs.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {requiredDocs.map((doc: string, i: number) => (
              <Pill key={i} label={doc} c={collectedDocs.includes(doc) ? P.grn : P.lt} bg={collectedDocs.includes(doc) ? P.gL : P.odSurf2} dot={false} />
            ))}
          </div>
        </div>
      )}

      {onStatusChange && record.status !== "completed" && (
        <div style={{ display: "flex", gap: 8 }}>
          {record.status === "pending" && (
            <button onClick={() => onStatusChange("in_progress")}
              style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.blue}`, background: P.bFr, color: P.blue, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
              data-testid={`btn-start-edd-${record.id}`}>
              Start Review
            </button>
          )}
          <button onClick={() => onStatusChange("completed")}
            style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.grn}`, background: P.gL, color: P.grn, fontSize: TS.label, cursor: "pointer", fontWeight: 500 }}
            data-testid={`btn-complete-edd-${record.id}`}>
            Complete
          </button>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ documents }: { documents: any[] }) {
  if (documents.length === 0) {
    return <EmptyState icon={<FileText />} message="No expiring identity documents" />;
  }

  return (
    <div className="space-y-2">
      <Lbl style={{ marginBottom: 8, display: "block" }}>Expiring & Expired Documents ({documents.length})</Lbl>
      {documents.map((doc: any, idx: number) => (
        <div key={doc.id} className="animate-si hv-glow" style={{
          display: "flex", alignItems: "center", gap: 14, padding: "12px 18px",
          borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
          borderLeft: `3px solid ${doc.isExpired ? P.red : P.amb}`,
          animationDelay: `${idx * 30}ms`,
        }} data-testid={`doc-expiring-${doc.id}`}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: TS.label, fontWeight: 600, color: P.odT2 }}>{doc.name}</span>
              <Pill label={doc.isExpired ? "Expired" : `${doc.daysUntilExpiration}d left`} c={doc.isExpired ? P.red : P.amb} bg={doc.isExpired ? P.rL : P.aL} />
            </div>
            <div style={{ fontSize: TS.label, color: P.odT3, marginTop: 2 }}>{doc.clientName} · Expires: {doc.expirationDate}</div>
          </div>
          <NextLink href={`/clients/${doc.resolvedClientId || doc.clientId}`}>
            <ChevronRight style={{ width: 16, height: 16, color: P.lt }} />
          </NextLink>
        </div>
      ))}
    </div>
  );
}

function AuditTrailTab({ auditLog, complianceAudit }: { auditLog: any[]; complianceAudit: any[] }) {
  const allEntries = [
    ...auditLog.map(a => ({ ...a, source: "kyc", date: a.createdAt })),
    ...complianceAudit.map(a => ({ ...a, source: "compliance", date: a.date })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  if (allEntries.length === 0) {
    return <EmptyState icon={<Activity />} message="No audit trail entries yet" />;
  }

  return (
    <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
      <Serif as="h2" style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1, display: "block", marginBottom: 16 }}>KYC/AML Audit Trail</Serif>
      <div style={{ position: "relative", paddingLeft: 20 }}>
        <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 1, background: P.odBorder }} />
        {allEntries.slice(0, 30).map((entry: any, index: number) => (
          <div key={entry.id || index} className="animate-si" style={{
            display: "flex", gap: 16, marginBottom: 16, position: "relative",
            animationDelay: `${index * 40}ms`,
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: 99,
              background: entry.source === "kyc" ? P.gold : P.blue,
              border: `2px solid ${P.odSurf}`, flexShrink: 0, marginTop: 4,
              position: "absolute", left: -14, zIndex: 1,
            }} />
            <div style={{ padding: 14, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, flex: 1, marginLeft: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>
                  {entry.source === "kyc" ? formatAuditAction(entry.action) : entry.subject}
                </span>
                <Pill
                  label={entry.source === "kyc" ? entry.entityType?.replace(/_/g, " ") || "kyc" : entry.type || "compliance"}
                  c={entry.source === "kyc" ? P.gold : P.blue}
                  bg={entry.source === "kyc" ? P.goldLt : P.bFr}
                />
              </div>
              {entry.source === "kyc" && entry.details && typeof entry.details === "object" && (
                <div style={{ fontSize: TS.label, color: P.odT3, marginBottom: 4 }}>
                  {Object.entries(entry.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </div>
              )}
              {entry.source === "compliance" && entry.description && (
                <div style={{ fontSize: TS.label, color: P.odT3, marginBottom: 4 }}>{entry.description}</div>
              )}
              <Mono style={{ fontSize: TS.label, color: P.lt, display: "block" }}>
                {entry.date ? new Date(entry.date).toLocaleDateString() : ""}
                {entry.clientName && ` · ${entry.clientName}`}
                {entry.performedBy && ` · ${entry.performedBy}`}
              </Mono>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceItem({ item, idx }: { item: any; idx: number }) {
  const itemColor = item.status === "overdue" ? P.red : item.status === "expiring_soon" ? P.amb : P.grn;

  return (
    <div
      className="animate-si hv-glow"
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
        borderRadius: 6, marginBottom: 8, background: P.odSurf,
        border: `1px solid ${P.odBorder}`, borderLeft: `3px solid ${itemColor}`,
        animationDelay: `${idx * 30}ms`,
      }}
      data-testid={`compliance-item-${item.id}`}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{item.type}</span>
          <Pill label={item.status.replace(/_/g, " ")} c={itemColor} bg={item.status === "overdue" ? P.rL : item.status === "expiring_soon" ? P.aL : P.gL} />
        </div>
        <div style={{ fontSize: TS.label, color: P.odT3, marginTop: 3 }}>{item.description}</div>
        <NextLink href={`/clients/${item.resolvedClientId || item.clientId}`}>
          <span style={{ fontSize: TS.label, color: P.blue, fontWeight: 500 }}>{item.clientName}</span>
        </NextLink>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {item.dueDate && (
          <Mono style={{ fontSize: TS.label, color: P.lt, display: "block" }}>
            {new Date(item.dueDate).toLocaleDateString()}
          </Mono>
        )}
        {item.completedDate && (
          <Mono style={{ fontSize: TS.label, color: P.grn, display: "block", marginTop: 2 }}>
            Done: {new Date(item.completedDate).toLocaleDateString()}
          </Mono>
        )}
      </div>
    </div>
  );
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    suitability: "Suitability",
    risk_disclosure: "Risk Disclosure",
    performance_claims: "Performance Claims",
    promissory_language: "Promissory Language",
    cherry_picked_data: "Cherry-Picked Data",
    misleading_statements: "Misleading Statements",
    age_suitability: "Age Suitability",
    concentration: "Concentration",
    liquidity_suitability: "Liquidity Suitability",
    risk_profile_mismatch: "Risk Profile Mismatch",
  };
  return labels[cat] || cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function categoryColor(cat: string): string {
  const colors: Record<string, string> = {
    risk_profile_mismatch: P.red,
    age_suitability: P.red,
    concentration: P.amb,
    liquidity_suitability: P.red,
    suitability: P.amb,
    risk_disclosure: P.blue,
    performance_claims: P.amb,
    promissory_language: P.red,
    cherry_picked_data: P.amb,
    misleading_statements: P.amb,
  };
  return colors[cat] || P.mid;
}

function FiduciaryValidationTab({ stats, auditData }: { stats: any; auditData: any }) {
  const total = stats?.total || 0;
  const clean = stats?.clean || 0;
  const flagged = stats?.flagged || 0;
  const blocked = stats?.blocked || 0;
  const resolved = stats?.resolved || 0;
  const violationPatterns: Array<{ ruleId: string; ruleName: string; category: string; count: number }> = stats?.violationPatterns || [];
  const logs: any[] = auditData?.logs || [];

  const passRate = total > 0 ? Math.round((clean / total) * 100) : 100;
  const passColor = passRate >= 90 ? P.grn : passRate >= 70 ? P.amb : P.red;

  const statCards = [
    { label: "Total Validations", count: total, color: P.blue, bg: P.bFr, icon: <ShieldCheck style={{ width: 16, height: 16, color: P.blue }} /> },
    { label: "Clean", count: clean, color: P.grn, bg: P.gL, icon: <CheckCircle2 style={{ width: 16, height: 16, color: P.grn }} /> },
    { label: "Flagged", count: flagged, color: P.amb, bg: P.aL, icon: <AlertTriangle style={{ width: 16, height: 16, color: P.amb }} /> },
    { label: "Blocked", count: blocked, color: P.red, bg: P.rL, icon: <XCircle style={{ width: 16, height: 16, color: P.red }} /> },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} className="animate-fu" style={{
            padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
            animationDelay: `${i * 50}ms`,
          }} data-testid={`fiduciary-stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Lbl>{s.label}</Lbl>
              {s.icon}
            </div>
            <Serif style={{ fontSize: TS.title, fontWeight: 600, color: s.color, display: "block" }} as="p">{s.count}</Serif>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <Lbl>Compliance Pass Rate</Lbl>
            <Mono style={{ fontSize: TS.label, fontWeight: 600, color: passColor }}>{passRate}%</Mono>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: P.odSurf2, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${passRate}%`,
              background: passRate >= 90 ? `linear-gradient(90deg, ${P.bHi}, ${P.grn})` : `linear-gradient(90deg, ${P.amb}, ${P.gold})`,
              transition: "width 1s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: TS.label, color: P.lt }}>
            <span>{resolved} resolved</span>
            <span>{blocked + flagged - resolved > 0 ? `${blocked + flagged - resolved} unresolved` : "All clear"}</span>
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <Lbl style={{ marginBottom: 12, display: "block" }}>Outcome Distribution</Lbl>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Clean", count: clean, c: P.grn, bg: P.gL },
              { label: "Flagged", count: flagged, c: P.amb, bg: P.aL },
              { label: "Blocked", count: blocked, c: P.red, bg: P.rL },
            ].map((r, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, background: r.bg }}>
                <Serif style={{ fontSize: TS.title, fontWeight: 600, color: r.c, display: "block" }} as="p">{r.count}</Serif>
                <div style={{ fontSize: TS.label, color: r.c, fontWeight: 500 }}>{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {violationPatterns.length > 0 && (
        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BarChart3 style={{ width: 16, height: 16, color: P.blue }} />
            <Lbl>Common Violation Patterns</Lbl>
          </div>
          {violationPatterns.slice(0, 10).map((pattern: any, idx: number) => {
            const maxCount = violationPatterns[0]?.count || 1;
            const barWidth = Math.max(5, (pattern.count / maxCount) * 100);
            return (
              <div key={pattern.ruleId} className="animate-si" style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                borderBottom: idx < Math.min(violationPatterns.length, 10) - 1 ? `1px solid ${P.odSurf2}` : "none",
                animationDelay: `${idx * 40}ms`,
              }} data-testid={`violation-pattern-${pattern.ruleId}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: TS.label, fontWeight: 500, color: P.odT2 }}>{pattern.ruleName}</span>
                    <Pill label={categoryLabel(pattern.category)} c={categoryColor(pattern.category)} bg={P.odSurf2} />
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: P.odSurf2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99, width: `${barWidth}%`,
                      background: categoryColor(pattern.category),
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
                <Mono style={{ fontSize: TS.label, fontWeight: 600, color: P.odT2, minWidth: 32, textAlign: "right" }}>{pattern.count}</Mono>
              </div>
            );
          })}
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Eye style={{ width: 16, height: 16, color: P.blue }} />
            <Lbl>Recent Validation Log</Lbl>
          </div>
          {logs.slice(0, 15).map((log: any, idx: number) => {
            const outcomeColor = log.outcome === "clean" ? P.grn : log.outcome === "flagged" ? P.amb : P.red;
            const matches = Array.isArray(log.matches) ? log.matches : [];
            return (
              <div key={log.id} className="animate-si" style={{
                display: "flex", alignItems: "center", gap: 14, padding: "10px 0",
                borderBottom: idx < Math.min(logs.length, 15) - 1 ? `1px solid ${P.odSurf2}` : "none",
                animationDelay: `${idx * 30}ms`,
              }} data-testid={`fiduciary-log-${log.id}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: TS.label, fontWeight: 500, color: P.odT2 }}>{log.contentType}</span>
                    <Pill label={log.outcome} c={outcomeColor} bg={log.outcome === "clean" ? P.gL : log.outcome === "flagged" ? P.aL : P.rL} />
                    {log.resolvedBy && <Pill label="Resolved" c={P.grn} bg={P.gL} />}
                    {matches.length > 0 && (
                      <span style={{ fontSize: TS.label, color: P.lt }}>{matches.length} violation{matches.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  {matches.length > 0 && (
                    <div style={{ fontSize: TS.label, color: P.odT3, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {matches.map((m: any) => m.ruleName).join(", ")}
                    </div>
                  )}
                </div>
                <Mono style={{ fontSize: TS.label, color: P.lt }}>{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ""}</Mono>
              </div>
            );
          })}
        </div>
      )}

      {total === 0 && (
        <EmptyState icon={<ShieldAlert />} message="No fiduciary validation data yet. Validations are logged when AI content is generated." />
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: any; message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <div style={{ width: 40, height: 40, color: P.lt, margin: "0 auto 12px", opacity: 0.5 }}>{icon}</div>
      <p style={{ fontSize: TS.supporting, color: P.lt }}>{message}</p>
    </div>
  );
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    risk_rating_created: "Risk Rating Calculated",
    aml_screening_completed: "AML Screening Completed",
    automated_screening_completed: "Automated Screening Completed",
    batch_screening_completed: "Batch Screening Completed",
    screening_resolved: "Screening Match Resolved",
    edd_triggered: "EDD Workflow Triggered",
    edd_in_progress: "EDD Review Started",
    edd_completed: "EDD Review Completed",
    edd_updated: "EDD Record Updated",
    review_completed: "Periodic Review Completed",
    ofac_sdn_list_updated: "OFAC SDN List Updated",
    sample_watchlists_loaded: "Sample Watchlists Loaded",
    screening_config_updated: "Screening Config Updated",
  };
  return map[action] || action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}
