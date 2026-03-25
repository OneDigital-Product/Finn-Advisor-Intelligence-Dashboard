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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, ArrowLeft, DollarSign, Percent, Info, AlertTriangle,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

function fmtPct(val: number): string {
  return `${(val * 100).toFixed(2)}%`;
}

export default function TaxBracketCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [grossIncome, setGrossIncome] = useState("");
  const [filingStatus, setFilingStatus] = useState("single");
  const [deductions, setDeductions] = useState("0");
  const [additionalIncome, setAdditionalIncome] = useState("0");
  const [stateRate, setStateRate] = useState("5");
  const [projectionYears, setProjectionYears] = useState("10");
  const [expectedIncomeGrowth, setExpectedIncomeGrowth] = useState("3");
  const [expectedBracketInflation, setExpectedBracketInflation] = useState("2");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/tax-bracket", {
        grossIncome: parseFloat(grossIncome) || 0,
        filingStatus,
        deductions: parseFloat(deductions) || 0,
        additionalIncome: parseFloat(additionalIncome) || 0,
        stateRate: parseFloat(stateRate) / 100,
        projectionYears: parseInt(projectionYears),
        expectedIncomeGrowth: parseFloat(expectedIncomeGrowth) / 100,
        expectedBracketInflation: parseFloat(expectedBracketInflation) / 100,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Tax bracket analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grossIncome) {
      toast({ title: "Missing required fields", description: "Please enter gross income.", variant: "destructive" });
      return;
    }
    calculateMutation.mutate();
  };

  const maxBracketAmount = results?.currentYear?.bracketBreakdown
    ? Math.max(...results.currentYear.bracketBreakdown.map((b: any) => b.taxableInBracket))
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/calculators")} data-testid="button-back-calculators">
          <ArrowLeft className="w-4 h-4 mr-1" /> Calculators
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tax Bracket Projection</h1>
          <p className="text-sm text-muted-foreground">Visualize current-year and forward brackets with income scenario analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Income Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalculate} className="space-y-4">
                <div>
                  <Label htmlFor="input-gross-income" className="text-xs">Gross Income * <InfoTip term="marginal_rate" /></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="200000" value={grossIncome} onChange={(e) => setGrossIncome(e.target.value)} className="pl-9" required id="input-gross-income" data-testid="input-gross-income" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-additional-income" className="text-xs">Additional Income (Capital Gains, etc.)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="0" value={additionalIncome} onChange={(e) => setAdditionalIncome(e.target.value)} className="pl-9" id="input-additional-income" data-testid="input-additional-income" />
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

                <div>
                  <Label htmlFor="input-deductions" className="text-xs">Itemized Deductions (0 = Standard)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} className="pl-9" id="input-deductions" data-testid="input-deductions" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-state-rate" className="text-xs">State Tax Rate (%)</Label>
                  <div className="relative">
                    <Input type="number" step="0.1" min="0" max="15" value={stateRate} onChange={(e) => setStateRate(e.target.value)} className="pr-8" id="input-state-rate" data-testid="input-state-rate" />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Projection Settings</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="input-income-growth" className="text-xs">Income Growth (%)</Label>
                      <div className="relative">
                        <Input type="number" step="0.5" min="-10" max="20" value={expectedIncomeGrowth} onChange={(e) => setExpectedIncomeGrowth(e.target.value)} className="pr-8" id="input-income-growth" data-testid="input-income-growth" />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="input-bracket-inflation" className="text-xs">Bracket Inflation (%)</Label>
                      <div className="relative">
                        <Input type="number" step="0.5" min="0" max="10" value={expectedBracketInflation} onChange={(e) => setExpectedBracketInflation(e.target.value)} className="pr-8" id="input-bracket-inflation" data-testid="input-bracket-inflation" />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="select-projection-years" className="text-xs">Projection Years</Label>
                    <Select value={projectionYears} onValueChange={setProjectionYears}>
                      <SelectTrigger id="select-projection-years" data-testid="select-projection-years">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Years</SelectItem>
                        <SelectItem value="10">10 Years</SelectItem>
                        <SelectItem value="15">15 Years</SelectItem>
                        <SelectItem value="20">20 Years</SelectItem>
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

                <Button type="submit" className="w-full" disabled={calculateMutation.isPending} data-testid="button-calculate">
                  {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Analyze Tax Brackets
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!results && !calculateMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1" data-testid="text-empty-results">Enter parameters to analyze</h3>
                <p className="text-sm text-muted-foreground">Fill in the form to visualize your tax brackets.</p>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Tax</p>
                    <p className="text-xl font-bold text-primary" data-testid="text-total-tax">{fmt(results.currentYear.totalTax)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Effective Rate</p>
                    <p className="text-xl font-bold" data-testid="text-effective-rate">{fmtPct(results.currentYear.effectiveRate)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Marginal Rate</p>
                    <p className="text-xl font-bold" data-testid="text-marginal-rate">{(results.currentYear.marginalRate * 100).toFixed(0)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Bracket Headroom</p>
                    <p className="text-xl font-bold" data-testid="text-headroom">{fmt(results.currentYear.bracketHeadroom)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Bracket Breakdown (Current Year)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {results.currentYear.bracketBreakdown?.map((b: any, i: number) => (
                    <div key={i} className="space-y-1" data-testid={`bracket-${i}`}>
                      <div className="flex justify-between text-sm">
                        <span className={`font-medium ${b.isCurrentBracket ? "text-primary" : ""}`}>
                          {(b.rate * 100).toFixed(0)}% Bracket
                          {b.isCurrentBracket && <span className="ml-2 text-xs text-primary">(Current)</span>}
                        </span>
                        <span className="font-mono">{fmt(b.taxInBracket)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={maxBracketAmount > 0 ? (b.taxableInBracket / maxBracketAmount) * 100 : 0}
                          className={`h-2 ${b.isCurrentBracket ? "[&>div]:bg-primary" : "[&>div]:bg-muted-foreground/30"}`}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(b.taxableInBracket)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Forward Projection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead className="text-right">Income</TableHead>
                          <TableHead className="text-right">Taxable</TableHead>
                          <TableHead className="text-right">Federal Tax</TableHead>
                          <TableHead className="text-right">Total Tax</TableHead>
                          <TableHead className="text-right">Effective</TableHead>
                          <TableHead className="text-right">Marginal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.projections?.map((proj: any) => (
                          <TableRow key={proj.year} data-testid={`row-projection-${proj.year}`}>
                            <TableCell className="font-medium">+{proj.year}</TableCell>
                            <TableCell className="text-right font-mono">{fmt(proj.grossIncome)}</TableCell>
                            <TableCell className="text-right font-mono">{fmt(proj.taxableIncome)}</TableCell>
                            <TableCell className="text-right font-mono">{fmt(proj.federalTax)}</TableCell>
                            <TableCell className="text-right font-mono">{fmt(proj.totalTax)}</TableCell>
                            <TableCell className="text-right">{fmtPct(proj.effectiveRate)}</TableCell>
                            <TableCell className="text-right">{(proj.marginalRate * 100).toFixed(0)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {results.notes && results.notes.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Notes
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
                calculatorName="Tax Bracket Projection"
                summary={`Total tax liability of ${fmt(results.currentYear.totalTax)} on ${fmt(parseFloat(grossIncome) || 0)} income (${fmtPct(results.currentYear.effectiveRate)} effective rate). ${fmt(results.currentYear.bracketHeadroom)} remaining in the ${(results.currentYear.marginalRate * 100).toFixed(0)}% bracket before moving up.`}
                metrics={[
                  { label: "Effective Rate", value: fmtPct(results.currentYear.effectiveRate), tooltip: "Your actual tax rate — total tax divided by gross income. Lower than marginal rate due to graduated brackets.", status: undefined },
                  { label: "Marginal Rate", value: `${(results.currentYear.marginalRate * 100).toFixed(0)}%`, tooltip: "Tax rate on your next dollar of income. Key for planning Roth conversions and income timing.", status: undefined },
                  { label: "Bracket Headroom", value: fmt(results.currentYear.bracketHeadroom), tooltip: "How much additional income fits in your current bracket before the next rate kicks in. Use for Roth conversion sizing.", status: results.currentYear.bracketHeadroom > 50000 ? "good" : "warning" },
                ]}
                insights={[
                  `Filing as ${filingStatus === "married_filing_jointly" ? "Married Filing Jointly" : "Single"}`,
                  `${projectionYears}-year projection shows income growth impact on brackets`,
                ]}
                warnings={results.notes || []}
                actions={[
                  { label: "Roth Conversion", href: "/calculators/roth-conversion" },
                ]}
                inputs={{ grossIncome, filingStatus, deductions, additionalIncome, stateRate, projectionYears, expectedIncomeGrowth, expectedBracketInflation }}
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
