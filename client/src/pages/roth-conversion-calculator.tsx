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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, ArrowLeft, DollarSign, Percent, Info, AlertTriangle, TrendingUp, TrendingDown, Target, Calculator,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

function fmtPct(val: number): string {
  return `${(val * 100).toFixed(2)}%`;
}

export default function RothConversionCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentAge, setCurrentAge] = useState("55");
  const [retirementAge, setRetirementAge] = useState("67");
  const [traditionalIRABalance, setTraditionalIRABalance] = useState("");
  const [rothIRABalance, setRothIRABalance] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [filingStatus, setFilingStatus] = useState("single");
  const [stateRate, setStateRate] = useState("5");
  const [expectedRetirementRate, setExpectedRetirementRate] = useState("15");
  const [conversionAmount, setConversionAmount] = useState("");
  const [projectionYears, setProjectionYears] = useState("20");
  const [expectedGrowthRate, setExpectedGrowthRate] = useState("7");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const [multiYearAmount, setMultiYearAmount] = useState("");
  const [conversionYears, setConversionYears] = useState("5");
  const [multiYearResults, setMultiYearResults] = useState<any>(null);

  const [bracketResults, setBracketResults] = useState<any>(null);

  const [activeTab, setActiveTab] = useState("single");

  const { clients } = useAllClients();

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/roth-conversion", {
        currentAge: parseInt(currentAge),
        retirementAge: parseInt(retirementAge),
        traditionalIRABalance: parseFloat(traditionalIRABalance) || 0,
        rothIRABalance: parseFloat(rothIRABalance) || 0,
        annualIncome: parseFloat(annualIncome) || 0,
        filingStatus,
        stateRate: parseFloat(stateRate) / 100,
        expectedRetirementRate: parseFloat(expectedRetirementRate) / 100,
        conversionAmount: parseFloat(conversionAmount) || 0,
        projectionYears: parseInt(projectionYears),
        expectedGrowthRate: parseFloat(expectedGrowthRate) / 100,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Roth conversion analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const multiYearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/roth/multi-year", {
        currentAge: parseInt(currentAge),
        retirementAge: parseInt(retirementAge),
        traditionalIRABalance: parseFloat(traditionalIRABalance) || 0,
        rothIRABalance: parseFloat(rothIRABalance) || 0,
        annualIncome: parseFloat(annualIncome) || 0,
        filingStatus,
        stateRate: parseFloat(stateRate) / 100,
        expectedRetirementRate: parseFloat(expectedRetirementRate) / 100,
        annualConversionAmount: parseFloat(multiYearAmount) || 0,
        conversionYears: parseInt(conversionYears),
        projectionYears: parseInt(projectionYears),
        expectedGrowthRate: parseFloat(expectedGrowthRate) / 100,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setMultiYearResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Multi-year conversion analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const bracketMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/roth/bracket-optimizer", {
        annualIncome: parseFloat(annualIncome) || 0,
        filingStatus,
        stateRate: parseFloat(stateRate) / 100,
        traditionalIRABalance: parseFloat(traditionalIRABalance) || 0,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setBracketResults(data.results);
      toast({ title: "Bracket optimization complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Optimization failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traditionalIRABalance || !annualIncome || !conversionAmount) {
      toast({ title: "Missing required fields", description: "Please fill in IRA balance, income, and conversion amount.", variant: "destructive" });
      return;
    }
    calculateMutation.mutate();
  };

  const handleMultiYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traditionalIRABalance || !annualIncome || !multiYearAmount) {
      toast({ title: "Missing required fields", description: "Please fill in IRA balance, income, and annual conversion amount.", variant: "destructive" });
      return;
    }
    multiYearMutation.mutate();
  };

  const handleBracketOptimize = () => {
    if (!annualIncome || !traditionalIRABalance) {
      toast({ title: "Missing required fields", description: "Please fill in income and IRA balance first.", variant: "destructive" });
      return;
    }
    bracketMutation.mutate();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/calculators")} data-testid="button-back-calculators">
          <ArrowLeft className="w-4 h-4 mr-1" /> Calculators
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Roth Conversion Optimizer</h1>
          <p className="text-sm text-muted-foreground">Model multi-year Roth conversions with bracket impact and breakeven analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Conversion Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="input-current-age" className="text-xs">Current Age</Label>
                    <Input type="number" min="18" max="100" value={currentAge} onChange={(e) => setCurrentAge(e.target.value)} required id="input-current-age" data-testid="input-current-age" />
                  </div>
                  <div>
                    <Label htmlFor="input-retirement-age" className="text-xs">Retirement Age</Label>
                    <Input type="number" min="50" max="100" value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)} required id="input-retirement-age" data-testid="input-retirement-age" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-trad-balance" className="text-xs">Traditional IRA Balance * <InfoTip term="roth_conversion" /></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="500000" value={traditionalIRABalance} onChange={(e) => setTraditionalIRABalance(e.target.value)} className="pl-9" required id="input-trad-balance" data-testid="input-trad-balance" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-roth-balance" className="text-xs">Roth IRA Balance</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="100000" value={rothIRABalance} onChange={(e) => setRothIRABalance(e.target.value)} className="pl-9" id="input-roth-balance" data-testid="input-roth-balance" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-annual-income" className="text-xs">Annual Income *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="150000" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} className="pl-9" required id="input-annual-income" data-testid="input-annual-income" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="select-filing-status" className="text-xs">Filing Status</Label>
                  <Select value={filingStatus} onValueChange={setFilingStatus}>
                    <SelectTrigger id="select-filing-status" data-testid="select-filing-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="input-state-rate" className="text-xs">State Tax Rate (%)</Label>
                    <div className="relative">
                      <Input type="number" step="0.1" min="0" max="15" value={stateRate} onChange={(e) => setStateRate(e.target.value)} className="pr-8" id="input-state-rate" data-testid="input-state-rate" />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="input-retirement-rate" className="text-xs">Retirement Tax Rate (%)</Label>
                    <div className="relative">
                      <Input type="number" step="0.1" min="0" max="50" value={expectedRetirementRate} onChange={(e) => setExpectedRetirementRate(e.target.value)} className="pr-8" id="input-retirement-rate" data-testid="input-retirement-rate" />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label htmlFor="input-growth-rate" className="text-xs">Expected Growth Rate (%)</Label>
                    <div className="relative">
                      <Input type="number" step="0.5" min="-10" max="20" value={expectedGrowthRate} onChange={(e) => setExpectedGrowthRate(e.target.value)} className="pr-8" id="input-growth-rate" data-testid="input-growth-rate" />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="select-projection-years" className="text-xs">Projection Years</Label>
                    <Select value={projectionYears} onValueChange={setProjectionYears}>
                      <SelectTrigger id="select-projection-years" data-testid="select-projection-years">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 Years</SelectItem>
                        <SelectItem value="15">15 Years</SelectItem>
                        <SelectItem value="20">20 Years</SelectItem>
                        <SelectItem value="30">30 Years</SelectItem>
                      </SelectContent>
                    </Select>
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
              </div>
            </CardContent>
          </Card>

          {annualIncome && traditionalIRABalance && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" /> Bracket Optimizer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Find the max conversion that keeps you in your current tax bracket.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleBracketOptimize}
                  disabled={bracketMutation.isPending}
                  data-testid="button-bracket-optimize"
                >
                  {bracketMutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  <Calculator className="w-3 h-3 mr-2" /> Optimize
                </Button>
                {bracketResults && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Current Bracket</p>
                        <p className="font-semibold" data-testid="text-current-bracket">{(bracketResults.currentBracketRate * 100).toFixed(0)}%</p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Next Bracket</p>
                        <p className="font-semibold" data-testid="text-next-bracket">{(bracketResults.nextBracketRate * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="p-2 bg-background rounded text-xs">
                      <p className="text-muted-foreground">Max Conversion in Bracket</p>
                      <p className="font-bold text-blue-600 text-sm" data-testid="text-max-conversion">{fmt(bracketResults.maxConversionInBracket)}</p>
                      <p className="text-muted-foreground mt-1">Tax: {fmt(bracketResults.taxOnMaxConversion)}</p>
                    </div>
                    <div className="p-2 bg-background rounded text-xs">
                      <p className="text-muted-foreground">Space in Bracket</p>
                      <p className="font-semibold" data-testid="text-bracket-space">{fmt(bracketResults.spaceInCurrentBracket)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" data-testid="tab-single-conversion">Single Conversion</TabsTrigger>
              <TabsTrigger value="multi-year" data-testid="tab-multi-year">Multi-Year Plan</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 mt-4">
              <form onSubmit={handleCalculate} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label htmlFor="input-conversion-amount" className="text-xs">Conversion Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="50000" value={conversionAmount} onChange={(e) => setConversionAmount(e.target.value)} className="pl-9" required id="input-conversion-amount" data-testid="input-conversion-amount" />
                  </div>
                </div>
                <Button type="submit" disabled={calculateMutation.isPending} data-testid="button-calculate">
                  {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Analyze
                </Button>
              </form>

              {!results && !calculateMutation.isPending && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-1" data-testid="text-empty-results">Enter parameters to analyze</h3>
                    <p className="text-sm text-muted-foreground">Fill in the form and click Analyze to see results.</p>
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
                        <p className="text-xs text-muted-foreground mb-1">Tax on Conversion</p>
                        <p className="text-xl font-bold text-primary" data-testid="text-tax-on-conversion">{fmt(results.taxOnConversion)}</p>
                        <p className="text-xs text-muted-foreground">Effective: {fmtPct(results.effectiveTaxRate)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Breakeven</p>
                        <p className="text-xl font-bold" data-testid="text-breakeven">{results.breakevenYears} yrs</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Net Benefit</p>
                        <p className={`text-xl font-bold ${results.netBenefit >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-net-benefit">
                          {fmt(results.netBenefit)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Bracket Impact</p>
                        <p className="text-xl font-bold" data-testid="text-bracket-impact">
                          {(results.marginalBracketBeforeConversion * 100).toFixed(0)}% → {(results.marginalBracketAfterConversion * 100).toFixed(0)}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {results.irmaaWarning?.triggered && (
                    <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-semibold text-red-600">IRMAA Medicare Premium Impact</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Monthly Surcharge</p>
                            <p className="font-semibold" data-testid="text-irmaa-surcharge">${results.irmaaWarning.monthlySurcharge.toFixed(2)}/mo</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Annual Cost</p>
                            <p className="font-semibold text-red-600" data-testid="text-irmaa-annual">{fmt(results.irmaaWarning.annualCost)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tier</p>
                            <p className="font-semibold">{results.irmaaWarning.tier}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {results.proRataAnalysis && (
                    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Info className="w-4 h-4 text-purple-600" /> Pro-Rata Rule Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Taxable Portion</p>
                            <p className="font-semibold" data-testid="text-prorata-taxable">{(results.proRataAnalysis.taxablePercentage * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tax-Free Portion</p>
                            <p className="font-semibold text-green-600" data-testid="text-prorata-free">{(results.proRataAnalysis.taxFreePercentage * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Taxable Amount</p>
                            <p className="font-semibold">{fmt(results.proRataAnalysis.taxableConversionAmount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tax-Free Amount</p>
                            <p className="font-semibold text-green-600">{fmt(results.proRataAnalysis.taxFreeConversionAmount)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Bracket Impact Detail</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Income Before</p>
                          <p className="font-semibold" data-testid="text-income-before">{fmt(results.bracketImpact.incomeBeforeConversion)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Income After</p>
                          <p className="font-semibold" data-testid="text-income-after">{fmt(results.bracketImpact.incomeAfterConversion)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tax Before</p>
                          <p className="font-semibold">{fmt(results.bracketImpact.taxBeforeConversion)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tax After</p>
                          <p className="font-semibold">{fmt(results.bracketImpact.taxAfterConversion)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Additional Tax</p>
                          <p className="font-semibold text-red-600">{fmt(results.bracketImpact.additionalTax)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Multi-Year Projection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead>Age</TableHead>
                              <TableHead className="text-right">Traditional</TableHead>
                              <TableHead className="text-right">Roth</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.projections?.map((proj: any) => (
                              <TableRow key={proj.year} data-testid={`row-projection-${proj.year}`}>
                                <TableCell className="font-medium">{proj.year}</TableCell>
                                <TableCell>{proj.age}</TableCell>
                                <TableCell className="text-right font-mono">{fmt(proj.traditionalBalance)}</TableCell>
                                <TableCell className="text-right font-mono">{fmt(proj.rothBalance)}</TableCell>
                                <TableCell className="text-right font-mono">{fmt(proj.totalBalance)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">End-of-Period Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-md bg-muted/40 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Without Conversion (After Tax)</p>
                          <p className="text-lg font-bold" data-testid="text-no-conversion">{fmt(results.noConversionEndBalance)}</p>
                        </div>
                        <div className="p-4 rounded-md bg-primary/5 border-primary/20 border text-center">
                          <p className="text-xs text-muted-foreground mb-1">With Conversion (After Tax)</p>
                          <p className="text-lg font-bold text-primary" data-testid="text-with-conversion">{fmt(results.withConversionEndBalance)}</p>
                        </div>
                        <div className="p-4 rounded-md bg-muted/40 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Net Benefit</p>
                          <p className={`text-lg font-bold flex items-center justify-center gap-1 ${results.netBenefit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {results.netBenefit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {fmt(results.netBenefit)}
                          </p>
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
                    calculatorName="Roth Conversion Analyzer"
                    summary={`Converting ${fmt(parseFloat(conversionAmount) || 0)} results in a ${results.netBenefit >= 0 ? "net benefit" : "net cost"} of ${fmt(Math.abs(results.netBenefit))} over ${projectionYears} years. After-tax portfolio value ${results.netBenefit >= 0 ? "increases" : "decreases"} with conversion.`}
                    metrics={[
                      { label: "Conversion Tax", value: fmt(results.taxOnConversion || 0), tooltip: "Upfront tax cost of converting Traditional IRA to Roth. Paid from non-retirement funds ideally.", status: "warning" },
                      { label: "Net Benefit", value: fmt(results.netBenefit), tooltip: "After-tax value difference between converting and not converting over the projection period.", status: results.netBenefit >= 0 ? "good" : "critical" },
                      { label: "Break-Even Year", value: results.breakevenYears ? `Year ${results.breakevenYears}` : "N/A", tooltip: "The year when the conversion starts producing positive net value vs. keeping Traditional IRA.", status: results.breakevenYears ? "good" : undefined },
                    ]}
                    insights={[
                      `Without conversion: ${fmt(results.noConversionEndBalance)} after-tax balance`,
                      `With conversion: ${fmt(results.withConversionEndBalance)} after-tax balance`,
                    ]}
                    warnings={results.notes || []}
                    actions={[
                      { label: "View Tax Strategy", href: "/tax-strategy" },
                    ]}
                    inputs={{ currentAge, retirementAge, traditionalIRABalance, rothIRABalance, annualIncome, filingStatus, stateRate, expectedRetirementRate, conversionAmount, projectionYears, expectedGrowthRate }}
                    results={results}
                    clientId={clientId && clientId !== "none" ? clientId : undefined}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="multi-year" className="space-y-4 mt-4">
              <form onSubmit={handleMultiYear} className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="input-multi-year-amount" className="text-xs">Annual Conversion *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="50000" value={multiYearAmount} onChange={(e) => setMultiYearAmount(e.target.value)} className="pl-9" required id="input-multi-year-amount" data-testid="input-multi-year-amount" />
                  </div>
                </div>
                <div className="w-32">
                  <Label htmlFor="input-conversion-years" className="text-xs">Years</Label>
                  <Select value={conversionYears} onValueChange={setConversionYears}>
                    <SelectTrigger id="input-conversion-years" data-testid="select-conversion-years">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,15,20].map(y => (
                        <SelectItem key={y} value={String(y)}>{y} yr{y > 1 ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={multiYearMutation.isPending} data-testid="button-multi-year">
                  {multiYearMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Plan
                </Button>
              </form>

              {!multiYearResults && !multiYearMutation.isPending && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-1" data-testid="text-empty-multi-year">Plan a multi-year conversion strategy</h3>
                    <p className="text-sm text-muted-foreground">Set an annual conversion amount and number of years to model a phased strategy.</p>
                  </CardContent>
                </Card>
              )}

              {multiYearMutation.isPending && (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              )}

              {multiYearResults && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total Converted</p>
                        <p className="text-xl font-bold text-primary" data-testid="text-total-converted">{fmt(multiYearResults.totalConverted)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total Tax Paid</p>
                        <p className="text-xl font-bold" data-testid="text-total-tax">{fmt(multiYearResults.totalTaxPaid)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Avg Effective Rate</p>
                        <p className="text-xl font-bold" data-testid="text-avg-rate">{fmtPct(multiYearResults.averageEffectiveTaxRate)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Net Benefit</p>
                        <p className={`text-xl font-bold ${multiYearResults.netBenefit >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-multi-year-benefit">
                          {fmt(multiYearResults.netBenefit)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Year-by-Year Conversion Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead>Age</TableHead>
                              <TableHead className="text-right">Conversion</TableHead>
                              <TableHead className="text-right">Tax</TableHead>
                              <TableHead className="text-right">Eff. Rate</TableHead>
                              <TableHead className="text-right">Marginal</TableHead>
                              <TableHead className="text-right">Trad. Balance</TableHead>
                              <TableHead className="text-right">Roth Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {multiYearResults.yearlyConversions?.map((row: any) => (
                              <TableRow key={row.year} data-testid={`row-multi-year-${row.year}`}>
                                <TableCell className="font-medium">{row.year}</TableCell>
                                <TableCell>{row.age}</TableCell>
                                <TableCell className="text-right font-mono">{fmt(row.conversionAmount)}</TableCell>
                                <TableCell className="text-right font-mono text-red-600">{fmt(row.taxOnConversion)}</TableCell>
                                <TableCell className="text-right">{fmtPct(row.effectiveTaxRate)}</TableCell>
                                <TableCell className="text-right">{(row.marginalRate * 100).toFixed(0)}%</TableCell>
                                <TableCell className="text-right font-mono">{fmt(row.traditionalBalance)}</TableCell>
                                <TableCell className="text-right font-mono">{fmt(row.rothBalance)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">End-of-Period Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-md bg-muted/40 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Without Conversion (After Tax)</p>
                          <p className="text-lg font-bold" data-testid="text-multi-no-conv">{fmt(multiYearResults.noConversionEndBalance)}</p>
                        </div>
                        <div className="p-4 rounded-md bg-primary/5 border-primary/20 border text-center">
                          <p className="text-xs text-muted-foreground mb-1">With Multi-Year Conversion</p>
                          <p className="text-lg font-bold text-primary" data-testid="text-multi-with-conv">{fmt(multiYearResults.finalTotalBalance)}</p>
                        </div>
                        <div className="p-4 rounded-md bg-muted/40 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Net Benefit</p>
                          <p className={`text-lg font-bold flex items-center justify-center gap-1 ${multiYearResults.netBenefit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {multiYearResults.netBenefit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {fmt(multiYearResults.netBenefit)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {multiYearResults.notes && multiYearResults.notes.length > 0 && (
                    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" /> Analysis Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {multiYearResults.notes.map((note: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`note-multi-${idx}`}>
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
