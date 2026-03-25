import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SafeHtml } from "@/components/safe-html";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavTabs } from "@/components/design/nav-tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { generateAssessmentPDF } from "@/lib/assessment-pdf";
import { useState, useEffect } from "react";
import {
  Activity,
  FileText,
  Loader2,
  Trash2,
  Sparkles,
  FileDown,
  RefreshCw,
  Mail,
  Shield,
  TrendingUp,
  DollarSign,
  Heart,
  Building,
  GraduationCap,
  Landmark,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

interface DiagnosticsSectionProps {
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  userName: string;
}

const DOMAIN_ICONS: Record<string, any> = {
  cashflow: DollarSign,
  investment: TrendingUp,
  insurance: Shield,
  tax: Building,
  retirement: Landmark,
  estate: Heart,
  education: GraduationCap,
};

const DOMAIN_LABELS: Record<string, string> = {
  cashflow: "Cash Flow & Budgeting",
  investment: "Investment & Portfolio",
  insurance: "Insurance Coverage",
  tax: "Tax Optimization",
  retirement: "Retirement Planning",
  estate: "Estate & Legacy",
  education: "Education Funding",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; variant: "default" | "destructive" | "outline" | "secondary" }> = {
  on_track: { label: "On Track", color: "text-emerald-600", icon: CheckCircle, variant: "outline" },
  action_needed: { label: "Action Needed", color: "text-red-600", icon: AlertTriangle, variant: "destructive" },
  review: { label: "Needs Review", color: "text-amber-600", icon: Clock, variant: "secondary" },
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }} data-testid="text-overall-score">{score}</span>
        <span className="text-[10px] text-[#C7D0DD]">out of 100</span>
      </div>
    </div>
  );
}

