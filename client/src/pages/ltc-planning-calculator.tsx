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
import {
  Loader2, ArrowLeft, DollarSign, Info, AlertTriangle,
  Heart, CheckCircle, XCircle, ShieldCheck,
} from "lucide-react";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

export default function LTCPlanningCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [clientAge, setClientAge] = useState("60");
  const [gender, setGender] = useState("female");
  const [healthStatus, setHealthStatus] = useState("good");
  const [liquidAssets, setLiquidAssets] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [annualExpenses, setAnnualExpenses] = useState("");
  const [existingLTCCoverage, setExistingLTCCoverage] = useState("0");
  const [spouseAge, setSpouseAge] = useState("");
  const [spouseIncome, setSpouseIncome] = useState("");
  const [carePreference, setCarePreference] = useState("blended");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/ltc-planning", {
        clientAge: parseInt(clientAge),
        gender,
        healthStatus,
        liquidAssets: parseFloat(liquidAssets) || 0,
        annualIncome: parseFloat(annualIncome) || 0,
        annualExpenses: parseFloat(annualExpenses) || 0,
        existingLTCCoverage: parseFloat(existingLTCCoverage) || 0,
        spouseAge: spouseAge ? parseInt(spouseAge) : undefined,
        spouseIncome: spouseIncome ? parseFloat(spouseIncome) : undefined,
        carePreference,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "LTC planning analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidAssets || !annualIncome || !annualExpenses) {
      toast({ title: "Missing required fields", description: "Please fill in assets, income, and expenses.", variant: "destructive" });
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Long-Term Care Planning Analyzer</h1>
          <p className="text-sm text-muted-foreground">Compare self-insure, traditional LTC, and hybrid policy scenarios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Client Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalculate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="input-client-age" className="text-xs">Client Age</Label>
                    <Input type="number" min="30" max="100" value={clientAge} onChange={(e) => setClientAge(e.target.value)} required id="input-client-age" data-testid="input-client-age" />
                  </div>
                  <div>
                    <Label htmlFor="select-gender" className="text-xs">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="select-gender" data-testid="select-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="select-health" className="text-xs">Health Status</Label>
                  <Select value={healthStatus} onValueChange={setHealthStatus}>
                    <SelectTrigger id="select-health" data-testid="select-health">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="input-liquid-assets" className="text-xs">Liquid Assets * <InfoTip term="ltc" /></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="500000" value={liquidAssets} onChange={(e) => setLiquidAssets(e.target.value)} className="pl-9" required id="input-liquid-assets" data-testid="input-liquid-assets" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-annual-income" className="text-xs">Annual Income *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="120000" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} className="pl-9" required id="input-annual-income" data-testid="input-annual-income" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-annual-expenses" className="text-xs">Annual Expenses *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="80000" value={annualExpenses} onChange={(e) => setAnnualExpenses(e.target.value)} className="pl-9" required id="input-annual-expenses" data-testid="input-annual-expenses" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="select-care-preference" className="text-xs">Care Preference</Label>
                  <Select value={carePreference} onValueChange={setCarePreference}>
                    <SelectTrigger id="select-care-preference" data-testid="select-care-preference">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nursing_home">Nursing Home</SelectItem>
                      <SelectItem value="assisted_living">Assisted Living</SelectItem>
                      <SelectItem value="home_care">Home Care</SelectItem>
                      <SelectItem value="blended">Blended (Average)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="input-existing-coverage" className="text-xs">Existing LTC Coverage</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="0" value={existingLTCCoverage} onChange={(e) => setExistingLTCCoverage(e.target.value)} className="pl-9" id="input-existing-coverage" data-testid="input-existing-coverage" />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="input-spouse-age" className="text-xs">Spouse Age</Label>
                      <Input type="number" min="20" max="100" placeholder="58" value={spouseAge} onChange={(e) => setSpouseAge(e.target.value)} id="input-spouse-age" data-testid="input-spouse-age" />
                    </div>
                    <div>
                      <Label htmlFor="input-spouse-income" className="text-xs">Spouse Income</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" placeholder="60000" value={spouseIncome} onChange={(e) => setSpouseIncome(e.target.value)} className="pl-9" id="input-spouse-income" data-testid="input-spouse-income" />
                      </div>
                    </div>
                  </div>

                  <div>
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
                </div>

                <Button type="submit" className="w-full" disabled={calculateMutation.isPending} data-testid="button-calculate">
                  {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Analyze LTC Options
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!results && !calculateMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Heart className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1" data-testid="text-empty-results">Enter client profile to analyze</h3>
                <p className="text-sm text-muted-foreground">Fill in the client details and click Analyze LTC Options to compare scenarios.</p>
              </CardContent>
            </Card>
          )}

          {calculateMutation.isPending && (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {results && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Probability of Need</p>
                    <p className="text-xl font-bold text-primary" data-testid="text-probability">{(results.probabilityOfNeed * 100).toFixed(0)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Cost at Age 80</p>
                    <p className="text-xl font-bold" data-testid="text-cost-80">{fmt(results.projectedLTCCost.atAge80)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Annual Cost Today</p>
                    <p className="text-xl font-bold" data-testid="text-annual-cost">{fmt(results.projectedLTCCost.annualCostToday)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Self-Insure</p>
                    <Badge variant={results.selfInsureCapacity.canSelfInsure ? "secondary" : "destructive"} data-testid="text-self-insure-status">
                      {results.selfInsureCapacity.canSelfInsure ? "Viable" : "Shortfall"}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Projected LTC Costs ({results.projectedLTCCost.careType})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-md bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">At Age 75</p>
                      <p className="text-lg font-bold">{fmt(results.projectedLTCCost.atAge75)}</p>
                      <p className="text-xs text-muted-foreground">for {results.projectedLTCCost.averageDuration} yrs avg care</p>
                    </div>
                    <div className="p-4 rounded-md bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">At Age 80</p>
                      <p className="text-lg font-bold text-primary">{fmt(results.projectedLTCCost.atAge80)}</p>
                      <p className="text-xs text-muted-foreground">for {results.projectedLTCCost.averageDuration} yrs avg care</p>
                    </div>
                    <div className="p-4 rounded-md bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">At Age 85</p>
                      <p className="text-lg font-bold">{fmt(results.projectedLTCCost.atAge85)}</p>
                      <p className="text-xs text-muted-foreground">for {results.projectedLTCCost.averageDuration} yrs avg care</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Scenario Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.scenarios?.map((s: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4" data-testid={`card-scenario-${idx}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{s.strategy}</h4>
                          {s.totalCostOverPeriod > 0 && (
                            <Badge variant="outline">{s.annualCost > 0 ? `${fmt(s.annualCost)}/yr` : `${fmt(s.totalCostOverPeriod)} one-time`}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                            <p className="font-semibold">{fmt(s.totalCostOverPeriod)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Out-of-Pocket at Claim</p>
                            <p className="font-semibold">{fmt(s.outOfPocketAtClaim)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Asset Protection</p>
                            <p className="font-semibold">{fmt(s.assetProtection)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Coverage Gap</p>
                            <p className={`font-semibold ${s.coverageGap > 0 ? "text-red-600" : "text-green-600"}`}>
                              {s.coverageGap > 0 ? fmt(s.coverageGap) : "None"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs font-medium text-green-600 mb-1">Advantages</p>
                            <ul className="text-xs space-y-1">
                              {s.pros.map((p: string, i: number) => (
                                <li key={i} className="flex items-start gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-red-600 mb-1">Disadvantages</p>
                            <ul className="text-xs space-y-1">
                              {s.cons.map((c: string, i: number) => (
                                <li key={i} className="flex items-start gap-1">
                                  <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {results.breakEvenAnalysis && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Break-Even Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-md bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Traditional vs Self-Insure</p>
                        <p className="text-lg font-bold" data-testid="text-breakeven-trad-self">
                          {results.breakEvenAnalysis.traditionalVsSelfInsure > 0
                            ? `Age ${results.breakEvenAnalysis.traditionalVsSelfInsure}`
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Insurance pays off after this age</p>
                      </div>
                      <div className="p-4 rounded-md bg-primary/5 border border-primary/20">
                        <p className="text-xs text-muted-foreground mb-1">Hybrid vs Self-Insure</p>
                        <p className="text-lg font-bold text-primary" data-testid="text-breakeven-hybrid-self">
                          {results.breakEvenAnalysis.hybridVsSelfInsure > 0
                            ? `Age ${results.breakEvenAnalysis.hybridVsSelfInsure}`
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Hybrid policy pays off after this age</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Traditional vs Hybrid</p>
                        <p className="text-lg font-bold" data-testid="text-breakeven-trad-hybrid">
                          {results.breakEvenAnalysis.traditionalVsHybrid > 0
                            ? `Age ${results.breakEvenAnalysis.traditionalVsHybrid}`
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Traditional beats hybrid after this age</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {results.scenarios?.filter((s: any) => s.breakEvenAge && s.breakEvenAge < 200).map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b pb-2" data-testid={`row-breakeven-scenario-${idx}`}>
                          <span className="text-muted-foreground">{s.strategy}</span>
                          <span className="font-semibold">Break-even age: {s.breakEvenAge}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Self-Insure Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Surplus / Deficit</p>
                      <p className={`font-semibold ${results.selfInsureCapacity.surplusOrDeficit >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-surplus-deficit">
                        {fmt(results.selfInsureCapacity.surplusOrDeficit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Years of Coverage</p>
                      <p className="font-semibold">{results.selfInsureCapacity.yearsOfCoverage} yrs</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assets Required</p>
                      <p className="font-semibold">{results.selfInsureCapacity.percentOfAssetsRequired.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assessment</p>
                      <Badge variant={results.selfInsureCapacity.canSelfInsure ? "secondary" : "destructive"}>
                        {results.selfInsureCapacity.canSelfInsure ? "Feasible" : "Not Recommended"}
                      </Badge>
                    </div>
                  </div>
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
                calculatorName="LTC Planning"
                summary={`${(results.probabilityOfNeed * 100).toFixed(0)}% probability of needing long-term care. Projected cost at age 80: ${fmt(results.projectedLTCCost?.atAge80)}. Self-insurance ${results.selfInsureCapacity?.canSelfInsure ? "is feasible" : `shows a shortfall of ${fmt(Math.abs(results.selfInsureCapacity?.surplusOrDeficit || 0))}`}.`}
                metrics={[
                  { label: "Probability of Need", value: `${(results.probabilityOfNeed * 100).toFixed(0)}%`, tooltip: "Statistical likelihood of needing some form of long-term care based on age and gender.", status: results.probabilityOfNeed > 0.5 ? "warning" : "good" },
                  { label: "Cost at 80", value: fmt(results.projectedLTCCost?.atAge80), tooltip: "Projected annual cost of long-term care at age 80, accounting for healthcare inflation.", status: "warning" },
                  { label: "Self-Insure", value: results.selfInsureCapacity?.canSelfInsure ? "Feasible" : "Shortfall", tooltip: "Whether liquid assets can cover projected LTC costs without insurance.", status: results.selfInsureCapacity?.canSelfInsure ? "good" : "critical" },
                ]}
                insights={[
                  `${results.scenarios?.length || 0} care scenarios modeled from home care to facility care`,
                  `Assets cover ${results.selfInsureCapacity?.yearsOfCoverage || 0} years of care costs`,
                ]}
                warnings={results.notes || []}
                actions={[
                  { label: "Life Insurance", href: "/calculators/life-insurance-gap" },
                ]}
                inputs={{ clientAge, gender, healthStatus, liquidAssets, annualIncome, annualExpenses, existingLTCCoverage, spouseAge, spouseIncome, carePreference }}
                results={results}
                clientId={clientId && clientId !== "none" ? clientId : undefined}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
