import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Building2,
  TrendingUp,
  FileText,
  Trash2,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  Circle,
  Briefcase,
  Shield,
  Target,
  ArrowRight,
  Brain,
  Scale,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { EmptyState } from "@/components/empty-state";
import { P } from "@/styles/tokens";

interface BusinessSuccessionSectionProps {
  clientId: string;
  clientName: string;
  totalAum: number;
  advisorId: string;
}

import { formatCurrency as fmtCurrency } from "@/lib/format";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";
const fmtFullCurrency = (v: number) => fmtCurrency(v, { abbreviated: false });

export function BusinessSuccessionSection({ clientId, clientName, totalAum, advisorId }: BusinessSuccessionSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "valuations" | "flp" | "buysell" | "timeline">("overview");
  const [showCreateValuation, setShowCreateValuation] = useState(false);
  const [showCreateFlp, setShowCreateFlp] = useState(false);
  const [showCreateBuySell, setShowCreateBuySell] = useState(false);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "business-succession"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/business-succession`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000,
  });

  const createValuationMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/business-succession/valuations", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      setShowCreateValuation(false);
      toast({ title: "Valuation created" });
    },
    onError: () => toast({ title: "Failed to create valuation", variant: "destructive" }),
  });

  const deleteValuationMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/business-succession/valuations/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      toast({ title: "Valuation deleted" });
    },
  });

  const createFlpMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/business-succession/flp-structures", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      setShowCreateFlp(false);
      toast({ title: "FLP structure created" });
    },
    onError: () => toast({ title: "Failed to create FLP", variant: "destructive" }),
  });

  const deleteFlpMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/business-succession/flp-structures/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      toast({ title: "FLP deleted" });
    },
  });

  const createBuySellMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/business-succession/buy-sell-agreements", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      setShowCreateBuySell(false);
      toast({ title: "Agreement created" });
    },
    onError: () => toast({ title: "Failed to create agreement", variant: "destructive" }),
  });

  const deleteBuySellMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/business-succession/buy-sell-agreements/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      toast({ title: "Agreement deleted" });
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/business-succession/exit-milestones", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      setShowCreateMilestone(false);
      toast({ title: "Milestone created" });
    },
    onError: () => toast({ title: "Failed to create milestone", variant: "destructive" }),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/business-succession/exit-milestones/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      toast({ title: "Milestone updated" });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/business-succession/exit-milestones/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "business-succession"] });
      toast({ title: "Milestone deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { valuations = [], flpStructures = [], buySellAgreements = [], exitMilestones = [], summary = {} } = data || {};

  const subtabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "valuations" as const, label: "Valuations", count: valuations.length },
    { id: "flp" as const, label: "FLP", count: flpStructures.length },
    { id: "buysell" as const, label: "Buy-Sell", count: buySellAgreements.length },
    { id: "timeline" as const, label: "Exit Timeline", count: exitMilestones.length },
  ];

  return (
    <div className="space-y-6" data-testid="business-succession-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-business-succession-title">Business Succession</h2>
          <p className="text-sm text-muted-foreground">Business valuation, FLP structuring, and exit planning</p>
        </div>
        <CassidyAnalysisButton
          taskType="analysis"
          clientId={clientId}
          context={{
            section: "business_succession",
            clientName,
            totalAum,
            totalBusinessValue: summary.totalBusinessValue || 0,
            valuationCount: summary.valuationCount || 0,
            flpCount: summary.flpCount || 0,
            agreementCount: summary.agreementCount || 0,
            agreementsNeedingReview: summary.agreementsNeedingReview || 0,
            milestoneProgress: summary.milestoneProgress || 0,
            completedMilestones: summary.completedMilestones || 0,
            totalMilestones: summary.totalMilestones || 0,
            valuations: valuations.slice(0, 3).map((v: any) => ({
              businessName: v.businessName,
              industry: v.industry,
              revenue: v.revenue,
              ebitda: v.ebitda,
              recommendedValue: v.calculations?.recommendedValue || 0,
            })),
            buySellAgreements: buySellAgreements.slice(0, 3).map((a: any) => ({
              type: a.agreementType,
              fundingMechanism: a.fundingMechanism,
              totalCoverage: a.totalCoverage,
            })),
          }}
          label="AI Scenario Analysis"
          icon={<Brain className="h-4 w-4" />}
          size="sm"
        />
      </div>

      <div className="flex gap-1 border-b pb-px">
        {subtabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid={`tab-biz-${tab.id}`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-[#C7D0DD]">Total Business Value</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-total-biz-value">{fmtCurrency(summary.totalBusinessValue || 0)}</div>
                <div className="text-xs text-[#C7D0DD] mt-0.5">{summary.valuationCount || 0} valuation{(summary.valuationCount || 0) !== 1 ? "s" : ""}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-[#C7D0DD]">FLP Structures</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-flp-count">{summary.flpCount || 0}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-[#C7D0DD]">Buy-Sell Agreements</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-agreement-count">{summary.agreementCount || 0}</div>
                {(summary.agreementsNeedingReview || 0) > 0 && (
                  <div className="text-xs text-amber-600 mt-0.5">{summary.agreementsNeedingReview} need review</div>
                )}
              </CardContent>
            </Card>
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-[#C7D0DD]">Exit Progress</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-exit-progress">{summary.milestoneProgress || 0}%</div>
                <Progress value={summary.milestoneProgress || 0} className="mt-1.5 h-1.5" />
                <div className="text-xs text-[#C7D0DD] mt-0.5">{summary.completedMilestones || 0}/{summary.totalMilestones || 0} milestones</div>
              </CardContent>
            </Card>
          </div>

          {valuations.length === 0 && flpStructures.length === 0 && buySellAgreements.length === 0 && (
            <Card style={V2_CARD}>
              <CardContent className="py-8 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="font-medium mb-1">No Business Succession Data</h3>
                <p className="text-sm text-muted-foreground mb-4">Add business valuations, FLP structures, or buy-sell agreements to get started.</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={() => { setActiveTab("valuations"); setShowCreateValuation(true); }} data-testid="button-start-valuation">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Valuation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "valuations" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateValuation(true)} data-testid="button-add-valuation">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Valuation
            </Button>
          </div>
          {valuations.length === 0 ? (
            <Card style={V2_CARD}><CardContent><EmptyState icon={Building2} title="No business valuations" description="Add a business valuation with revenue, EBITDA, and industry to model succession scenarios and estimate fair market value." actionLabel="Add Valuation" actionIcon={Plus} onAction={() => setShowCreateValuation(true)} timeEstimate="Takes about 5 minutes" /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {valuations.map((v: any) => (
                <Card key={v.id} style={V2_CARD} data-testid={`card-valuation-${v.id}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-sm">{v.businessName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {v.industry && <Badge variant="secondary" className="text-[10px]">{v.industry}</Badge>}
                          {v.entityType && <span className="text-xs text-[#C7D0DD]">{v.entityType}</span>}
                          {v.calculations?.confidence && (
                            <Badge variant={v.calculations.confidence === "high" ? "default" : v.calculations.confidence === "medium" ? "secondary" : "outline"} className="text-[10px]">
                              {v.calculations.confidence} confidence
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteValuationMutation.mutate(v.id)} data-testid={`button-delete-valuation-${v.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">Revenue</div>
                        <div className="text-sm font-medium" data-testid={`text-revenue-${v.id}`}>{fmtFullCurrency(parseFloat(v.revenue || "0"))}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">EBITDA</div>
                        <div className="text-sm font-medium" data-testid={`text-ebitda-${v.id}`}>{fmtFullCurrency(parseFloat(v.ebitda || "0"))}</div>
                      </div>
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <div className="text-[10px] text-[#C7D0DD]">Multiple-Based</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(v.calculations?.multipleBasedValue || 0)}</div>
                      </div>
                      <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                        <div className="text-[10px] text-[#C7D0DD]">DCF Value</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(v.calculations?.dcfBasedValue || 0)}</div>
                      </div>
                    </div>

                    {v.calculations?.comparableValue > 0 && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30">
                          <div className="text-[10px] text-[#C7D0DD]">Comparable Value</div>
                          <div className="text-sm font-medium" data-testid={`text-comparable-${v.id}`}>{fmtFullCurrency(v.calculations.comparableValue)}</div>
                        </div>
                        {v.industryMultiples && (
                          <>
                            <div className="p-2 rounded bg-muted/40">
                              <div className="text-[10px] text-[#C7D0DD]">EV/EBITDA Multiple</div>
                              <div className="text-sm font-medium">{v.industryMultiples.evToEbitda}x</div>
                            </div>
                            <div className="p-2 rounded bg-muted/40">
                              <div className="text-[10px] text-[#C7D0DD]">EV/Revenue Multiple</div>
                              <div className="text-sm font-medium">{v.industryMultiples.evToRevenue}x</div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {v.calculations?.recommendedValue > 0 && (
                      <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-[#C7D0DD]">Recommended Enterprise Value</div>
                            <div className="text-lg font-bold text-primary" data-testid={`text-recommended-${v.id}`}>{fmtFullCurrency(v.calculations.recommendedValue)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-[#C7D0DD]">Methodology</div>
                            <div className="text-xs font-medium">{v.calculations.recommendedMethodology}</div>
                          </div>
                        </div>
                        {v.calculations.reasoning && (
                          <div className="text-[10px] text-[#C7D0DD] mt-1">{v.calculations.reasoning}</div>
                        )}
                      </div>
                    )}

                    {v.dcfBreakdown && (
                      <div className="mt-3 border rounded p-2">
                        <div className="text-[10px] font-medium text-[#C7D0DD] mb-2 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> DCF Breakdown ({v.dcfBreakdown.assumptions?.projectionYears || 5}-Year Projection)
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <span className="text-[#C7D0DD]">Terminal Value:</span>
                            <span className="ml-1 font-medium">{fmtCurrency(v.dcfBreakdown.terminalValue)}</span>
                          </div>
                          <div>
                            <span className="text-[#C7D0DD]">Terminal PV:</span>
                            <span className="ml-1 font-medium">{fmtCurrency(v.dcfBreakdown.terminalValuePV)}</span>
                          </div>
                          <div>
                            <span className="text-[#C7D0DD]">CF PV Total:</span>
                            <span className="ml-1 font-medium">{fmtCurrency(v.dcfBreakdown.totalPresentValue)}</span>
                          </div>
                        </div>
                        {v.dcfBreakdown.projectedCashFlows?.length > 0 && (
                          <div className="mt-2 flex gap-1">
                            {v.dcfBreakdown.projectedCashFlows.map((cf: any) => (
                              <div key={cf.year} className="flex-1 text-center p-1 rounded bg-muted/30">
                                <div className="text-[10px] text-[#C7D0DD]">Y{cf.year}</div>
                                <div className="text-[10px] font-medium">{fmtCurrency(cf.cashFlow)}</div>
                                <div className="text-[10px] text-[#C7D0DD]">PV: {fmtCurrency(cf.presentValue)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {v.assetBasedBreakdown && (
                      <div className="mt-3 border rounded p-2">
                        <div className="text-[10px] font-medium text-[#C7D0DD] mb-2 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> Asset-Based Breakdown
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                          <div>
                            <span className="text-[#C7D0DD]">Tangible:</span>
                            <span className="ml-1 font-medium">{fmtCurrency(v.assetBasedBreakdown.tangibleAssets)}</span>
                          </div>
                          <div>
                            <span className="text-[#C7D0DD]">Intangible:</span>
                            <span className="ml-1 font-medium">{fmtCurrency(v.assetBasedBreakdown.intangibleAssets)}</span>
                          </div>
                          <div>
                            <span className="text-[#C7D0DD]">Liabilities:</span>
                            <span className="ml-1 font-medium">{fmtCurrency(v.assetBasedBreakdown.totalLiabilities)}</span>
                          </div>
                          <div>
                            <span className="text-[#C7D0DD]">Net Asset Value:</span>
                            <span className="ml-1 font-medium text-primary" data-testid={`text-nav-${v.id}`}>{fmtCurrency(v.assetBasedBreakdown.netAssetValue)}</span>
                          </div>
                        </div>
                        {v.assetBasedBreakdown.goodwill > 0 && (
                          <div className="text-[10px] mt-1">
                            <span className="text-[#C7D0DD]">Goodwill:</span>
                            <span className="ml-1 font-medium">{fmtCurrency(v.assetBasedBreakdown.goodwill)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {v.estimatedValue && (
                      <div className="mt-2 p-2 rounded bg-muted/20 border border-muted">
                        <div className="text-[10px] text-[#C7D0DD]">Manual Estimated Value</div>
                        <div className="text-sm font-medium" data-testid={`text-est-value-${v.id}`}>{fmtFullCurrency(parseFloat(v.estimatedValue))}</div>
                      </div>
                    )}
                    {v.valuationDate && <div className="text-xs text-[#C7D0DD] mt-2">Valued: {v.valuationDate}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "flp" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateFlp(true)} data-testid="button-add-flp">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add FLP
            </Button>
          </div>
          {flpStructures.length === 0 ? (
            <Card style={V2_CARD}><CardContent><EmptyState icon={Users} title="No FLP structures" description="Family Limited Partnerships transfer business interests to family members at a discounted value, reducing the taxable estate." actionLabel="Add FLP" actionIcon={Plus} onAction={() => setShowCreateFlp(true)} /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {flpStructures.map((f: any) => (
                <Card key={f.id} style={V2_CARD} data-testid={`card-flp-${f.id}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-sm">{f.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={f.status === "active" ? "default" : "secondary"} className="text-[10px]">{f.status}</Badge>
                          {f.irsDefensible !== undefined && (
                            <Badge variant={f.irsDefensible ? "default" : "destructive"} className="text-[10px]">
                              {f.irsDefensible ? "IRS Defensible" : "Outside IRS Range"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteFlpMutation.mutate(f.id)} data-testid={`button-delete-flp-${f.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">Total Value</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(parseFloat(f.totalValue || "0"))}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">GP / LP Split</div>
                        <div className="text-sm font-medium">{parseFloat(f.generalPartnerPct || "1")}% / {parseFloat(f.limitedPartnerPct || "99")}%</div>
                      </div>
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30">
                        <div className="text-[10px] text-[#C7D0DD]">Combined Discount</div>
                        <div className="text-sm font-medium" data-testid={`text-combined-discount-${f.id}`}>{((f.calculations?.combinedDiscount || 0) * 100).toFixed(1)}%</div>
                      </div>
                    </div>

                    {f.discountRanges && (
                      <div className="mt-3 border rounded p-2">
                        <div className="text-[10px] font-medium text-[#C7D0DD] mb-2 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> IRS-Defensible Discount Ranges
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-1.5 rounded bg-muted/30">
                            <div className="text-[10px] text-[#C7D0DD]">Control Discount</div>
                            <div className="text-[10px] font-medium">
                              {(f.discountRanges.controlDiscount.low * 100).toFixed(0)}% - {(f.discountRanges.controlDiscount.high * 100).toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-[#C7D0DD]">Mid: {(f.discountRanges.controlDiscount.mid * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-center p-1.5 rounded bg-muted/30">
                            <div className="text-[10px] text-[#C7D0DD]">Marketability Discount</div>
                            <div className="text-[10px] font-medium">
                              {(f.discountRanges.marketabilityDiscount.low * 100).toFixed(0)}% - {(f.discountRanges.marketabilityDiscount.high * 100).toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-[#C7D0DD]">Mid: {(f.discountRanges.marketabilityDiscount.mid * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-center p-1.5 rounded bg-muted/30">
                            <div className="text-[10px] text-[#C7D0DD]">Combined Range</div>
                            <div className="text-[10px] font-medium">
                              {(f.discountRanges.combinedDiscount.low * 100).toFixed(0)}% - {(f.discountRanges.combinedDiscount.high * 100).toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-[#C7D0DD]">Mid: {(f.discountRanges.combinedDiscount.mid * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-1.5 rounded bg-green-50 dark:bg-green-950/30 text-center">
                            <div className="text-[#C7D0DD]">Discounted Value Range</div>
                            <div className="font-medium">{fmtCurrency(f.discountRanges.discountedValue.low)} - {fmtCurrency(f.discountRanges.discountedValue.high)}</div>
                          </div>
                          <div className="p-1.5 rounded bg-green-50 dark:bg-green-950/30 text-center">
                            <div className="text-[#C7D0DD]">Midpoint</div>
                            <div className="font-medium">{fmtCurrency(f.discountRanges.discountedValue.mid)}</div>
                          </div>
                        </div>
                        {f.discountNotes?.map((note: string, i: number) => (
                          <div key={i} className="text-[10px] text-[#C7D0DD] mt-1.5 flex items-start gap-1">
                            <span className="shrink-0">{f.irsDefensible ? "\u2713" : "\u26A0"}</span> {note}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">LP Interest Value</div>
                        <div className="text-sm font-medium">
                          {fmtFullCurrency(parseFloat(f.totalValue || "0") * parseFloat(f.limitedPartnerPct || "99") / 100)}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                        <div className="text-[10px] text-[#C7D0DD]">Discounted Transfer Value</div>
                        <div className="text-lg font-bold text-green-700 dark:text-green-400" data-testid={`text-flp-discounted-${f.id}`}>
                          {fmtFullCurrency(f.calculations?.discountedValue || 0)}
                        </div>
                        <div className="text-[10px] text-[#C7D0DD]">
                          Saves {fmtFullCurrency((parseFloat(f.totalValue || "0") * parseFloat(f.limitedPartnerPct || "99") / 100) - (f.calculations?.discountedValue || 0))} in transfer tax exposure
                        </div>
                      </div>
                    </div>

                    {f.taxImpact && (
                      <div className="mt-3 border rounded p-2">
                        <div className="text-[10px] font-medium text-[#C7D0DD] mb-2 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Tax Impact Analysis
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="p-1.5 rounded bg-muted/30">
                            <div className="text-[10px] text-[#C7D0DD]">Gift Tax Exposure</div>
                            <div className="text-[10px] font-medium" data-testid={`text-gift-tax-${f.id}`}>{fmtFullCurrency(f.taxImpact.giftTax.estimatedTax)}</div>
                          </div>
                          <div className="p-1.5 rounded bg-muted/30">
                            <div className="text-[10px] text-[#C7D0DD]">Estate Tax Savings</div>
                            <div className="text-[10px] font-medium text-green-600" data-testid={`text-estate-savings-${f.id}`}>{fmtFullCurrency(f.taxImpact.estateTaxReduction.estimatedEstateTaxSavings)}</div>
                          </div>
                          <div className="p-1.5 rounded bg-muted/30">
                            <div className="text-[10px] text-[#C7D0DD]">Discount Savings</div>
                            <div className="text-[10px] font-medium text-green-600">{fmtFullCurrency(f.taxImpact.summary.discountSavings)}</div>
                          </div>
                          <div className="p-1.5 rounded bg-muted/30">
                            <div className="text-[10px] text-[#C7D0DD]">Transfer Efficiency</div>
                            <div className="text-[10px] font-medium">{(f.taxImpact.summary.netTransferEfficiency * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-[#C7D0DD]">Lifetime Exemption Remaining: </span>
                            <span className="font-medium">{fmtCurrency(f.taxImpact.giftTax.lifetimeExemptionRemaining)}</span>
                          </div>
                          <div>
                            <span className="text-[#C7D0DD]">Effective Transfer Rate: </span>
                            <span className="font-medium">{(f.taxImpact.estateTaxReduction.effectiveTransferRate * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "buysell" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateBuySell(true)} data-testid="button-add-buysell">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Agreement
            </Button>
          </div>
          {buySellAgreements.length === 0 ? (
            <Card style={V2_CARD}><CardContent><EmptyState icon={Scale} title="No buy-sell agreements" description="Buy-sell agreements define how ownership transfers upon death, disability, or departure — protecting both the business and the family." actionLabel="Add Agreement" actionIcon={Plus} onAction={() => setShowCreateBuySell(true)} /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {buySellAgreements.map((a: any) => {
                const needsReview = a.reviewDate && new Date(a.reviewDate) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                return (
                  <Card key={a.id} style={V2_CARD} className={needsReview ? "border-l-4 border-l-amber-500" : ""} data-testid={`card-buysell-${a.id}`}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{a.agreementType}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{a.fundingMethod}</Badge>
                            {needsReview && <Badge variant="destructive" className="text-[10px]">Review Due</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteBuySellMutation.mutate(a.id)} data-testid={`button-delete-buysell-${a.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {a.coverageAmount && (
                          <div className="p-2 rounded bg-muted/40">
                            <div className="text-[10px] text-[#C7D0DD]">Coverage Amount</div>
                            <div className="text-sm font-medium">{fmtFullCurrency(parseFloat(a.coverageAmount))}</div>
                          </div>
                        )}
                        {a.effectiveDate && (
                          <div className="p-2 rounded bg-muted/40">
                            <div className="text-[10px] text-[#C7D0DD]">Effective Date</div>
                            <div className="text-sm font-medium">{a.effectiveDate}</div>
                          </div>
                        )}
                        {a.reviewDate && (
                          <div className={`p-2 rounded ${needsReview ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/40"}`}>
                            <div className="text-[10px] text-[#C7D0DD]">Next Review</div>
                            <div className="text-sm font-medium">{a.reviewDate}</div>
                          </div>
                        )}
                      </div>
                      {a.parties && (a.parties as any[]).length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] text-[#C7D0DD] mb-1">Parties</div>
                          <div className="flex flex-wrap gap-1">
                            {(a.parties as any[]).map((p: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{typeof p === "string" ? p : p.name || p}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateMilestone(true)} data-testid="button-add-milestone">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Milestone
            </Button>
          </div>
          {exitMilestones.length === 0 ? (
            <Card style={V2_CARD}><CardContent><EmptyState icon={Target} title="No exit milestones" description="Track key milestones on the path to a business exit — from financial readiness to legal preparation." actionLabel="Add Milestone" actionIcon={Plus} onAction={() => setShowCreateMilestone(true)} /></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {exitMilestones.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card" data-testid={`milestone-${m.id}`}>
                  <button
                    className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-colors ${
                      m.status === "completed"
                        ? "bg-green-600 text-white"
                        : "border-2 border-muted-foreground/30 hover:border-primary"
                    }`}
                    onClick={() => {
                      const newStatus = m.status === "completed" ? "pending" : "completed";
                      updateMilestoneMutation.mutate({
                        id: m.id,
                        data: {
                          status: newStatus,
                          completedDate: newStatus === "completed" ? new Date().toISOString().split("T")[0] : null,
                        },
                      });
                    }}
                    data-testid={`button-toggle-milestone-${m.id}`}
                  >
                    {m.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                      <Badge variant="outline" className="text-[10px]">{m.category}</Badge>
                    </div>
                    {m.description && <p className="text-xs text-[#C7D0DD] mt-0.5">{m.description}</p>}
                    {m.targetDate && <div className="text-xs text-[#C7D0DD] mt-1"><Clock className="w-3 h-3 inline mr-1" />Target: {m.targetDate}</div>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteMilestoneMutation.mutate(m.id)} data-testid={`button-delete-milestone-${m.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CreateValuationDialog
        open={showCreateValuation}
        onClose={() => setShowCreateValuation(false)}
        onSubmit={(d: any) => createValuationMutation.mutate({ ...d, clientId, advisorId })}
        isPending={createValuationMutation.isPending}
      />
      <CreateFlpDialog
        open={showCreateFlp}
        onClose={() => setShowCreateFlp(false)}
        onSubmit={(d: any) => createFlpMutation.mutate({ ...d, clientId, advisorId })}
        isPending={createFlpMutation.isPending}
      />
      <CreateBuySellDialog
        open={showCreateBuySell}
        onClose={() => setShowCreateBuySell(false)}
        onSubmit={(d: any) => createBuySellMutation.mutate({ ...d, clientId, advisorId })}
        isPending={createBuySellMutation.isPending}
      />
      <CreateMilestoneDialog
        open={showCreateMilestone}
        onClose={() => setShowCreateMilestone(false)}
        onSubmit={(d: any) => createMilestoneMutation.mutate({ ...d, clientId, advisorId })}
        isPending={createMilestoneMutation.isPending}
      />
    </div>
  );
}

function CreateValuationDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const defaultForm = { businessName: "", industry: "", entityType: "", revenue: "", ebitda: "", netIncome: "", valuationMethod: "multiple", multiple: "", discountRate: "0.10", growthRate: "0.05", estimatedValue: "", valuationDate: "", notes: "", tangibleAssets: "", intangibleAssets: "", totalLiabilities: "", goodwill: "" };
  const [form, setForm] = useState(defaultForm);
  const handleSubmit = () => { if (!form.businessName) return; onSubmit(form); setForm(defaultForm); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Business Valuation</DialogTitle>
          <DialogDescription>Enter business details. The system will compute DCF, comparable, and asset-based valuations automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="biz-name" className="text-xs">Business Name *</Label><Input id="biz-name" value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))} data-testid="input-biz-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="biz-industry" className="text-xs">Industry</Label><Input id="biz-industry" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. Technology, Healthcare" data-testid="input-biz-industry" /></div>
            <div><Label htmlFor="entity-type" className="text-xs">Entity Type</Label>
              <Select value={form.entityType} onValueChange={v => setForm(p => ({ ...p, entityType: v }))}>
                <SelectTrigger id="entity-type" data-testid="select-entity-type"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLC">LLC</SelectItem><SelectItem value="S-Corp">S-Corp</SelectItem><SelectItem value="C-Corp">C-Corp</SelectItem><SelectItem value="Partnership">Partnership</SelectItem><SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label htmlFor="biz-revenue" className="text-xs">Revenue</Label><Input id="biz-revenue" value={form.revenue} onChange={e => setForm(p => ({ ...p, revenue: e.target.value }))} data-testid="input-revenue" /></div>
            <div><Label htmlFor="biz-ebitda" className="text-xs">EBITDA</Label><Input id="biz-ebitda" value={form.ebitda} onChange={e => setForm(p => ({ ...p, ebitda: e.target.value }))} data-testid="input-ebitda" /></div>
            <div><Label htmlFor="biz-net-income" className="text-xs">Net Income</Label><Input id="biz-net-income" value={form.netIncome} onChange={e => setForm(p => ({ ...p, netIncome: e.target.value }))} data-testid="input-net-income" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="val-method" className="text-xs">Method</Label>
              <Select value={form.valuationMethod} onValueChange={v => setForm(p => ({ ...p, valuationMethod: v }))}>
                <SelectTrigger id="val-method" data-testid="select-val-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple">Multiple</SelectItem>
                  <SelectItem value="dcf">DCF</SelectItem>
                  <SelectItem value="comparable">Comparable</SelectItem>
                  <SelectItem value="asset-based">Asset-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="biz-multiple" className="text-xs">Multiple</Label><Input id="biz-multiple" value={form.multiple} onChange={e => setForm(p => ({ ...p, multiple: e.target.value }))} data-testid="input-multiple" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="biz-discount-rate" className="text-xs">Discount Rate</Label><Input id="biz-discount-rate" value={form.discountRate} onChange={e => setForm(p => ({ ...p, discountRate: e.target.value }))} placeholder="0.10" data-testid="input-discount-rate" /></div>
            <div><Label htmlFor="biz-growth-rate" className="text-xs">Growth Rate</Label><Input id="biz-growth-rate" value={form.growthRate} onChange={e => setForm(p => ({ ...p, growthRate: e.target.value }))} placeholder="0.05" data-testid="input-growth-rate" /></div>
          </div>
          <div className="border rounded p-2 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Asset-Based Inputs (optional)</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="biz-tangible" className="text-xs">Tangible Assets</Label><Input id="biz-tangible" value={form.tangibleAssets} onChange={e => setForm(p => ({ ...p, tangibleAssets: e.target.value }))} placeholder="e.g. 500000" data-testid="input-tangible-assets" /></div>
              <div><Label htmlFor="biz-intangible" className="text-xs">Intangible Assets</Label><Input id="biz-intangible" value={form.intangibleAssets} onChange={e => setForm(p => ({ ...p, intangibleAssets: e.target.value }))} placeholder="e.g. 200000" data-testid="input-intangible-assets" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="biz-liabilities" className="text-xs">Total Liabilities</Label><Input id="biz-liabilities" value={form.totalLiabilities} onChange={e => setForm(p => ({ ...p, totalLiabilities: e.target.value }))} placeholder="e.g. 150000" data-testid="input-total-liabilities" /></div>
              <div><Label htmlFor="biz-goodwill" className="text-xs">Goodwill</Label><Input id="biz-goodwill" value={form.goodwill} onChange={e => setForm(p => ({ ...p, goodwill: e.target.value }))} placeholder="e.g. 100000" data-testid="input-goodwill" /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="biz-est-value" className="text-xs">Estimated Value (manual)</Label><Input id="biz-est-value" value={form.estimatedValue} onChange={e => setForm(p => ({ ...p, estimatedValue: e.target.value }))} data-testid="input-est-value" /></div>
            <div><Label htmlFor="biz-val-date" className="text-xs">Valuation Date</Label><Input id="biz-val-date" type="date" value={form.valuationDate} onChange={e => setForm(p => ({ ...p, valuationDate: e.target.value }))} data-testid="input-val-date" /></div>
          </div>
          <div><Label htmlFor="biz-val-notes" className="text-xs">Notes</Label><Textarea id="biz-val-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-val-notes" /></div>
          <Button onClick={handleSubmit} disabled={!form.businessName || isPending} className="w-full" data-testid="button-submit-valuation">Create Valuation</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateFlpDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ name: "", totalValue: "", generalPartnerPct: "1", limitedPartnerPct: "99", lackOfControlDiscount: "0.25", lackOfMarketabilityDiscount: "0.20", dateEstablished: "", notes: "" });
  const handleSubmit = () => { if (!form.name) return; onSubmit(form); setForm({ name: "", totalValue: "", generalPartnerPct: "1", limitedPartnerPct: "99", lackOfControlDiscount: "0.25", lackOfMarketabilityDiscount: "0.20", dateEstablished: "", notes: "" }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add FLP Structure</DialogTitle>
          <DialogDescription>Configure Family Limited Partnership details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="flp-name" className="text-xs">Name *</Label><Input id="flp-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-flp-name" /></div>
          <div><Label htmlFor="flp-value" className="text-xs">Total Value</Label><Input id="flp-value" value={form.totalValue} onChange={e => setForm(p => ({ ...p, totalValue: e.target.value }))} data-testid="input-flp-value" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="flp-gp-pct" className="text-xs">GP %</Label><Input id="flp-gp-pct" value={form.generalPartnerPct} onChange={e => setForm(p => ({ ...p, generalPartnerPct: e.target.value }))} data-testid="input-gp-pct" /></div>
            <div><Label htmlFor="flp-lp-pct" className="text-xs">LP %</Label><Input id="flp-lp-pct" value={form.limitedPartnerPct} onChange={e => setForm(p => ({ ...p, limitedPartnerPct: e.target.value }))} data-testid="input-lp-pct" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="flp-control-discount" className="text-xs">Control Discount</Label><Input id="flp-control-discount" value={form.lackOfControlDiscount} onChange={e => setForm(p => ({ ...p, lackOfControlDiscount: e.target.value }))} data-testid="input-control-discount" /></div>
            <div><Label htmlFor="flp-market-discount" className="text-xs">Marketability Discount</Label><Input id="flp-market-discount" value={form.lackOfMarketabilityDiscount} onChange={e => setForm(p => ({ ...p, lackOfMarketabilityDiscount: e.target.value }))} data-testid="input-market-discount" /></div>
          </div>
          <div><Label htmlFor="flp-date" className="text-xs">Date Established</Label><Input id="flp-date" type="date" value={form.dateEstablished} onChange={e => setForm(p => ({ ...p, dateEstablished: e.target.value }))} data-testid="input-flp-date" /></div>
          <div><Label htmlFor="flp-notes" className="text-xs">Notes</Label><Textarea id="flp-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-flp-notes" /></div>
          <Button onClick={handleSubmit} disabled={!form.name || isPending} className="w-full" data-testid="button-submit-flp">Create FLP</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateBuySellDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ agreementType: "", fundingMethod: "", coverageAmount: "", effectiveDate: "", reviewDate: "", notes: "" });
  const handleSubmit = () => { if (!form.agreementType || !form.fundingMethod) return; onSubmit(form); setForm({ agreementType: "", fundingMethod: "", coverageAmount: "", effectiveDate: "", reviewDate: "", notes: "" }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Buy-Sell Agreement</DialogTitle>
          <DialogDescription>Record a buy-sell agreement for the business.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="bs-agreement-type" className="text-xs">Agreement Type *</Label>
            <Select value={form.agreementType} onValueChange={v => setForm(p => ({ ...p, agreementType: v }))}>
              <SelectTrigger id="bs-agreement-type" data-testid="select-agreement-type"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cross-purchase">Cross-Purchase</SelectItem>
                <SelectItem value="entity-purchase">Entity Purchase (Redemption)</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="wait-and-see">Wait-and-See</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="bs-funding-method" className="text-xs">Funding Method *</Label>
            <Select value={form.fundingMethod} onValueChange={v => setForm(p => ({ ...p, fundingMethod: v }))}>
              <SelectTrigger id="bs-funding-method" data-testid="select-funding-method"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="life-insurance">Life Insurance</SelectItem>
                <SelectItem value="sinking-fund">Sinking Fund</SelectItem>
                <SelectItem value="installment">Installment Payments</SelectItem>
                <SelectItem value="combination">Combination</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="bs-coverage" className="text-xs">Coverage Amount</Label><Input id="bs-coverage" value={form.coverageAmount} onChange={e => setForm(p => ({ ...p, coverageAmount: e.target.value }))} data-testid="input-coverage-amount" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="bs-effective-date" className="text-xs">Effective Date</Label><Input id="bs-effective-date" type="date" value={form.effectiveDate} onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))} data-testid="input-effective-date" /></div>
            <div><Label htmlFor="bs-review-date" className="text-xs">Review Date</Label><Input id="bs-review-date" type="date" value={form.reviewDate} onChange={e => setForm(p => ({ ...p, reviewDate: e.target.value }))} data-testid="input-review-date" /></div>
          </div>
          <div><Label htmlFor="bs-notes" className="text-xs">Notes</Label><Textarea id="bs-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-buysell-notes" /></div>
          <Button onClick={handleSubmit} disabled={!form.agreementType || !form.fundingMethod || isPending} className="w-full" data-testid="button-submit-buysell">Create Agreement</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateMilestoneDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ title: "", description: "", targetDate: "", category: "general", notes: "" });
  const handleSubmit = () => { if (!form.title) return; onSubmit(form); setForm({ title: "", description: "", targetDate: "", category: "general", notes: "" }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Exit Milestone</DialogTitle>
          <DialogDescription>Track a key milestone in the exit timeline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="ms-title" className="text-xs">Title *</Label><Input id="ms-title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-milestone-title" /></div>
          <div><Label htmlFor="ms-desc" className="text-xs">Description</Label><Textarea id="ms-desc" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} data-testid="input-milestone-desc" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="ms-date" className="text-xs">Target Date</Label><Input id="ms-date" type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} data-testid="input-milestone-date" /></div>
            <div><Label htmlFor="ms-category" className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger id="ms-category" data-testid="select-milestone-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="tax">Tax</SelectItem>
                  <SelectItem value="succession">Succession</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={!form.title || isPending} className="w-full" data-testid="button-submit-milestone">Create Milestone</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
