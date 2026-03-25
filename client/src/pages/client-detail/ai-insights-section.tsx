import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  Shield,
  Target,
  ArrowRight,
  Sparkles,
  Activity,
  CircleDot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

interface InsightsDashboardData {
  executiveSummary: string | null;
  healthScore: number | null;
  healthScoreLabel: string | null;
  portfolioInsights: Array<{ title: string | null; description: string | null; type: string | null; metric?: string | null }> | null;
  marketTrends: Array<{ title: string | null; description: string | null; impact: string | null; relevantHoldings?: string[] | null }> | null;
  recommendations: Array<{ title: string | null; description: string | null; priority: string | null; category: string | null; estimatedValue?: string | null }> | null;
  riskIndicators: Array<{ title: string | null; severity: string | null; description: string | null; action: string | null }> | null;
  keyMetrics: Array<{ label: string | null; value: string | null; trend: string | null; context: string | null }> | null;
  nextSteps: string[] | null;
}

function getScoreColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-900" };
  if (score >= 60) return { bg: "bg-blue-500", text: "text-blue-700 dark:text-blue-400", ring: "ring-blue-200 dark:ring-blue-900" };
  if (score >= 40) return { bg: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", ring: "ring-amber-200 dark:ring-amber-900" };
  return { bg: "bg-red-500", text: "text-red-700 dark:text-red-400", ring: "ring-red-200 dark:ring-red-900" };
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function InsightTypeIcon({ type }: { type: string }) {
  if (type === "positive") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (type === "warning") return <AlertTriangle className="w-4 h-4 text-amber-600" />;
  if (type === "action") return <Target className="w-4 h-4 text-blue-600" />;
  return <CircleDot className="w-4 h-4 text-gray-500" />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${variants[priority] || variants.low}`}>{priority}</span>;
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-blue-500" };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[severity] || colors.low}`} />;
}