function DomainCard({ domain, expanded, onToggle }: { domain: any; expanded: boolean; onToggle: () => void }) {
  const Icon = DOMAIN_ICONS[domain.domain] || Activity;
  const status = STATUS_CONFIG[domain.status] || STATUS_CONFIG.review;
  const StatusIcon = status.icon;
  const scoreColor = domain.score >= 70 ? "bg-emerald-500" : domain.score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card style={V2_CARD} className="overflow-hidden" data-testid={`card-domain-${domain.domain}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
        data-testid={`button-toggle-domain-${domain.domain}`}
      >
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{DOMAIN_LABELS[domain.domain] || domain.domain}</span>
            <Badge variant={status.variant} className="text-[13px] shrink-0">
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${scoreColor}`} style={{ width: `${domain.score}%` }} />
            </div>
            <span className="text-xs font-medium text-[#C7D0DD] w-8 text-right">{domain.score}</span>
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} />
      </div>
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 border-t space-y-4">
          <p className="text-sm text-muted-foreground" data-testid={`text-domain-summary-${domain.domain}`}>{domain.summary}</p>

          {domain.keyMetrics && Object.keys(domain.keyMetrics).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C7D0DD] mb-2">Key Metrics</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(domain.keyMetrics).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-md px-3 py-2">
                    <p className="text-[13px] text-[#C7D0DD]">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase())}</p>
                    <p className="text-sm font-medium" data-testid={`text-metric-${domain.domain}-${key}`}>{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {domain.recommendations && domain.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C7D0DD] mb-2">Recommendations</h4>
              <div className="space-y-2">
                {domain.recommendations.map((rec: any, idx: number) => {
                  const priorityColor = rec.priority === "high" ? "text-red-600 bg-red-50 dark:bg-red-950/30"
                    : rec.priority === "medium" ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                    : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
                  return (
                    <div key={idx} className="border rounded-md p-3" data-testid={`card-rec-${domain.domain}-${idx}`}>
                      <div className="flex items-start gap-2">
                        <Badge className={`text-[13px] shrink-0 ${priorityColor} border-0`}>
                          {rec.priority?.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{rec.action}</p>
                          {rec.rationale && <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>}
                          {rec.estimatedImpact && <p className="text-xs text-[#C7D0DD] mt-0.5">Impact: {rec.estimatedImpact}</p>}
                          {rec.estimatedCost && <p className="text-xs text-[#C7D0DD] mt-0.5">Est. Cost: {rec.estimatedCost}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function AssessmentTab({ clientId, clientFirstName, clientLastName }: { clientId: string; clientFirstName: string; clientLastName: string }) {
  const { toast } = useToast();
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const { data: assessment, isLoading: isLoadingAssessment, isError: isAssessmentError, error: assessmentError } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "assessment"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/assessment`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch assessment");
      return res.json();
    },
    retry: 1,
  });

  const { data: assessmentHistory } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "assessment", "history"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/assessment/history`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    retry: 1,
  });

  const generateMutation = useMutation({
    mutationFn: async (regenerate: boolean) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/assessment`, { regenerate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "assessment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "assessment", "history"] });
      toast({ title: "Assessment generated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Assessment Failed", description: err.message, variant: "destructive" });
    },
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/assessment-pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientFirstName}_${clientLastName}_Assessment.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded successfully" });
    } catch (err: any) {
      toast({ title: "PDF Download Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const emailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/assessment-pdf/email`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Email Ready", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Email Failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  if (isLoadingAssessment) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading assessment...</p>
      </div>
    );
  }

  if (isAssessmentError) {
    return (
      <Card style={V2_CARD}>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive opacity-60" />
            <h3 className="text-base font-semibold text-foreground mb-2">Unable to Load Assessment</h3>
            <p className="text-sm mb-4">Something went wrong while loading the assessment. Please try again.</p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "assessment"] })} data-testid="button-retry-assessment">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-6">
        <Card style={V2_CARD}>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Assessment Yet</h3>
              <p className="text-sm mb-6 max-w-md mx-auto">
                Generate a comprehensive AI-powered financial assessment across 7 planning domains including investment, retirement, tax, insurance, and more.
              </p>
              <Button
                onClick={() => generateMutation.mutate(false)}
                disabled={generateMutation.isPending}
                data-testid="button-generate-assessment"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Assessment...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Financial Assessment</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const actionNeeded = (assessment.domains || []).filter((d: any) => d.status === "action_needed").length;
  const onTrack = (assessment.domains || []).filter((d: any) => d.status === "on_track").length;
  const review = (assessment.domains || []).filter((d: any) => d.status === "review").length;

  return (
    <div className="space-y-6">
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
              <BarChart3 className="h-5 w-5" />
              Financial Assessment
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                data-testid="button-download-assessment-pdf"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
                Download PDF
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => emailMutation.mutate()}
                disabled={emailMutation.isPending}
                data-testid="button-email-assessment"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" /> Email
              </Button>
              <Button
                size="sm" variant="default"
                onClick={() => generateMutation.mutate(true)}
                disabled={generateMutation.isPending}
                data-testid="button-regenerate-assessment"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8 mb-6">
            <ScoreRing score={assessment.overallScore || 0} />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-muted-foreground" data-testid="text-assessment-summary">{assessment.summary}</p>
              <div className="flex gap-4 text-xs">
                {actionNeeded > 0 && (
                  <span className="flex items-center gap-1 text-red-600" data-testid="text-action-needed-count">
                    <AlertTriangle className="h-3.5 w-3.5" /> {actionNeeded} Action Needed
                  </span>
                )}
                {review > 0 && (
                  <span className="flex items-center gap-1 text-amber-600" data-testid="text-review-count">
                    <Clock className="h-3.5 w-3.5" /> {review} Needs Review
                  </span>
                )}
                {onTrack > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600" data-testid="text-on-track-count">
                    <CheckCircle className="h-3.5 w-3.5" /> {onTrack} On Track
                  </span>
                )}
              </div>
              {assessment.generatedAt && (
                <p className="text-[10px] text-muted-foreground">
                  Generated {new Date(assessment.generatedAt).toLocaleDateString()} at {new Date(assessment.generatedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {assessment.criticalActions && assessment.criticalActions.length > 0 && (
            <div className="mb-6 border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" /> Priority Action Items
              </h3>
              <div className="space-y-2">
                {assessment.criticalActions.map((action: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2" data-testid={`card-critical-action-${idx}`}>
                    <span className="text-red-500 mt-0.5 text-xs font-bold">{idx + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">{action.action}</p>
                      {action.rationale && <p className="text-xs text-muted-foreground">{action.rationale}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(assessment.domains || []).map((domain: any) => (
          <DomainCard
            key={domain.domain}
            domain={domain}
            expanded={expandedDomains.has(domain.domain)}
            onToggle={() => toggleDomain(domain.domain)}
          />
        ))}
      </div>

      {assessmentHistory && assessmentHistory.length > 1 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="" style={V2_TITLE}>Assessment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assessmentHistory.map((entry: any, idx: number) => (
                <div
                  key={entry.id || idx}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`row-assessment-history-${idx}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Score: {entry.overallScore}/100</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.generatedAt).toLocaleDateString()} at {new Date(entry.generatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="">
                    {entry.overallScore >= 70 ? "Good" : entry.overallScore >= 40 ? "Fair" : "Needs Work"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function DiagnosticsSection({ clientId, clientFirstName, clientLastName, userName }: DiagnosticsSectionProps) {
  const { toast } = useToast();
  const [diagnosticHtml, setDiagnosticHtml] = useState<string>("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");

  const { data: diagnosticConfigs } = useQuery<any[]>({
    queryKey: ["/api/diagnostics/configs"],
  });

  const diagnosticMutation = useMutation({
    mutationFn: (configId?: string) => apiRequest("POST", "/api/diagnostics/run", { clientId, configId: configId || undefined }),
    onSuccess: async (res) => {
      const json = await res.json();
      setDiagnosticHtml(json.renderedHtml);
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics/results", clientId] });
    },
    onError: (err: any) => {
      toast({ title: "Assessment Failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: diagnosticHistory } = useQuery<any[]>({
    queryKey: ["/api/diagnostics/results", clientId],
  });

  useEffect(() => {
    if (!diagnosticHtml && diagnosticHistory && diagnosticHistory.length > 0) {
      const latest = diagnosticHistory[0];
      if (latest?.renderedHtml) setDiagnosticHtml(latest.renderedHtml);
    }
  }, [diagnosticHistory]);

  const deleteDiagnosticMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/diagnostics/results/${id}`),
    onSuccess: () => {
      toast({ title: "Assessment report deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics/results", clientId] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete report", description: err.message, variant: "destructive" });
    },
  });

  const clientName = `${clientFirstName} ${clientLastName}`;

  const [diagTab, setDiagTab] = useState("assessment");

  return (
    <div className="space-y-6">
      <NavTabs
        tabs={[
          { id: "assessment", label: "Financial Assessment" },
          { id: "diagnostics", label: "AI Diagnostics" },
        ]}
        active={diagTab}
        onChange={setDiagTab}

      />

      {diagTab === "assessment" && (
        <div role="tabpanel" id="tabpanel-assessment">
          <AssessmentTab clientId={clientId} clientFirstName={clientFirstName} clientLastName={clientLastName} />
        </div>
      )}

      {diagTab === "diagnostics" && (
        <div className="space-y-6">
          <Card style={V2_CARD}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
                  <Activity className="h-5 w-5" />
                  AI Financial Assessment
                </CardTitle>
                <div className="flex items-center gap-2">
                  {diagnosticHtml && (
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="button-export-assessment-pdf"
                      onClick={() => generateAssessmentPDF(
                        diagnosticHtml,
                        clientName,
                        userName || "OneDigital Wealth Advisor"
                      )}
                    >
                      <FileDown className="w-3.5 h-3.5 mr-1.5" /> Export PDF
                    </Button>
                  )}
                  {diagnosticConfigs && diagnosticConfigs.length > 0 && (
                    <Select value={selectedConfigId} onValueChange={setSelectedConfigId} data-testid="select-diagnostic-config">
                      <SelectTrigger className="h-8 w-[180px] text-xs" data-testid="select-diagnostic-config-trigger">
                        <SelectValue placeholder="Default config" />
                      </SelectTrigger>
                      <SelectContent>
                        {diagnosticConfigs.map((cfg: any) => (
                          <SelectItem key={cfg.id} value={cfg.id} data-testid={`select-config-${cfg.id}`}>
                            {cfg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => diagnosticMutation.mutate(selectedConfigId || undefined)}
                    disabled={diagnosticMutation.isPending}
                    data-testid="button-run-diagnostics"
                  >
                    {diagnosticMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Run Assessment</>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive AI-powered analysis of {clientFirstName} {clientLastName}'s financial position.
              </p>
            </CardHeader>
            <CardContent>
              {diagnosticHtml ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2" data-testid="text-ai-generated-note">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>This report was generated by AI and should be reviewed by an advisor before sharing with clients.</span>
                  </div>
                  <SafeHtml
                    html={diagnosticHtml}
                    className="diagnostic-report border rounded-lg p-4"
                    data-testid="diagnostic-report-content"
                  />
                </div>
              ) : diagnosticMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Generating AI financial assessment...</p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Click "Run Assessment" to generate an AI-powered financial analysis.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {diagnosticHistory && diagnosticHistory.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="" style={V2_TITLE}>Report History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnosticHistory.map((entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setDiagnosticHtml(entry.renderedHtml)}
                      data-testid={`row-diagnostic-history-${idx}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{entry.configName || "AI Financial Assessment"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {entry.configName || "Default"}
                        </Badge>
                        {entry.renderedHtml && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateAssessmentPDF(
                                entry.renderedHtml,
                                clientName,
                                userName || "OneDigital Wealth Advisor"
                              );
                            }}
                            data-testid={`button-export-assessment-${idx}`}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this assessment report?")) deleteDiagnosticMutation.mutate(entry.id);
                          }}
                          data-testid={`button-delete-diagnostic-${idx}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
