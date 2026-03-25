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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, ArrowLeft, DollarSign, TrendingDown, TrendingUp, AlertTriangle,
  Info, CheckCircle2, AlertCircle, XCircle,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

function fmtPct(val: number): string {
  return `${val.toFixed(2)}%`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "sustainable") return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  if (status === "caution") return <AlertCircle className="w-5 h-5 text-amber-600" />;
  return <XCircle className="w-5 h-5 text-red-600" />;
}

function statusColor(status: string) {
  if (status === "sustainable") return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20";
  if (status === "caution") return "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20";
  return "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20";
}

export default function BudgetCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState("post_retirement");
  const [currentAge, setCurrentAge] = useState("65");
  const [retirementAge, setRetirementAge] = useState("65");
  const [portfolioBalance, setPortfolioBalance] = useState("");
  const [currentIncome, setCurrentIncome] = useState("");
  const [annualSavingsAmount, setAnnualSavingsAmount] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");

  const [socialSecurity, setSocialSecurity] = useState("");
  const [pension, setPension] = useState("");
  const [dividends, setDividends] = useState("");

  const [housing, setHousing] = useState("");
  const [utilities, setUtilities] = useState("");
  const [food, setFood] = useState("");
  const [transportation, setTransportation] = useState("");
  const [healthcare, setHealthcare] = useState("");
  const [insurance, setInsurance] = useState("");
  const [discretionary, setDiscretionary] = useState("");
  const [other, setOther] = useState("");

  const [projectionYears, setProjectionYears] = useState("30");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const totalExpenses = [housing, utilities, food, transportation, healthcare, insurance, discretionary, other]
    .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        mode,
        currentAge: parseInt(currentAge),
        expenses: {
          housing: parseFloat(housing) || 0,
          utilities: parseFloat(utilities) || 0,
          food: parseFloat(food) || 0,
          transportation: parseFloat(transportation) || 0,
          healthcare: parseFloat(healthcare) || 0,
          insurance: parseFloat(insurance) || 0,
          discretionary: parseFloat(discretionary) || 0,
          other: parseFloat(other) || 0,
        },
        projectionYears: parseInt(projectionYears),
        scenarios: {
          base: { growthRate: 0.07, inflationRate: 0.03 },
          optimistic: { growthRate: 0.09, inflationRate: 0.025 },
          conservative: { growthRate: 0.05, inflationRate: 0.04 },
        },
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      };

      if (mode === "pre_retirement") {
        body.retirementAge = parseInt(retirementAge);
        body.currentIncome = parseFloat(currentIncome) || 0;
        body.annualSavingsAmount = parseFloat(annualSavingsAmount) || 0;
        body.currentSavings = parseFloat(currentSavings) || 0;
      } else {
        body.portfolioBalance = parseFloat(portfolioBalance) || 0;
        body.retirementIncome = {
          socialSecurity: parseFloat(socialSecurity) || 0,
          pension: parseFloat(pension) || 0,
          dividends: parseFloat(dividends) || 0,
        };
      }

      const res = await apiRequest("POST", "/api/calculators/budget", body);
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Budget calculated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    calculateMutation.mutate();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/calculators")} data-testid="button-back-calculators">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Calculators
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Budget Calculator</h1>
          <p className="text-sm text-muted-foreground">Model retirement income vs. expenses across scenarios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Input Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalculate} className="space-y-4">
                <div>
                  <Label htmlFor="select-mode" className="text-xs">Mode</Label>
                  <Select value={mode} onValueChange={(v) => { setMode(v); setResults(null); }}>
                    <SelectTrigger id="select-mode" data-testid="select-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post_retirement">Post-Retirement</SelectItem>
                      <SelectItem value="pre_retirement">Pre-Retirement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="input-age" className="text-xs">Current Age <InfoTip term="inflation_rate" /></Label>
                  <Input type="number" min="18" max="120" value={currentAge} onChange={(e) => setCurrentAge(e.target.value)} required id="input-age" data-testid="input-age" />
                </div>

                {mode === "pre_retirement" && (
                  <>
                    <div>
                      <Label htmlFor="input-retirement-age" className="text-xs">Target Retirement Age</Label>
                      <Input type="number" min="50" max="80" value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)} required id="input-retirement-age" data-testid="input-retirement-age" />
                    </div>
                    <div>
                      <Label htmlFor="input-income" className="text-xs">Current Annual Income</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" value={currentIncome} onChange={(e) => setCurrentIncome(e.target.value)} className="pl-9" id="input-income" data-testid="input-income" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="input-savings" className="text-xs">Annual Savings Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" value={annualSavingsAmount} onChange={(e) => setAnnualSavingsAmount(e.target.value)} className="pl-9" id="input-savings" data-testid="input-savings" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="input-current-savings" className="text-xs">Current Savings Balance</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} className="pl-9" id="input-current-savings" data-testid="input-current-savings" />
                      </div>
                    </div>
                  </>
                )}

                {mode === "post_retirement" && (
                  <>
                    <div>
                      <Label htmlFor="input-portfolio" className="text-xs">Portfolio Balance</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" placeholder="2500000" value={portfolioBalance} onChange={(e) => setPortfolioBalance(e.target.value)} className="pl-9" required id="input-portfolio" data-testid="input-portfolio" />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Income Sources (Annual)</p>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="input-ss" className="text-xs">Social Security</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="number" step="100" min="0" placeholder="30000" value={socialSecurity} onChange={(e) => setSocialSecurity(e.target.value)} className="pl-9" id="input-ss" data-testid="input-ss" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="input-pension" className="text-xs">Pension</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="number" step="100" min="0" placeholder="25000" value={pension} onChange={(e) => setPension(e.target.value)} className="pl-9" id="input-pension" data-testid="input-pension" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="input-dividends" className="text-xs">Dividends / Other</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="number" step="100" min="0" placeholder="15000" value={dividends} onChange={(e) => setDividends(e.target.value)} className="pl-9" id="input-dividends" data-testid="input-dividends" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Annual Expenses</p>
                  <div className="space-y-3">
                    {[
                      { label: "Housing", val: housing, set: setHousing, id: "housing", ph: "24000" },
                      { label: "Utilities", val: utilities, set: setUtilities, id: "utilities", ph: "6000" },
                      { label: "Food & Groceries", val: food, set: setFood, id: "food", ph: "9600" },
                      { label: "Transportation", val: transportation, set: setTransportation, id: "transportation", ph: "12000" },
                      { label: "Healthcare", val: healthcare, set: setHealthcare, id: "healthcare", ph: "8000" },
                      { label: "Insurance", val: insurance, set: setInsurance, id: "insurance", ph: "6000" },
                      { label: "Discretionary", val: discretionary, set: setDiscretionary, id: "discretionary", ph: "18000" },
                      { label: "Other", val: other, set: setOther, id: "other", ph: "6000" },
                    ].map((field) => (
                      <div key={field.id}>
                        <Label htmlFor={`input-expense-${field.id}`} className="text-xs">{field.label}</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="100"
                            min="0"
                            placeholder={field.ph}
                            value={field.val}
                            onChange={(e) => field.set(e.target.value)}
                            className="pl-9"
                            id={`input-expense-${field.id}`}
                            data-testid={`input-expense-${field.id}`}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1 px-1">
                      <span className="text-xs text-muted-foreground">Total Expenses</span>
                      <span className="text-sm font-semibold" data-testid="text-total-expenses">{fmt(totalExpenses)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
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
                  <div>
                    <Label htmlFor="select-projection-years" className="text-xs">Projection Years</Label>
                    <Select value={projectionYears} onValueChange={setProjectionYears}>
                      <SelectTrigger id="select-projection-years" data-testid="select-projection-years">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 Years</SelectItem>
                        <SelectItem value="20">20 Years</SelectItem>
                        <SelectItem value="30">30 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={calculateMutation.isPending} data-testid="button-calculate">
                  {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Calculate Budget
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!results && !calculateMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingDown className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1" data-testid="text-empty-results">Enter parameters to calculate</h3>
                <p className="text-sm text-muted-foreground">Fill in the form and click Calculate Budget to see results.</p>
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
            <Tabs defaultValue="base" className="space-y-4">
              <TabsList data-testid="tabs-scenarios">
                <TabsTrigger value="base" data-testid="tab-base">Base</TabsTrigger>
                <TabsTrigger value="optimistic" data-testid="tab-optimistic">Optimistic</TabsTrigger>
                <TabsTrigger value="conservative" data-testid="tab-conservative">Conservative</TabsTrigger>
              </TabsList>

              {Object.entries(results.summaryByScenario || {}).map(([scenarioName, summary]: [string, any]) => (
                <TabsContent key={scenarioName} value={scenarioName} className="space-y-4">
                  {results.mode === "post_retirement" && (
                    <>
                      <Card className={statusColor(summary.status)}>
                        <CardContent className="pt-5 pb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <StatusIcon status={summary.status} />
                            <span className="text-sm font-medium" data-testid={`text-recommendation-${scenarioName}`}>{summary.recommendation}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Annual Expenses</p>
                              <p className="text-lg font-bold" data-testid={`text-expenses-${scenarioName}`}>{fmt(summary.totalAnnualExpenses)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Fixed Income</p>
                              <p className="text-lg font-bold" data-testid={`text-income-${scenarioName}`}>{fmt(summary.totalAnnualIncome)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Required Withdrawal</p>
                              <p className="text-lg font-bold" data-testid={`text-withdrawal-${scenarioName}`}>{fmt(summary.requiredPortfolioWithdrawal)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Safe Withdrawal Rate</p>
                              <p className="text-lg font-bold" data-testid={`text-swr-${scenarioName}`}>{fmtPct(summary.safeWithdrawalRate)}</p>
                            </div>
                          </div>
                          {summary.yearsUntilDepletion !== null && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm">
                                <AlertTriangle className="inline w-4 h-4 text-amber-500 mr-1" />
                                Account depletes in <span className="font-semibold">{summary.yearsUntilDepletion} years</span>
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{projectionYears}-Year Projection — {scenarioName.charAt(0).toUpperCase() + scenarioName.slice(1)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Year</TableHead>
                                  <TableHead>Age</TableHead>
                                  <TableHead className="text-right">Portfolio</TableHead>
                                  <TableHead className="text-right">Expenses</TableHead>
                                  <TableHead className="text-right">Withdrawal</TableHead>
                                  <TableHead className="text-right">End Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(results.projections?.[scenarioName] || []).map((proj: any) => (
                                  <TableRow key={proj.year} data-testid={`row-projection-${scenarioName}-${proj.year}`}>
                                    <TableCell className="font-medium">{proj.year}</TableCell>
                                    <TableCell>{proj.age}</TableCell>
                                    <TableCell className="text-right font-mono">{fmt(proj.portfolioBalance)}</TableCell>
                                    <TableCell className="text-right font-mono">{fmt(proj.annualExpenses)}</TableCell>
                                    <TableCell className="text-right font-mono">{fmt(proj.requiredWithdrawal)}</TableCell>
                                    <TableCell className="text-right font-mono">{fmt(proj.newBalance)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {results.mode === "pre_retirement" && (
                    <>
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-5 pb-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Projected Savings at Retirement</p>
                          <p className="text-3xl font-bold text-primary" data-testid={`text-savings-${scenarioName}`}>
                            {fmt(summary.accountBalanceAtEnd)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{summary.recommendation}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Savings Growth — {scenarioName.charAt(0).toUpperCase() + scenarioName.slice(1)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Year</TableHead>
                                  <TableHead>Age</TableHead>
                                  <TableHead className="text-right">Contribution</TableHead>
                                  <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(results.projections?.[scenarioName] || []).map((proj: any) => (
                                  <TableRow key={proj.year} data-testid={`row-projection-${scenarioName}-${proj.year}`}>
                                    <TableCell className="font-medium">{proj.year}</TableCell>
                                    <TableCell>{proj.age}</TableCell>
                                    <TableCell className="text-right font-mono">{fmt(proj.contribution)}</TableCell>
                                    <TableCell className="text-right font-mono">{fmt(proj.balance)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>
              ))}

              {results.expenseSummary?.categories?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.expenseSummary.categories.map((cat: any) => (
                        <div key={cat.category} className="flex items-center justify-between" data-testid={`expense-cat-${cat.category}`}>
                          <span className="text-sm">{cat.category}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%` }} />
                            </div>
                            <span className="text-sm font-mono w-20 text-right">{fmt(cat.amount)}</span>
                            <span className="text-xs text-muted-foreground w-12 text-right">{cat.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.notes?.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600" />
                      Assumptions & Notes
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

              <div className="mt-6">
                <CalculatorInterpretation
                  calculatorName="Budget Calculator"
                  summary={mode === "post_retirement"
                    ? `Annual expenses of ${fmt(totalExpenses)} against portfolio of ${fmt(parseFloat(portfolioBalance) || 0)}. ${(Object.values(results.summaryByScenario || {})[0] as any)?.status === "sustainable" ? "Budget appears sustainable under base scenario." : "Budget sustainability needs attention."}`
                    : `Projecting savings accumulation from age ${currentAge} to ${retirementAge} with ${fmt(parseFloat(annualSavingsAmount) || 0)}/year contributions.`}
                  metrics={mode === "post_retirement" ? [
                    { label: "Annual Expenses", value: fmt(totalExpenses), tooltip: "Total annual spending across all categories.", status: undefined },
                    { label: "Withdrawal Rate", value: `${((Object.values(results.summaryByScenario || {})[0] as any)?.safeWithdrawalRate || 0).toFixed(2)}%`, tooltip: "Portfolio withdrawal rate needed to cover expense shortfall. Under 4% is generally considered safe.", status: ((Object.values(results.summaryByScenario || {})[0] as any)?.safeWithdrawalRate || 0) <= 4 ? "good" : "warning" },
                  ] : [
                    { label: "Projected Savings", value: fmt((Object.values(results.summaryByScenario || {})[0] as any)?.accountBalanceAtEnd || 0), tooltip: "Estimated savings balance at your target retirement age under the base scenario.", status: "good" },
                  ]}
                  insights={[
                    `${projectionYears}-year projection across base, optimistic, and conservative scenarios`,
                    mode === "post_retirement" ? "Income sources offset expenses before portfolio withdrawals" : "Growth compounds on both savings and contributions",
                  ]}
                  warnings={results.notes || []}
                  actions={[
                    { label: "Monte Carlo", href: "/calculators/monte-carlo" },
                  ]}
                  inputs={{ mode, currentAge, retirementAge, portfolioBalance, currentIncome, annualSavingsAmount, currentSavings, socialSecurity, pension, dividends, housing, utilities, food, transportation, healthcare, insurance, discretionary, other, projectionYears }}
                  results={results}
                  clientId={clientId && clientId !== "none" ? clientId : undefined}
                />
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
