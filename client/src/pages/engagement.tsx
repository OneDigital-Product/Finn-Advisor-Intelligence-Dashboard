import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import NextLink from "next/link";
import {
  Zap,
  Activity,
  Target,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Phone,
  Video,
  FileText,
  Globe,
  Eye,
  MousePointerClick,
  RefreshCw,
  ChevronRight,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { P, EASE } from "@/styles/tokens";
import { Serif, Mono, Lbl, Supporting, TS } from "@/components/design/typography";
import { Pill } from "@/components/design/pill";
import { NavTabs } from "@/components/design/nav-tabs";
import { StatusIndicator, scoreToLevel } from "@/components/design/status-indicator";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";

function formatTime(d: string | Date) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getEventIcon(type: string) {
  switch (type) {
    case "email_open":
    case "email_click": return <Mail style={{ width: 12, height: 12 }} />;
    case "webinar_attended":
    case "webinar_registered": return <Video style={{ width: 12, height: 12 }} />;
    case "content_download": return <FileText style={{ width: 12, height: 12 }} />;
    case "website_visit": return <Globe style={{ width: 12, height: 12 }} />;
    case "pricing_page_view": return <Eye style={{ width: 12, height: 12 }} />;
    case "form_submission": return <MousePointerClick style={{ width: 12, height: 12 }} />;
    case "phone_call": return <Phone style={{ width: 12, height: 12 }} />;
    default: return <Activity style={{ width: 12, height: 12 }} />;
  }
}

function getActionIcon(type: string) {
  switch (type) {
    case "call": return <Phone style={{ width: 14, height: 14 }} />;
    case "email": return <Mail style={{ width: 14, height: 14 }} />;
    case "meeting": return <Video style={{ width: 14, height: 14 }} />;
    default: return <Target style={{ width: 14, height: 14 }} />;
  }
}

function getTrendIcon(trend: string) {
  if (trend === "increasing") return <TrendingUp style={{ width: 12, height: 12, color: P.grn }} />;
  if (trend === "decreasing") return <TrendingDown style={{ width: 12, height: 12, color: P.red }} />;
  return <Minus style={{ width: 12, height: 12, color: P.lt }} />;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? P.grn : score >= 40 ? P.amb : P.red;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <Lbl>{label}</Lbl>
        <Mono style={{ fontSize: TS.label, fontWeight: 600, color }}>{score}</Mono>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: P.odSurf2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${score}%`, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

type TabId = "overview" | "actions" | "signals" | "timeline";

export default function EngagementPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/engagement/dashboard"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/engagement/actions/generate");
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagement/dashboard"] });
      toast({ title: "Actions generated", description: `${result.generated} actions across ${result.clients} clients` });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/engagement/actions/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagement/dashboard"] });
      toast({ title: "Action completed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to complete action", description: err.message, variant: "destructive" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/engagement/actions/${id}/dismiss`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagement/dashboard"] });
      toast({ title: "Action dismissed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to dismiss action", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1100 }} className="space-y-4">
        <Skeleton className="h-10 w-60" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const scores = data?.scores || [];
  const signals = data?.signals || [];
  const actions = data?.actions || [];
  const recentEvents = data?.recentEvents || [];

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "actions", label: "Action Queue", count: actions.length },
    { id: "signals", label: "Intent Signals", count: signals.length },
    { id: "timeline", label: "Activity Timeline", count: recentEvents.length },
  ];

  return (
    <div style={{ maxWidth: 1100 }} className="space-y-4">
      <Serif as="h1" style={{ fontSize: TS.title, fontWeight: 600, color: P.odT1 }} data-testid="text-page-title">Engagement Hub</Serif>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <NavTabs
          tabs={tabs}
          active={tab}
          onChange={(id) => setTab(id as TabId)}

        />
        <div className="flex items-center gap-2">
          <CassidyAnalysisButton
            taskType="analysis"
            clientId="engagement-overview"
            context={{
              section: "engagement",
              avgEngagementScore: summary.avgEngagementScore || 0,
              highEngagement: summary.highEngagement || 0,
              activeSignals: summary.activeSignals || 0,
              pendingActions: summary.pendingActions || 0,
              topScores: scores.slice(0, 5).map((s: any) => ({
                client: s.clientName,
                score: s.compositeScore,
                trend: s.trend,
                segment: s.segment,
              })),
              activeIntentSignals: signals.slice(0, 5).map((s: any) => ({
                title: s.title,
                strength: s.strength,
                client: s.clientName,
              })),
              pendingActionsList: actions.slice(0, 5).map((a: any) => ({
                title: a.title,
                category: a.category,
                priority: a.priority,
                client: a.clientName,
              })),
            }}
            label="AI Insights"
            icon={<Sparkles style={{ width: 14, height: 14 }} />}
            size="sm"
          />
        <Button
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-actions"
        >
          {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
          Generate Actions
        </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { l: "Avg Engagement", v: `${summary.avgEngagementScore || 0}`, c: summary.avgEngagementScore >= 50 ? P.grn : P.amb, icon: <Activity style={{ width: 14, height: 14 }} /> },
          { l: "High Engagement", v: String(summary.highEngagement || 0), c: P.grn, icon: <TrendingUp style={{ width: 14, height: 14 }} /> },
          { l: "Intent Signals", v: String(summary.activeSignals || 0), c: P.blue, icon: <Zap style={{ width: 14, height: 14 }} /> },
          { l: "Pending Actions", v: String(summary.pendingActions || 0), c: P.amb, icon: <Target style={{ width: 14, height: 14 }} /> },
        ].map((m, i) => (
          <div
            key={i}
            className="animate-fu"
            style={{
              padding: "16px 20px",
              borderRadius: 6,
              background: P.odSurf,
              border: `1px solid ${P.odBorder}`,
              animationDelay: `${i * 50}ms`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Lbl>{m.l}</Lbl>
              <div style={{ color: m.c }}>{m.icon}</div>
            </div>
            <Serif style={{ fontSize: TS.title, fontWeight: 600, color: m.c }} data-testid={`text-engagement-${m.l.toLowerCase().replace(/\s/g, "-")}`}>{m.v}</Serif>
          </div>
        ))}
      </div>

      {tab === "overview" && (
        <div role="tabpanel" id="tabpanel-overview" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Activity style={{ width: 14, height: 14, color: P.blue }} />
              <Serif as="h2" style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Engagement Scores</Serif>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {scores.length === 0 && (
                <p style={{ fontSize: TS.label, color: P.lt, textAlign: "center", padding: "24px 0" }}>
                  No engagement data yet. Click "Generate Actions" to analyze engagement.
                </p>
              )}
              {scores.slice(0, 15).map((s: any) => (
                <NextLink href={`/clients/${s.clientId}`} key={s.id || s.clientId}>
                  <div
                    className="hv-glow"
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      borderRadius: 6, marginBottom: 4, cursor: "pointer",
                      border: `1px solid ${P.odBorder}`,
                    }}
                    data-testid={`score-card-${s.clientId}`}
                  >
                    <StatusIndicator level={scoreToLevel(s.compositeScore)} score={s.compositeScore} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2 }}>{s.clientName}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <ScoreBar score={s.frequencyScore} label="Freq" />
                        <ScoreBar score={s.recencyScore} label="Recency" />
                        <ScoreBar score={s.diversityScore} label="Diversity" />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {getTrendIcon(s.trend)}
                      <Pill label={`Tier ${s.segment}`} c={P.blue} bg={P.bFr} />
                    </div>
                  </div>
                </NextLink>
              ))}
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Zap style={{ width: 14, height: 14, color: P.amb }} />
              <Serif as="h2" style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Active Intent Signals</Serif>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {signals.length === 0 && (
                <p style={{ fontSize: TS.label, color: P.lt, textAlign: "center", padding: "24px 0" }}>
                  No active intent signals detected.
                </p>
              )}
              {signals.slice(0, 10).map((s: any) => (
                <div
                  key={s.id}
                  style={{
                    padding: "12px 14px", borderRadius: 6, marginBottom: 6,
                    border: `1px solid ${s.strength === "high" ? `${P.red}30` : P.odBorder}`,
                    background: s.strength === "high" ? P.rL : P.odSurf,
                  }}
                  data-testid={`signal-card-${s.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle style={{
                        width: 12, height: 12,
                        color: s.strength === "high" ? P.red : P.amb,
                      }} />
                      <span style={{ fontSize: TS.label, fontWeight: 600, color: P.odT2 }}>{s.title}</span>
                    </div>
                    <StatusIndicator
                      level={s.strength === "high" ? "at-risk" : "review"}
                      label={s.strength}
                      size="sm"
                    />
                  </div>
                  <Supporting style={{ marginBottom: 4 }}>{s.description}</Supporting>
                  <NextLink href={`/clients/${s.clientId}`}>
                    <span style={{ fontSize: TS.label, color: P.blue, fontWeight: 600 }}>{s.clientName} →</span>
                  </NextLink>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "actions" && (
        <div role="tabpanel" id="tabpanel-actions" style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Target style={{ width: 14, height: 14, color: P.grn }} />
              <Serif as="h2" style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Recommended Actions</Serif>
            </div>
            <Pill label={`${actions.length} pending`} c={P.blue} bg={P.bIce} />
          </div>
          {actions.length === 0 && (
            <p style={{ fontSize: TS.label, color: P.lt, textAlign: "center", padding: "32px 0" }}>
              No pending actions. Click "Generate Actions" to analyze your book and get recommendations.
            </p>
          )}
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {actions.map((a: any, idx: number) => (
              <div
                key={a.id}
                className="animate-si"
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px",
                  borderRadius: 6, marginBottom: 6,
                  border: `1px solid ${a.priority > 80 ? `${P.red}30` : P.odBorder}`,
                  background: a.priority > 80 ? `${P.rL}80` : P.odSurf,
                  animationDelay: `${idx * 30}ms`,
                }}
                data-testid={`action-card-${a.id}`}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                  background: a.category === "outreach" ? P.bIce : a.category === "retention" ? P.rL : P.aL,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: a.category === "outreach" ? P.blue : a.category === "retention" ? P.red : P.amb,
                }}>
                  {getActionIcon(a.actionType)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2, display: "block" }}>{a.title}</span>
                      <NextLink href={`/clients/${a.clientId}`}>
                        <span style={{ fontSize: TS.label, color: P.blue, fontWeight: 600 }}>{a.clientName}</span>
                      </NextLink>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Pill label={a.category} c={P.mid} bg={P.odSurf2} />
                      {a.estimatedImpact && (
                        <Pill
                          label={a.estimatedImpact}
                          c={a.estimatedImpact === "high" ? P.red : a.estimatedImpact === "medium" ? P.amb : P.lt}
                          bg={a.estimatedImpact === "high" ? P.rL : a.estimatedImpact === "medium" ? P.aL : P.odSurf2}
                        />
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: TS.label, color: P.odT3, marginTop: 4 }}>{a.description}</p>
                  {a.reasoning && (
                    <p style={{ fontSize: TS.label, color: P.lt, marginTop: 4, fontStyle: "italic" }}>{a.reasoning}</p>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => completeMutation.mutate(a.id)}
                      disabled={completeMutation.isPending}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                        borderRadius: 4, border: `1px solid ${P.grn}40`, background: P.gL,
                        fontSize: TS.label, fontWeight: 600, color: P.grn, cursor: "pointer",
                      }}
                      data-testid={`button-complete-${a.id}`}
                    >
                      <CheckCircle2 style={{ width: 11, height: 11 }} /> Complete
                    </button>
                    <button
                      onClick={() => dismissMutation.mutate(a.id)}
                      disabled={dismissMutation.isPending}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                        borderRadius: 4, border: `1px solid ${P.odBorder}`, background: P.odSurf,
                        fontSize: TS.label, fontWeight: 600, color: P.lt, cursor: "pointer",
                      }}
                      data-testid={`button-dismiss-${a.id}`}
                    >
                      <XCircle style={{ width: 11, height: 11 }} /> Dismiss
                    </button>
                  </div>
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: TS.label, fontWeight: 700,
                  color: a.priority > 80 ? P.red : a.priority > 60 ? P.amb : P.lt,
                  border: `2px solid ${a.priority > 80 ? P.red : a.priority > 60 ? P.amb : P.odBorder}`,
                }}>
                  {a.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "signals" && (
        <div role="tabpanel" id="tabpanel-signals" style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Zap style={{ width: 14, height: 14, color: P.amb }} />
            <Serif as="h2" style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Intent Signals</Serif>
          </div>
          {signals.length === 0 && (
            <p style={{ fontSize: TS.label, color: P.lt, textAlign: "center", padding: "32px 0" }}>
              No active intent signals. Generate actions to detect behavioral patterns.
            </p>
          )}
          {signals.map((s: any) => (
            <div
              key={s.id}
              style={{
                padding: "14px 16px", borderRadius: 6, marginBottom: 8,
                border: `1px solid ${s.strength === "high" ? `${P.red}30` : P.odBorder}`,
              }}
              data-testid={`signal-detail-${s.id}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.odT2, display: "block" }}>{s.title}</span>
                  <NextLink href={`/clients/${s.clientId}`}>
                    <span style={{ fontSize: TS.label, color: P.blue, fontWeight: 600 }}>{s.clientName}</span>
                  </NextLink>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <StatusIndicator
                    level={s.strength === "high" ? "at-risk" : "review"}
                    label={s.strength}
                    size="sm"
                  />
                  <Mono style={{ fontSize: TS.label, color: P.lt }}>{formatTime(s.detectedAt)}</Mono>
                </div>
              </div>
              <p style={{ fontSize: TS.label, color: P.odT3 }}>{s.description}</p>
              {s.evidence && Array.isArray(s.evidence) && s.evidence.length > 0 && (
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 4, background: P.odSurf2 }}>
                  <Lbl>Evidence</Lbl>
                  <div style={{ marginTop: 4 }}>
                    {(s.evidence as any[]).slice(0, 5).map((e: any, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 6, fontSize: TS.label, color: P.odT3, marginBottom: 2 }}>
                        <span>{e.type}</span>
                        {e.subject && <span>— {e.subject}</span>}
                        {e.date && <Mono style={{ fontSize: TS.label, color: P.lt }}>{formatTime(e.date)}</Mono>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "timeline" && (
        <div role="tabpanel" id="tabpanel-timeline" style={{ padding: 20, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Clock style={{ width: 14, height: 14, color: P.blue }} />
            <Serif as="h2" style={{ fontSize: TS.section, fontWeight: 600, color: P.odT1 }}>Activity Timeline</Serif>
          </div>
          {recentEvents.length === 0 && (
            <p style={{ fontSize: TS.label, color: P.lt, textAlign: "center", padding: "32px 0" }}>
              No engagement events recorded yet. Events from email opens, webinar attendance, content downloads, and website visits will appear here.
            </p>
          )}
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{
              position: "absolute", left: 7, top: 0, bottom: 0, width: 2,
              background: P.odSurf2,
            }} />
            {recentEvents.map((e: any, idx: number) => {
              // Insert date group header when the date changes
              const eventDate = e.occurredAt ? new Date(e.occurredAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "";
              const prevDate = idx > 0 && recentEvents[idx - 1].occurredAt
                ? new Date(recentEvents[idx - 1].occurredAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
                : "";
              const showDateHeader = idx === 0 || eventDate !== prevDate;
              return (
                <div key={e.id || idx}>
                  {showDateHeader && eventDate && (
                    <div style={{
                      padding: "8px 0 6px",
                      marginBottom: 4,
                      borderBottom: `1px solid ${P.odBorder}`,
                    }}>
                      <Lbl style={{ fontSize: 10, letterSpacing: ".12em" }}>{eventDate}</Lbl>
                    </div>
                  )}
              <div
                key={e.id || idx}
                className="animate-si"
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12,
                  position: "relative", animationDelay: `${idx * 30}ms`,
                }}
                data-testid={`event-timeline-${e.id}`}
              >
                <div style={{
                  position: "absolute", left: -20, top: 4,
                  width: 16, height: 16, borderRadius: "50%",
                  background: P.odSurf, border: `2px solid ${P.blue}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: P.blue,
                }}>
                  {getEventIcon(e.eventType)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: TS.label, fontWeight: 600, color: P.odT2 }}>{e.eventType.replace(/_/g, " ")}</span>
                      <Pill label={e.channel} c={P.mid} bg={P.odSurf2} />
                    </div>
                    <Mono style={{ fontSize: TS.label, color: P.lt }}>{formatTime(e.occurredAt)}</Mono>
                  </div>
                  <NextLink href={`/clients/${e.clientId}`}>
                    <span style={{ fontSize: TS.label, color: P.blue, fontWeight: 600 }}>{e.clientName}</span>
                  </NextLink>
                  {e.subject && <p style={{ fontSize: TS.label, color: P.odT3, marginTop: 2 }}>{e.subject}</p>}
                  {e.description && <p style={{ fontSize: TS.label, color: P.lt, marginTop: 2 }}>{e.description}</p>}
                </div>
              </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
