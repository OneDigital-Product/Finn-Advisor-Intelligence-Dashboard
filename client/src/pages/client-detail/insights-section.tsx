import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Lightbulb,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingDown,
  Shield,
  Users,
  DollarSign,
  PieChart,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

const INSIGHT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  underinsured: { label: "Insurance Gap", icon: Shield, color: "text-red-600 dark:text-red-400" },
  tax_harvesting: { label: "Tax Harvesting", icon: DollarSign, color: "text-green-600 dark:text-green-400" },
  estate_gap: { label: "Estate Planning", icon: Shield, color: "text-purple-600 dark:text-purple-400" },
  engagement_risk: { label: "Engagement Risk", icon: Users, color: "text-amber-600 dark:text-amber-400" },
  aum_decline: { label: "Performance", icon: TrendingDown, color: "text-blue-600 dark:text-blue-400" },
  concentration_risk: { label: "Concentration", icon: PieChart, color: "text-orange-600 dark:text-orange-400" },
};

function getSeverityBadge(severity: string) {
  const variants: Record<string, "destructive" | "default" | "secondary"> = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };
  return variants[severity] || "secondary";
}

export function InsightsSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ insights: any[] }>({
    queryKey: ["/api/clients", clientId, "insights"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/insights`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/insights/generate`);
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "insights"] });
      toast({ title: "Insights generated", description: `${result.totalGenerated} insights found` });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/insights/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "insights"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/insights/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "insights"] });
      toast({ title: "Insight dismissed" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const insights = data?.insights || [];
  const highCount = insights.filter((i: any) => i.severity === "high").length;
  const mediumCount = insights.filter((i: any) => i.severity === "medium").length;

  return (
    <div className="space-y-4" data-testid="section-client-insights">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Proactive Insights
          </h3>
          {highCount > 0 && (
            <Badge variant="destructive" className="text-xs" data-testid="badge-high-insights">
              {highCount} high priority
            </Badge>
          )}
          {mediumCount > 0 && (
            <Badge variant="default" className="text-xs" data-testid="badge-medium-insights">
              {mediumCount} medium
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-insights"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Scan Client
        </Button>
      </div>

      {insights.length === 0 ? (
        <Card style={V2_CARD}>
          <CardContent className="py-8 text-center">
            <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No insights found for this client.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Scan Client" to analyze for opportunities.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map((insight: any) => {
            const config = INSIGHT_TYPE_CONFIG[insight.insightType] || {
              label: insight.insightType,
              icon: AlertTriangle,
              color: "text-muted-foreground",
            };
            const Icon = config.icon;

            return (
              <Card
                key={insight.id}
                style={V2_CARD}
                className={`relative overflow-hidden ${
                  insight.severity === "high"
                    ? "border-red-200 dark:border-red-900/40"
                    : insight.severity === "medium"
                    ? "border-amber-200 dark:border-amber-900/40"
                    : ""
                }`}
                data-testid={`insight-card-${insight.id}`}
              >
                <div
                  className={`absolute left-0 top-0 w-1 h-full ${
                    insight.severity === "high"
                      ? "bg-red-500"
                      : insight.severity === "medium"
                      ? "bg-amber-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                <CardContent className="py-4 pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Icon className={`w-4 h-4 shrink-0 ${config.color}`} />
                        <span className="text-sm font-semibold">{insight.title}</span>
                        <Badge variant={getSeverityBadge(insight.severity)} className="text-[10px]">
                          {insight.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {config.label}
                        </Badge>
                        {insight.confidence != null && (
                          <span className="text-[10px] text-muted-foreground">{insight.confidence}% confidence</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{insight.description ?? "Not available"}</p>
                      {insight.opportunity != null && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed mb-2">
                          <strong>Opportunity:</strong> {insight.opportunity}
                        </p>
                      )}
                      {insight.recommendedAction != null && (
                        <p className="text-xs leading-relaxed">
                          <strong>Action:</strong> {insight.recommendedAction}
                        </p>
                      )}
                      {insight.estimatedValue != null && parseFloat(insight.estimatedValue) > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Estimated value: ${parseFloat(insight.estimatedValue).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!insight.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 px-2"
                          onClick={() => markReadMutation.mutate(insight.id)}
                          data-testid={`button-read-insight-${insight.id}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Read
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2 text-muted-foreground"
                        onClick={() => dismissMutation.mutate(insight.id)}
                        data-testid={`button-dismiss-insight-${insight.id}`}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
