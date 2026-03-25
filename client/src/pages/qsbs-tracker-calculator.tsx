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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, ArrowLeft, DollarSign, Info, AlertTriangle, Plus, Trash2,
  CheckCircle, Clock, XCircle,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

interface PositionEntry {
  companyName: string;
  sharesOwned: string;
  costBasis: string;
  currentValue: string;
  acquisitionDate: string;
  isOriginalIssue: boolean;
  companyGrossAssets: string;
  isCCorporation: boolean;
  qualifiedTradeOrBusiness: boolean;
}

const EMPTY_POSITION: PositionEntry = {
  companyName: "", sharesOwned: "", costBasis: "", currentValue: "",
  acquisitionDate: "", isOriginalIssue: true, companyGrossAssets: "under_50m",
  isCCorporation: true, qualifiedTradeOrBusiness: true,
};

function StatusBadge({ status }: { status: string }) {
  if (status === "qualified") return <Badge className="bg-green-100 text-green-800 border-green-200 no-default-active-elevate"><CheckCircle className="w-3 h-3 mr-1" /> Qualified</Badge>;
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-800 border-amber-200 no-default-active-elevate"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200 no-default-active-elevate"><XCircle className="w-3 h-3 mr-1" /> Ineligible</Badge>;
}

export default function QSBSTrackerCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [positions, setPositions] = useState<PositionEntry[]>([{ ...EMPTY_POSITION }]);
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const addPosition = () => setPositions([...positions, { ...EMPTY_POSITION }]);
  const removePosition = (idx: number) => {
    if (positions.length <= 1) return;
    setPositions(positions.filter((_, i) => i !== idx));
  };
  const updatePosition = (idx: number, field: keyof PositionEntry, value: any) => {
    const updated = [...positions];
    updated[idx] = { ...updated[idx], [field]: value };
    setPositions(updated);
  };

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/qsbs", {
        positions: positions.filter(p => p.companyName).map(p => ({
          companyName: p.companyName,
          sharesOwned: parseFloat(p.sharesOwned) || 0,
          costBasis: parseFloat(p.costBasis) || 0,
          currentValue: parseFloat(p.currentValue) || 0,
          acquisitionDate: p.acquisitionDate,
          isOriginalIssue: p.isOriginalIssue,
          companyGrossAssets: p.companyGrossAssets,
          isCCorporation: p.isCCorporation,
          qualifiedTradeOrBusiness: p.qualifiedTradeOrBusiness,
        })),
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
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = positions.filter(p => p.companyName && p.acquisitionDate);
    if (valid.length === 0) {
      toast({ title: "Missing data", description: "Add at least one position with company name and acquisition date.", variant: "destructive" });
      return;
    }
    calculateMutation.mutate();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/calculators")} data-testid="button-back-calculators">
          <ArrowLeft className="w-4 h-4 mr-1" /> Calculators
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">QSBS Tracker</h1>
          <p className="text-sm text-muted-foreground">Track qualified small business stock positions and Section 1202 exclusion eligibility</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">QSBS Positions</CardTitle>
            <Button variant="outline" size="sm" onClick={addPosition} data-testid="button-add-position">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCalculate}>
            <div className="space-y-4">
              {positions.map((pos, idx) => (
                <div key={idx} className="p-4 rounded-md bg-muted/30 border space-y-3" data-testid={`position-${idx}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor={`input-company-${idx}`} className="text-xs">Company Name *</Label>
                      <Input placeholder="TechCorp Inc." value={pos.companyName} onChange={(e) => updatePosition(idx, "companyName", e.target.value)} id={`input-company-${idx}`} data-testid={`input-company-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`input-shares-${idx}`} className="text-xs">Shares</Label>
                      <Input type="number" min="0" placeholder="10000" value={pos.sharesOwned} onChange={(e) => updatePosition(idx, "sharesOwned", e.target.value)} id={`input-shares-${idx}`} data-testid={`input-shares-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`input-cost-basis-${idx}`} className="text-xs">Cost Basis ($) <InfoTip term="qsbs" /></Label>
                      <Input type="number" min="0" placeholder="100000" value={pos.costBasis} onChange={(e) => updatePosition(idx, "costBasis", e.target.value)} id={`input-cost-basis-${idx}`} data-testid={`input-cost-basis-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`input-current-value-${idx}`} className="text-xs">Current Value ($)</Label>
                      <Input type="number" min="0" placeholder="500000" value={pos.currentValue} onChange={(e) => updatePosition(idx, "currentValue", e.target.value)} id={`input-current-value-${idx}`} data-testid={`input-current-value-${idx}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <Label htmlFor={`input-acq-date-${idx}`} className="text-xs">Acquisition Date *</Label>
                      <Input type="date" value={pos.acquisitionDate} onChange={(e) => updatePosition(idx, "acquisitionDate", e.target.value)} id={`input-acq-date-${idx}`} data-testid={`input-acq-date-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`select-gross-assets-${idx}`} className="text-xs">Gross Assets</Label>
                      <Select value={pos.companyGrossAssets} onValueChange={(v) => updatePosition(idx, "companyGrossAssets", v)}>
                        <SelectTrigger id={`select-gross-assets-${idx}`} data-testid={`select-gross-assets-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_50m">Under $50M</SelectItem>
                          <SelectItem value="over_50m">Over $50M</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <div className="flex items-center gap-2">
                        <Switch checked={pos.isOriginalIssue} onCheckedChange={(v) => updatePosition(idx, "isOriginalIssue", v)} id={`switch-original-issue-${idx}`} data-testid={`switch-original-issue-${idx}`} />
                        <Label htmlFor={`switch-original-issue-${idx}`} className="text-xs">Original Issue</Label>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <div className="flex items-center gap-2">
                        <Switch checked={pos.isCCorporation} onCheckedChange={(v) => updatePosition(idx, "isCCorporation", v)} id={`switch-c-corp-${idx}`} data-testid={`switch-c-corp-${idx}`} />
                        <Label htmlFor={`switch-c-corp-${idx}`} className="text-xs">C-Corp</Label>
                      </div>
                    </div>
                    <div className="flex items-end justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <Switch checked={pos.qualifiedTradeOrBusiness} onCheckedChange={(v) => updatePosition(idx, "qualifiedTradeOrBusiness", v)} id={`switch-qtb-${idx}`} data-testid={`switch-qtb-${idx}`} />
                        <Label htmlFor={`switch-qtb-${idx}`} className="text-xs">QTB</Label>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePosition(idx)} disabled={positions.length <= 1} data-testid={`button-remove-position-${idx}`}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="w-48">
                <Label htmlFor="select-client" className="text-xs">Client (Optional)</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="select-client" data-testid="select-client">
                    <SelectValue placeholder="No client linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client linked</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1" />
              <Button type="submit" disabled={calculateMutation.isPending} data-testid="button-calculate">
                {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Analyze QSBS Positions
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {calculateMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {results && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Tax Savings</p>
                <p className="text-xl font-bold text-primary" data-testid="text-total-savings">{fmt(results.summary.totalEstimatedTaxSavings)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Excludable Gain</p>
                <p className="text-xl font-bold" data-testid="text-excludable-gain">{fmt(results.summary.totalExcludableGain)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Qualified</p>
                <p className="text-xl font-bold text-green-600" data-testid="text-qualified-count">{results.summary.qualifiedPositions}</p>
                <p className="text-xs text-muted-foreground">of {results.summary.totalPositions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                <p className="text-xl font-bold text-amber-600" data-testid="text-pending-count">{results.summary.pendingPositions}</p>
                <p className="text-xs text-muted-foreground">of {results.summary.totalPositions}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Position Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.positions?.map((pos: any, idx: number) => (
                <div key={idx} className="p-4 rounded-md border space-y-3" data-testid={`result-position-${idx}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{pos.companyName}</p>
                      <p className="text-xs text-muted-foreground">{pos.sharesOwned.toLocaleString()} shares | Acquired {new Date(pos.acquisitionDate).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={pos.status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Cost Basis</p>
                      <p className="font-medium">{fmt(pos.costBasis)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Value</p>
                      <p className="font-medium">{fmt(pos.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unrealized Gain</p>
                      <p className={`font-medium ${pos.unrealizedGain >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(pos.unrealizedGain)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Excludable</p>
                      <p className="font-medium text-primary">{fmt(pos.excludableGain)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tax Savings</p>
                      <p className="font-medium text-green-600">{fmt(pos.estimatedTaxSavings)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Holding Period: {pos.holdingPeriodYears} years</span>
                      <span className={pos.holdingPeriodMet ? "text-green-600" : "text-amber-600"}>
                        {pos.holdingPeriodMet ? "5-year requirement met" : `${pos.daysUntilQualified} days remaining`}
                      </span>
                    </div>
                    <Progress value={Math.min(100, (pos.holdingPeriodYears / 5) * 100)} className={`h-2 ${pos.holdingPeriodMet ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500"}`} />
                  </div>

                  {pos.eligibilityIssues.length > 0 && (
                    <div className="space-y-1">
                      {pos.eligibilityIssues.map((issue: string, i: number) => (
                        <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="w-3 h-3 shrink-0" /> {issue}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

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
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <CalculatorInterpretation
            calculatorName="QSBS Tracker"
            summary={`Tracking ${results.summary?.totalPositions || 0} QSBS positions with ${fmt(results.summary?.totalPotentialExclusion || 0)} in potential gain exclusions. ${results.summary?.qualifiedPositions || 0} positions currently qualified.`}
            metrics={[
              { label: "Potential Exclusion", value: fmt(results.summary?.totalPotentialExclusion || 0), tooltip: "Total capital gains that could be excluded from federal tax under Section 1202 QSBS rules.", status: "good" },
              { label: "Tax Savings", value: fmt(results.summary?.estimatedTaxSavings || 0), tooltip: "Estimated federal + state tax savings if all qualifying positions are held for the required 5-year period.", status: "good" },
              { label: "Qualified", value: `${results.summary?.qualifiedPositions || 0} / ${results.summary?.totalPositions || 0}`, tooltip: "Number of positions that have met the 5-year holding period requirement.", status: undefined },
            ]}
            insights={[
              "Section 1202 allows up to $10M or 10x cost basis in gain exclusion per issuer",
              "5-year holding period required from date of stock issuance",
            ]}
            warnings={results.notes || []}
            actions={[
              { label: "QSBS Analysis", href: "/calculators/qsbs" },
            ]}
            inputs={{ positions }}
            results={results}
            clientId={clientId && clientId !== "none" ? clientId : undefined}
          />
        </>
      )}
    </div>
  );
}
