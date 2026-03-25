import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  MessageSquare,
  Activity,
  BookOpen,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Bell,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { SignalCard } from "@/components/design/signal-card";
import { EmptyState } from "@/components/empty-state";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  calm: { label: "Calm", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950" },
  neutral: { label: "Neutral", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-900" },
  anxious: { label: "Anxious", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950" },
  frustrated: { label: "Frustrated", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950" },
  panicked: { label: "Panicked", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950" },
  euphoric: { label: "Euphoric", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950" },
};

const ANXIETY_CONFIG: Record<string, { label: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
  low: { label: "Low", variant: "secondary" },
  moderate: { label: "Moderate", variant: "default" },
  high: { label: "High", variant: "destructive" },
  critical: { label: "Critical", variant: "destructive" },
};

function RiskGauge({ score }: { score: number }) {
  const color = score > 70 ? "#ef4444" : score > 40 ? "#f59e0b" : "#22c55e";
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="relative w-32 h-20 mx-auto" data-testid="gauge-behavioral-risk">
      <svg viewBox="0 0 120 70" className="w-full h-full" role="img" aria-label={`Behavioral risk gauge showing score ${score} out of 100`}>
        <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" strokeLinecap="round" />
        <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 157} 157`} />
        <line x1="60" y1="65" x2="60" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${rotation}, 60, 65)`} />
        <circle cx="60" cy="65" r="4" fill={color} />
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className="text-xl font-bold" style={{ color }} data-testid="text-behavioral-risk-score">{score}</span>
        <span className="text-[10px] text-muted-foreground block">/100</span>
      </div>
    </div>
  );
}

function SentimentTimeline({ timeline }: { timeline: Array<{ date: string; sentiment: string; sentimentScore: number; behavioralRiskScore: number; anxietyLevel: string; sourceType: string }> }) {
  if (timeline.length === 0) return null;

  const maxScore = 100;
  const chartHeight = 120;
  const chartWidth = 500;
  const padding = 20;
  const usableWidth = chartWidth - padding * 2;
  const usableHeight = chartHeight - padding * 2;

  const reversed = [...timeline].reverse();
  const points = reversed.map((t, i) => {
    const x = padding + (i / Math.max(reversed.length - 1, 1)) * usableWidth;
    const y = padding + ((maxScore - t.sentimentScore) / maxScore) * usableHeight;
    return { x, y, ...t };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <Card style={V2_CARD} data-testid="card-sentiment-timeline">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Sentiment Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[400px]" style={{ maxHeight: 160 }} role="img" aria-label="Sentiment timeline showing behavioral risk and sentiment scores over time">
            <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/30" />
            <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/30" />

            <line x1={padding} y1={padding + usableHeight * 0.25} x2={chartWidth - padding} y2={padding + usableHeight * 0.25} stroke="currentColor" strokeWidth="0.3" strokeDasharray="4 4" className="text-muted-foreground/20" />
            <line x1={padding} y1={padding + usableHeight * 0.5} x2={chartWidth - padding} y2={padding + usableHeight * 0.5} stroke="currentColor" strokeWidth="0.3" strokeDasharray="4 4" className="text-muted-foreground/20" />
            <line x1={padding} y1={padding + usableHeight * 0.75} x2={chartWidth - padding} y2={padding + usableHeight * 0.75} stroke="currentColor" strokeWidth="0.3" strokeDasharray="4 4" className="text-muted-foreground/20" />

            <text x={padding - 4} y={padding + 4} textAnchor="end" className="fill-muted-foreground" fontSize="7">100</text>
            <text x={padding - 4} y={padding + usableHeight * 0.5 + 3} textAnchor="end" className="fill-muted-foreground" fontSize="7">50</text>
            <text x={padding - 4} y={chartHeight - padding + 4} textAnchor="end" className="fill-muted-foreground" fontSize="7">0</text>

            <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {points.map((p, i) => {
              const cfg = SENTIMENT_CONFIG[p.sentiment] || SENTIMENT_CONFIG.neutral;
              const fillColor = p.sentiment === "calm" ? "#22c55e" :
                p.sentiment === "anxious" ? "#f59e0b" :
                p.sentiment === "panicked" ? "#ef4444" :
                p.sentiment === "euphoric" ? "#a855f7" :
                p.sentiment === "frustrated" ? "#f97316" : "#6b7280";
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill={fillColor} stroke="white" strokeWidth="1.5" />
                  {i === points.length - 1 && (
                    <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-foreground" fontSize="8" fontWeight="600">
                      {p.sentimentScore}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1 text-[10px]">
              <div className={`w-2 h-2 rounded-full ${key === "calm" ? "bg-green-500" : key === "anxious" ? "bg-amber-500" : key === "panicked" ? "bg-red-500" : key === "euphoric" ? "bg-purple-500" : key === "frustrated" ? "bg-orange-500" : "bg-gray-500"}`} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DeEscalationScripts() {
  const [selectedBias, setSelectedBias] = useState<string>("all");
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ scripts: any[]; biases: string[] }>({
    queryKey: ["/api/behavioral/de-escalation-scripts", selectedBias],
    queryFn: async () => {
      const params = selectedBias !== "all" ? `?bias=${encodeURIComponent(selectedBias)}` : "";
      const res = await fetch(`/api/behavioral/de-escalation-scripts${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scripts");
      return res.json();
    },
  });

  return (
    <Card style={V2_CARD} data-testid="card-de-escalation-scripts">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            De-Escalation Script Library
          </CardTitle>
          <Select value={selectedBias} onValueChange={setSelectedBias}>
            <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-bias-filter">
              <SelectValue placeholder="Filter by bias..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Biases</SelectItem>
              {(data?.biases || []).map((b: string) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.scripts || []).map((script: any) => (
              <div
                key={script.id}
                className="border rounded-lg overflow-hidden"
                data-testid={`script-${script.id}`}
              >
                <button
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                  data-testid={`button-expand-script-${script.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] shrink-0">{script.bias}</Badge>
                    <span className="text-sm font-medium truncate">{script.title}</span>
                  </div>
                  {expandedScript === script.id ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                </button>
                {expandedScript === script.id && (
                  <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Situation</p>
                      <p className="text-sm">{script.situation}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Suggested Script</p>
                      <blockquote className="text-sm italic border-l-2 border-primary/30 pl-3 py-1 bg-background rounded-r">{script.script}</blockquote>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Evidence Basis</p>
                      <p className="text-xs text-muted-foreground">{script.evidenceBasis}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {script.tags?.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BehavioralSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [analyzeText, setAnalyzeText] = useState("");
  const [sourceType, setSourceType] = useState("manual");

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "behavioral"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/behavioral`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch behavioral profile");
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });

  const { data: alertData } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "behavioral", "alerts"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/behavioral/alerts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check alerts");
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/behavioral/analyze`, {
        communicationText: analyzeText,
        sourceType,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "behavioral"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "behavioral", "alerts"] });
      toast({ title: "Analysis complete", description: "Sentiment analysis has been saved." });
      setAnalyzeText("");
    },
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const latest = profile?.latestAnalysis;
  const sentimentCfg = SENTIMENT_CONFIG[latest?.sentiment] || SENTIMENT_CONFIG.neutral;
  const anxietyCfg = ANXIETY_CONFIG[latest?.anxietyLevel] || ANXIETY_CONFIG.low;

  return (
    <div className="space-y-4" data-testid="section-behavioral">
      {alertData?.shouldAlert && (
        <SignalCard
          level={alertData.alertLevel === "critical" ? "action-needed" : "review"}
          title={alertData.alertLevel === "critical" ? "Critical Alert" : "Warning"}
        >
          <p data-testid="text-alert-reason">{alertData.reason}</p>
          <p style={{ fontWeight: 500, marginTop: 6 }} data-testid="text-alert-action">{alertData.recommendedAction}</p>
        </SignalCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={V2_CARD} data-testid="card-behavioral-risk">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Behavioral Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskGauge score={profile?.currentRiskScore || 0} />
            <div className="text-center mt-2">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                Trend:
                {profile?.anxietyTrend === "increasing" && <><TrendingUp className="w-3 h-3 text-red-500" /> Increasing</>}
                {profile?.anxietyTrend === "decreasing" && <><TrendingDown className="w-3 h-3 text-green-500" /> Decreasing</>}
                {profile?.anxietyTrend === "stable" && <><Minus className="w-3 h-3" /> Stable</>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={V2_CARD} data-testid="card-current-sentiment">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Current Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latest ? (
              <div className="space-y-3">
                <div className={`text-center p-3 rounded-lg ${sentimentCfg.bg}`}>
                  <span className={`text-lg font-bold ${sentimentCfg.color}`} data-testid="text-current-sentiment">
                    {sentimentCfg.label}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">Score: {latest.sentimentScore}/100</div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Anxiety</span>
                  <Badge variant={anxietyCfg.variant} data-testid="badge-anxiety-level">{anxietyCfg.label}</Badge>
                </div>
                {latest.dominantBias && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Dominant Bias</span>
                    <Badge variant="outline" data-testid="badge-dominant-bias">{latest.dominantBias}</Badge>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Brain}
                title="No behavioral analyses yet"
                description="Run a behavioral finance analysis to identify cognitive biases and risk tolerance patterns that may affect investment decisions."
                actionLabel="Run Analysis"
                onAction={() => {}}
                timeEstimate="Takes about 2 minutes"
              />
            )}
          </CardContent>
        </Card>

        <Card style={V2_CARD} data-testid="card-behavioral-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Analyses</span>
                <span className="font-medium" data-testid="text-analysis-count">{profile?.analysisCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Sentiment</span>
                <span className="font-medium" data-testid="text-avg-sentiment">{profile?.averageSentiment || 50}/100</span>
              </div>
              {(profile?.dominantBiases || []).length > 0 && (
                <div>
                  <span className="text-muted-foreground block mb-1">Common Biases</span>
                  <div className="flex flex-wrap gap-1">
                    {profile.dominantBiases.slice(0, 3).map((b: string) => (
                      <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {latest?.coachingNotes && (
        <Card style={V2_CARD} data-testid="card-coaching-notes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Coaching Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm" data-testid="text-coaching-notes">{latest.coachingNotes}</p>
            {latest.deEscalationStrategy && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">De-Escalation Strategy</p>
                <p className="text-sm" data-testid="text-de-escalation-strategy">{latest.deEscalationStrategy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <SentimentTimeline timeline={profile?.timeline || []} />

      <Card style={V2_CARD} data-testid="card-analyze-communication">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Analyze Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-source-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone_notes">Phone Notes</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Paste client communication text here for sentiment analysis..."
              value={analyzeText}
              onChange={(e) => setAnalyzeText(e.target.value)}
              className="min-h-[100px] text-sm"
              data-testid="input-communication-text"
            />
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeText.length < 10 || analyzeMutation.isPending}
              size="sm"
              data-testid="button-analyze-sentiment"
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</>
              ) : (
                <><Brain className="w-3 h-3 mr-1" /> Analyze Sentiment</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CassidyAnalysisButton
        taskType="analysis"
        clientId={clientId}
        context={{
          section: "behavioral",
          behavioralRiskScore: profile?.currentRiskScore || 0,
          anxietyTrend: profile?.anxietyTrend || "stable",
          currentSentiment: latest?.sentiment || "neutral",
          sentimentScore: latest?.sentimentScore || 50,
          anxietyLevel: latest?.anxietyLevel || "low",
          dominantBias: latest?.dominantBias || "none",
          analysisCount: profile?.analysisCount || 0,
          averageSentiment: profile?.averageSentiment || 50,
          dominantBiases: profile?.dominantBiases || [],
          timeline: (profile?.timeline || []).slice(0, 5).map((t: any) => ({
            date: t.date,
            sentiment: t.sentiment,
            score: t.sentimentScore,
            anxiety: t.anxietyLevel,
          })),
          alertActive: alertData?.shouldAlert || false,
          alertLevel: alertData?.alertLevel || null,
          coachingNotes: latest?.coachingNotes || null,
          deEscalationStrategy: latest?.deEscalationStrategy || null,
        }}
        label="AI Coaching Brief"
        icon={<Brain className="h-4 w-4" />}
        displayMode="inline"
      />

      <DeEscalationScripts />
    </div>
  );
}
