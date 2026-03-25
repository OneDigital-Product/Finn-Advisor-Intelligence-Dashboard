import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useAllClients } from "@/hooks/use-all-clients";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, ArrowLeft, AlertTriangle, Info, DollarSign, Plus, Trash2, Shield, Clock, CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency as _fc } from "@/lib/format";
const formatCurrency = (v: number) => _fc(v, { abbreviated: false });

interface QSBSEntry {
  companyName: string;
  ticker: string;
  sharesOwned: string;
  costBasis: string;
  currentValue: string;
  acquisitionDate: string;
  qualifiedSmallBusiness: boolean;
  cCorpAtAcquisition: boolean;
  grossAssetsUnder50M: boolean;
  activeBusinessRequirement: boolean;
  originalHolder: boolean;
}

const EMPTY_QSBS: QSBSEntry = {
  companyName: "", ticker: "", sharesOwned: "", costBasis: "", currentValue: "",
  acquisitionDate: "", qualifiedSmallBusiness: true, cCorpAtAcquisition: true,
  grossAssetsUnder50M: true, activeBusinessRequirement: true, originalHolder: true,
};

export default function QSBSCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [holdings, setHoldings] = useState<QSBSEntry[]>([{ ...EMPTY_QSBS }]);
  const [federalCGRate, setFederalCGRate] = useState("20");
  const [stateCGRate, setStateCGRate] = useState("0");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const updateHolding = (idx: number, field: string, value: any) => {
    const updated = [...holdings];
    updated[idx] = { ...updated[idx], [field]: value };
    setHoldings(updated);
  };

  const addHolding = () => setHoldings([...holdings, { ...EMPTY_QSBS }]);
  const removeHolding = (idx: number) => { if (holdings.length > 1) setHoldings(holdings.filter((_, i) => i !== idx)); };

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const parsed = holdings.filter((h) => h.companyName && h.costBasis && h.currentValue && h.acquisitionDate).map((h) => ({
        companyName: h.companyName,
        ticker: h.ticker || undefined,
        sharesOwned: parseFloat(h.sharesOwned) || 0,
        costBasis: parseFloat(h.costBasis),
        currentValue: parseFloat(h.currentValue),
        acquisitionDate: h.acquisitionDate,
        qualifiedSmallBusiness: h.qualifiedSmallBusiness,
        cCorpAtAcquisition: h.cCorpAtAcquisition,
        grossAssetsUnder50M: h.grossAssetsUnder50M,
        activeBusinessRequirement: h.activeBusinessRequirement,
        originalHolder: h.originalHolder,
      }));
      if (parsed.length === 0) throw new Error("Add at least one QSBS holding");
      const res = await apiRequest("POST", "/api/calculators/qsbs", {
        holdings: parsed,
        federalCapitalGainsRate: parseFloat(federalCGRate) / 100,
        stateCapitalGainsRate: parseFloat(stateCGRate) / 100,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "QSBS analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const statusIcon = (status: string) => {
    if (status === "qualified") return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === "pending") return <Clock className="w-4 h-4 text-amber-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = { qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", ineligible: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${variants[status] || ""}`}>{statusIcon(status)} {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/tax-strategy")} data-testid="button-back-tax-strategy">
          <ArrowLeft className="w-4 h-4 mr-1" /> Tax Strategy
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">QSBS Tracker</h1>
          <p className="text-sm text-muted-foreground">Track Section 1202 qualified small business stock exclusions and holding periods</p>
        </div>
      </div>

      {holdings.map((h, idx) => (
        <Card key={idx} data-testid={`qsbs-holding-${idx}`}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Holding {idx + 1}{h.companyName && `: ${h.companyName}`}</CardTitle>
              {holdings.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeHolding(idx)} data-testid={`button-remove-qsbs-${idx}`}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <Label htmlFor={`input-company-name-${idx}`} className="text-xs">Company Name *</Label>
                <Input value={h.companyName} onChange={(e) => updateHolding(idx, "companyName", e.target.value)} placeholder="Acme Corp" id={`input-company-name-${idx}`} data-testid={`input-company-name-${idx}`} />
              </div>
              <div>
                <Label htmlFor={`input-ticker-${idx}`} className="text-xs">Ticker</Label>
                <Input value={h.ticker} onChange={(e) => updateHolding(idx, "ticker", e.target.value)} placeholder="ACME" id={`input-ticker-${idx}`} data-testid={`input-ticker-${idx}`} />
              </div>
              <div>
                <Label htmlFor={`input-shares-${idx}`} className="text-xs">Shares</Label>
                <Input type="number" min="0" value={h.sharesOwned} onChange={(e) => updateHolding(idx, "sharesOwned", e.target.value)} id={`input-shares-${idx}`} data-testid={`input-shares-${idx}`} />
              </div>
              <div>
                <Label htmlFor={`input-cost-basis-${idx}`} className="text-xs">Cost Basis * <InfoTip term="qsbs" /></Label>
                <Input type="number" min="0" step="0.01" value={h.costBasis} onChange={(e) => updateHolding(idx, "costBasis", e.target.value)} placeholder="100000" id={`input-cost-basis-${idx}`} data-testid={`input-cost-basis-${idx}`} />
              </div>
              <div>
                <Label htmlFor={`input-current-value-${idx}`} className="text-xs">Current Value *</Label>
                <Input type="number" min="0" step="0.01" value={h.currentValue} onChange={(e) => updateHolding(idx, "currentValue", e.target.value)} placeholder="500000" id={`input-current-value-${idx}`} data-testid={`input-current-value-${idx}`} />
              </div>
              <div>
                <Label htmlFor={`input-acq-date-${idx}`} className="text-xs">Acquisition Date *</Label>
                <Input type="date" value={h.acquisitionDate} onChange={(e) => updateHolding(idx, "acquisitionDate", e.target.value)} id={`input-acq-date-${idx}`} data-testid={`input-acq-date-${idx}`} />
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Eligibility Criteria</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: "qualifiedSmallBusiness", label: "Qualified Small Business" },
                  { key: "cCorpAtAcquisition", label: "C-Corp at Acquisition" },
                  { key: "grossAssetsUnder50M", label: "Gross Assets ≤ $50M" },
                  { key: "activeBusinessRequirement", label: "Active Business Requirement" },
                  { key: "originalHolder", label: "Original Holder (Direct Issuance)" },
                ].map((criteria) => (
                  <div key={criteria.key} className="flex items-center gap-2">
                    <Checkbox
                      checked={h[criteria.key as keyof QSBSEntry] as boolean}
                      onCheckedChange={(checked) => updateHolding(idx, criteria.key, !!checked)}
                      data-testid={`checkbox-${criteria.key}-${idx}`}
                    />
                    <Label className="text-xs cursor-pointer">{criteria.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={addHolding} data-testid="button-add-qsbs">
          <Plus className="w-4 h-4 mr-1" /> Add Holding
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-base">Tax Rates</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="input-federal-cg-rate" className="text-xs">Federal Capital Gains Rate (%)</Label>
              <Input type="number" step="1" min="0" max="30" value={federalCGRate} onChange={(e) => setFederalCGRate(e.target.value)} id="input-federal-cg-rate" data-testid="input-federal-cg-rate" />
            </div>
            <div>
              <Label htmlFor="input-state-cg-rate" className="text-xs">State Capital Gains Rate (%)</Label>
              <Input type="number" step="0.1" min="0" max="15" value={stateCGRate} onChange={(e) => setStateCGRate(e.target.value)} id="input-state-cg-rate" data-testid="input-state-cg-rate" />
            </div>
            <div>
              <Label htmlFor="select-client" className="text-xs">Client (Optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="select-client" data-testid="select-client"><SelectValue placeholder="No client linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client linked</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-4" onClick={() => calculateMutation.mutate()} disabled={calculateMutation.isPending} data-testid="button-calculate">
            {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Analyze QSBS
          </Button>
        </CardContent>
      </Card>

      {calculateMutation.isPending && <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>}

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Tax Savings</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-total-savings">{formatCurrency(results.totalTaxSavings)}</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Excludable Gain</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-excludable-gain">{formatCurrency(results.totalExcludableGain)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Qualified</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-qualified-count">{results.summary.qualifiedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Pending / Ineligible</p>
                <p className="text-2xl font-bold" data-testid="text-pending-count">
                  <span className="text-amber-600">{results.summary.pendingCount}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-red-600">{results.summary.ineligibleCount}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {results.alerts && results.alerts.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" /> Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.alerts.map((alert: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`alert-${idx}`}>
                      <Badge variant={alert.severity === "high" ? "destructive" : "secondary"} className="text-[10px] shrink-0 mt-0.5">{alert.severity}</Badge>
                      <span>{alert.message}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.analyses?.map((analysis: any, idx: number) => (
            <Card key={idx} data-testid={`analysis-card-${idx}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    {analysis.companyName}
                    {analysis.ticker && <span className="text-muted-foreground text-sm">({analysis.ticker})</span>}
                  </CardTitle>
                  {statusBadge(analysis.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Cost Basis</p>
                    <p className="text-sm font-medium">{formatCurrency(analysis.costBasis)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Value</p>
                    <p className="text-sm font-medium">{formatCurrency(analysis.currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unrealized Gain</p>
                    <p className={`text-sm font-medium ${analysis.unrealizedGain >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(analysis.unrealizedGain)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Excludable Gain</p>
                    <p className="text-sm font-medium text-primary">{formatCurrency(analysis.excludableGain)}</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Holding Period Milestones</p>
                  <div className="space-y-2">
                    {analysis.milestones?.map((m: any, midx: number) => (
                      <div key={midx} className="flex items-center gap-3 text-sm" data-testid={`milestone-${idx}-${midx}`}>
                        {m.completed ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> : <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                        <div className="flex-1">
                          <span className="font-medium">{m.label}</span>
                          <span className="text-muted-foreground ml-2">({m.date})</span>
                          {m.daysAway !== null && <span className="text-amber-600 ml-2 text-xs">{m.daysAway} days away</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {analysis.eligibilityIssues.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-medium text-red-600 mb-1">Eligibility Issues</p>
                    <ul className="space-y-1">
                      {analysis.eligibilityIssues.map((issue: string, iidx: number) => (
                        <li key={iidx} className="flex items-start gap-2 text-xs text-red-600">
                          <XCircle className="w-3 h-3 shrink-0 mt-0.5" /><span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {results.notes && results.notes.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Important Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.notes.map((note: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`note-${idx}`}>
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" /><span>{note}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <CalculatorInterpretation
            calculatorName="QSBS Eligibility Analyzer"
            summary={`${results.summary?.qualifiedCount || 0} of ${results.analyses?.length || 0} holdings qualified for Section 1202 exclusion. Total tax savings potential: ${formatCurrency(results.totalTaxSavings)}. Excludable gain: ${formatCurrency(results.totalExcludableGain)}.`}
            metrics={[
              { label: "Tax Savings", value: formatCurrency(results.totalTaxSavings), tooltip: "Total potential federal and state tax savings from qualified QSBS holdings.", status: "good" },
              { label: "Excludable Gain", value: formatCurrency(results.totalExcludableGain), tooltip: "Total capital gains eligible for 100% exclusion under Section 1202.", status: "good" },
              { label: "Qualified", value: `${results.summary?.qualifiedCount || 0}`, tooltip: "Number of holdings that meet all QSBS eligibility criteria and 5-year holding period.", status: results.summary?.qualifiedCount > 0 ? "good" : "warning" },
            ]}
            insights={[
              "QSBS exclusion applies to stock acquired directly from a C-Corporation",
              `${results.summary?.pendingCount || 0} holdings pending 5-year holding period completion`,
            ]}
            warnings={results.notes || []}
            actions={[
              { label: "QSBS Tracker", href: "/calculators/qsbs" },
            ]}
            inputs={{ holdings, federalCGRate, stateCGRate }}
            results={results}
            clientId={clientId && clientId !== "none" ? clientId : undefined}
          />
        </div>
      )}
    </div>
  );
}