function ImpactBadge({ impact }: { impact: string }) {
  const config: Record<string, { icon: any; className: string }> = {
    positive: { icon: TrendingUp, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" },
    negative: { icon: TrendingDown, className: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400" },
    neutral: { icon: Minus, className: "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400" },
  };
  const c = config[impact] || config.neutral;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.className}`}>
      <Icon className="w-3 h-3" /> {impact}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="ai-insights-loading">
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
      </div>
    </div>
  );
}

export function AIInsightsSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  // Persist AI insights in React Query cache so they survive tab switches.
  // The cache key includes clientId so each client has its own insights.
  const cacheKey = ["ai-insights-dashboard", clientId];
  const data = (qc.getQueryData<InsightsDashboardData>(cacheKey)) ?? null;
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set());

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/insights-dashboard", { clientId });
      return res.json();
    },
    onSuccess: (result) => {
      qc.setQueryData(cacheKey, result);
      toast({ title: "AI Insights Generated", description: "Dashboard updated with latest analysis." });
    },
    onError: (err: any) => {
      toast({ title: "Generation Failed", description: err.message || "Could not generate insights.", variant: "destructive" });
    },
  });

  const toggleRec = (idx: number) => {
    setExpandedRecs(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // Auto-generate insights on first visit when cache is empty
  const autoTriggered = useRef(false);
  useEffect(() => {
    if (!data && !generateMutation.isPending && !autoTriggered.current) {
      autoTriggered.current = true;
      generateMutation.mutate();
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data && !generateMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="ai-insights-empty">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: P.bIce }}>
          <Brain className="w-10 h-10" style={{ color: P.blue }} />
        </div>
        <div className="text-center max-w-md space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">AI-Driven Insights Dashboard</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate a comprehensive AI analysis of {clientName}'s financial position, including portfolio insights, market trends, personalized recommendations, and risk indicators.
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          size="lg"
          className="gap-2"
          style={{ background: P.blue }}
          data-testid="button-generate-insights"
        >
          <Sparkles className="w-5 h-5" />
          Generate AI Insights
        </Button>
      </div>
    );
  }

  if (generateMutation.isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: P.blue }} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Analyzing {clientName}'s financial data...</span>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data) return null;

  const hasHealthScore = data.healthScore != null;
  const safeHealthScore = data.healthScore ?? 0;
  const scoreColor = getScoreColor(safeHealthScore);

  const portfolioInsights = data.portfolioInsights ?? [];
  const marketTrends = data.marketTrends ?? [];
  const recommendations = data.recommendations ?? [];
  const riskIndicators = data.riskIndicators ?? [];
  const keyMetrics = data.keyMetrics ?? [];
  const nextSteps = data.nextSteps ?? [];

  return (
    <div className="space-y-6" data-testid="ai-insights-dashboard">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" style={{ color: P.blue }} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights Dashboard</h2>
          <Badge variant="secondary" className="text-xs">AI-Generated</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="gap-1.5"
          data-testid="button-refresh-insights"
        >
          {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      <Card className="border-0 shadow-sm" style={{ ...V2_CARD, background: `linear-gradient(135deg, ${P.bFr}, white)` }}>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ring-4 ${hasHealthScore ? scoreColor.ring : "ring-gray-200 dark:ring-gray-700"}`}>
                <div className={`absolute inset-1 rounded-full ${hasHealthScore ? scoreColor.bg : "bg-gray-300"} opacity-10`} />
                <span className={`text-2xl font-bold ${hasHealthScore ? scoreColor.text : "text-gray-400"}`} data-testid="text-health-score">{hasHealthScore ? safeHealthScore : "—"}</span>
              </div>
              <span className={`text-xs font-medium ${hasHealthScore ? scoreColor.text : "text-gray-400"}`}>{data.healthScoreLabel ?? "Pending"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Executive Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed" data-testid="text-executive-summary">
                {data.executiveSummary ?? "Not available"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {keyMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {keyMetrics.map((m, i) => (
            <Card key={i} style={V2_CARD} className="border shadow-sm" data-testid={`card-metric-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{m.label ?? "Metric"}</span>
                  <TrendIcon trend={m.trend ?? "stable"} />
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{m.value ?? "—"}</div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{m.context ?? ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {portfolioInsights.length > 0 && (
          <Card style={V2_CARD} className="border shadow-sm" data-testid="card-portfolio-insights">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: P.blue }} />
                Portfolio Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {portfolioInsights.map((ins, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-testid={`insight-portfolio-${i}`}>
                  <InsightTypeIcon type={ins.type ?? "info"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{ins.title ?? "Insight"}</span>
                      {ins.metric && <Badge variant="secondary" className="text-xs">{ins.metric}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ins.description ?? "Not available"}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {marketTrends.length > 0 && (
          <Card style={V2_CARD} className="border shadow-sm" data-testid="card-market-trends">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: P.blue }} />
                Market Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {marketTrends.map((trend, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-testid={`trend-market-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{trend.title ?? "Trend"}</span>
                    <ImpactBadge impact={trend.impact ?? "neutral"} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{trend.description ?? "Not available"}</p>
                  {trend.relevantHoldings && trend.relevantHoldings.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {trend.relevantHoldings.map((t, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {recommendations.length > 0 && (
        <Card style={V2_CARD} className="border shadow-sm" data-testid="card-recommendations">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4" style={{ color: P.amb }} />
              AI Recommendations
              <Badge variant="secondary" className="text-xs">{recommendations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => toggleRec(i)}
                  data-testid={`rec-item-${i}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <PriorityBadge priority={rec.priority ?? "low"} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{rec.title ?? "Recommendation"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{rec.category ?? "General"}</Badge>
                      {expandedRecs.has(i) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                  {expandedRecs.has(i) && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{rec.description ?? "Not available"}</p>
                      {rec.estimatedValue && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">Estimated Value:</span>
                          <span className="text-xs font-semibold" style={{ color: P.grn }}>{rec.estimatedValue}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {riskIndicators.length > 0 && (
          <Card style={V2_CARD} className="border shadow-sm" data-testid="card-risk-indicators">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: P.red }} />
                Risk Indicators
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {riskIndicators.map((risk, i) => (
                <div key={i} className="p-3 rounded-lg border" data-testid={`risk-item-${i}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityDot severity={risk.severity ?? "low"} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{risk.title ?? "Risk"}</span>
                    <PriorityBadge priority={risk.severity ?? "low"} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{risk.description ?? "Not available"}</p>
                  <div className="flex items-center gap-1 text-xs font-medium" style={{ color: P.blue }}>
                    <ArrowRight className="w-3 h-3" />
                    {risk.action ?? "Review recommended"}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {nextSteps.length > 0 && (
          <Card style={V2_CARD} className="border shadow-sm" data-testid="card-next-steps">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: P.grn }} />
                Prioritized Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-2">
                {nextSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-testid={`next-step-${i}`}>
                    <span
                      className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
                      style={{ background: P.blue }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{step ?? "Not available"}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
