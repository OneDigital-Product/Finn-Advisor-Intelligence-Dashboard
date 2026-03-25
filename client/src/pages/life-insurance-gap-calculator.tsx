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
import {
  Loader2, ArrowLeft, DollarSign, Info, AlertTriangle,
  Umbrella, CheckCircle, XCircle, ShieldAlert,
} from "lucide-react";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

export default function LifeInsuranceGapCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [annualIncome, setAnnualIncome] = useState("");
  const [spouseIncome, setSpouseIncome] = useState("0");
  const [dependents, setDependents] = useState("2");
  const [youngestDependentAge, setYoungestDependentAge] = useState("5");
  const [mortgageBalance, setMortgageBalance] = useState("");
  const [otherDebts, setOtherDebts] = useState("0");
  const [educationFundingGoal, setEducationFundingGoal] = useState("public");
  const [childrenNeedingEducation, setChildrenNeedingEducation] = useState("2");
  const [averageChildAge, setAverageChildAge] = useState("8");
  const [existingLifeInsurance, setExistingLifeInsurance] = useState("0");
  const [existingGroupCoverage, setExistingGroupCoverage] = useState("0");
  const [liquidSavings, setLiquidSavings] = useState("0");
  const [retirementAssets, setRetirementAssets] = useState("0");
  const [filingStatus, setFilingStatus] = useState("married_filing_jointly");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/life-insurance-gap", {
        annualIncome: parseFloat(annualIncome) || 0,
        spouseIncome: parseFloat(spouseIncome) || 0,
        dependents: parseInt(dependents),
        youngestDependentAge: parseInt(youngestDependentAge),
        mortgageBalance: parseFloat(mortgageBalance) || 0,
        otherDebts: parseFloat(otherDebts) || 0,
        educationFundingGoal,
        childrenNeedingEducation: parseInt(childrenNeedingEducation),
        averageChildAge: parseInt(averageChildAge),
        existingLifeInsurance: parseFloat(existingLifeInsurance) || 0,
        existingGroupCoverage: parseFloat(existingGroupCoverage) || 0,
        liquidSavings: parseFloat(liquidSavings) || 0,
        retirementAssets: parseFloat(retirementAssets) || 0,
        filingStatus,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Life insurance gap analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annualIncome) {
      toast({ title: "Missing required fields", description: "Please enter annual income.", variant: "destructive" });
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Life Insurance Gap Analysis</h1>
          <p className="text-sm text-muted-foreground">Calculate income replacement, estate liquidity, and education funding coverage needs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Household Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalculate} className="space-y-4">
                <div>
                  <Label htmlFor="input-annual-income" className="text-xs">Annual Income * <InfoTip term="life_insurance_gap" /></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="150000" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} className="pl-9" required id="input-annual-income" data-testid="input-annual-income" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-spouse-income" className="text-xs">Spouse Income</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="75000" value={spouseIncome} onChange={(e) => setSpouseIncome(e.target.value)} className="pl-9" id="input-spouse-income" data-testid="input-spouse-income" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="input-dependents" className="text-xs">Dependents</Label>
                    <Input type="number" min="0" max="20" value={dependents} onChange={(e) => setDependents(e.target.value)} id="input-dependents" data-testid="input-dependents" />
                  </div>
                  <div>
                    <Label htmlFor="input-youngest-age" className="text-xs">Youngest Dep. Age</Label>
                    <Input type="number" min="0" max="30" value={youngestDependentAge} onChange={(e) => setYoungestDependentAge(e.target.value)} id="input-youngest-age" data-testid="input-youngest-age" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-mortgage" className="text-xs">Mortgage Balance</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="350000" value={mortgageBalance} onChange={(e) => setMortgageBalance(e.target.value)} className="pl-9" id="input-mortgage" data-testid="input-mortgage" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-other-debts" className="text-xs">Other Debts</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="25000" value={otherDebts} onChange={(e) => setOtherDebts(e.target.value)} className="pl-9" id="input-other-debts" data-testid="input-other-debts" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="select-education" className="text-xs">Education Goal</Label>
                    <Select value={educationFundingGoal} onValueChange={setEducationFundingGoal}>
                      <SelectTrigger id="select-education" data-testid="select-education">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public University</SelectItem>
                        <SelectItem value="private">Private University</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="input-children-ed" className="text-xs">Children for Ed.</Label>
                    <Input type="number" min="0" max="20" value={childrenNeedingEducation} onChange={(e) => setChildrenNeedingEducation(e.target.value)} id="input-children-ed" data-testid="input-children-ed" />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Existing Coverage & Assets</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="input-existing-life" className="text-xs">Individual Life Ins.</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" placeholder="250000" value={existingLifeInsurance} onChange={(e) => setExistingLifeInsurance(e.target.value)} className="pl-9" id="input-existing-life" data-testid="input-existing-life" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="input-group-coverage" className="text-xs">Group Coverage</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" placeholder="150000" value={existingGroupCoverage} onChange={(e) => setExistingGroupCoverage(e.target.value)} className="pl-9" id="input-group-coverage" data-testid="input-group-coverage" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="input-liquid-savings" className="text-xs">Liquid Savings</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" placeholder="50000" value={liquidSavings} onChange={(e) => setLiquidSavings(e.target.value)} className="pl-9" id="input-liquid-savings" data-testid="input-liquid-savings" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="input-retirement-assets" className="text-xs">Retirement Assets</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" placeholder="200000" value={retirementAssets} onChange={(e) => setRetirementAssets(e.target.value)} className="pl-9" id="input-retirement-assets" data-testid="input-retirement-assets" />
                      </div>
                    </div>
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

                <Button type="submit" className="w-full" disabled={calculateMutation.isPending} data-testid="button-calculate">
                  {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Analyze Coverage Gap
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!results && !calculateMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Umbrella className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1" data-testid="text-empty-results">Enter household details to analyze</h3>
                <p className="text-sm text-muted-foreground">Fill in the details and click Analyze Coverage Gap to see recommendations.</p>
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
                    <p className="text-xs text-muted-foreground mb-1">Total Need</p>
                    <p className="text-xl font-bold text-primary" data-testid="text-total-need">{fmt(results.totalCoverageNeeded)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Existing Coverage</p>
                    <p className="text-xl font-bold" data-testid="text-existing-coverage">{fmt(results.existingCoverage)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Coverage Gap</p>
                    <p className={`text-xl font-bold ${results.coverageGap > 0 ? "text-red-600" : "text-green-600"}`} data-testid="text-coverage-gap">
                      {results.coverageGap > 0 ? fmt(results.coverageGap) : "Covered"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge variant={results.isAdequatelyCovered ? "secondary" : "destructive"} data-testid="text-coverage-status">
                      {results.isAdequatelyCovered ? "Adequate" : "Underinsured"}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" /> Coverage Needs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.needs?.map((need: any, idx: number) => (
                          <TableRow key={idx} data-testid={`row-need-${idx}`}>
                            <TableCell>
                              <p className="font-medium text-sm">{need.category}</p>
                              <p className="text-xs text-muted-foreground">{need.description}</p>
                            </TableCell>
                            <TableCell className="text-right font-mono">{fmt(need.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2">
                          <TableCell>Total Need</TableCell>
                          <TableCell className="text-right font-mono">{fmt(results.totalCoverageNeeded)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Existing Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.sources?.map((src: any, idx: number) => (
                          <TableRow key={idx} data-testid={`row-source-${idx}`}>
                            <TableCell className="text-sm">{src.source}</TableCell>
                            <TableCell className="text-right font-mono">{fmt(src.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2">
                          <TableCell>Total Resources</TableCell>
                          <TableCell className="text-right font-mono">{fmt(results.existingCoverage)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Income Replacement</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual Need</span>
                      <span className="font-semibold">{fmt(results.incomeReplacement.annualNeed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Years Needed</span>
                      <span className="font-semibold">{results.incomeReplacement.yearsNeeded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Present Value</span>
                      <span className="font-semibold">{fmt(results.incomeReplacement.presentValue)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Education Funding</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cost</span>
                      <span className="font-semibold">{fmt(results.educationFunding.totalCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per Child</span>
                      <span className="font-semibold">{fmt(results.educationFunding.perChild)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-semibold">{results.educationFunding.costType}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Estate Liquidity</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estate Size</span>
                      <span className="font-semibold">{fmt(results.estateLiquidity.estateSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxable Estate</span>
                      <span className="font-semibold">{fmt(results.estateLiquidity.taxableEstate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Estate Tax</span>
                      <span className="font-semibold">{fmt(results.estateLiquidity.estimatedEstateTax)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {!results.isAdequatelyCovered && results.recommendation && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Coverage Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Recommended Amount</p>
                        <p className="text-lg font-bold text-primary" data-testid="text-recommended-amount">{fmt(results.recommendation.coverageAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Policy Type</p>
                        <p className="font-semibold">{results.recommendation.coverageType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Term Length</p>
                        <p className="font-semibold">{results.recommendation.termLength} years</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Annual Premium</p>
                        <p className="font-semibold">{fmt(results.recommendation.estimatedAnnualPremium)}/yr</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{results.recommendation.rationale}</p>
                  </CardContent>
                </Card>
              )}

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
                calculatorName="Life Insurance Gap Analysis"
                summary={`Total coverage need of ${fmt(results.totalCoverageNeeded)} against ${fmt(results.existingCoverage)} existing coverage. ${results.isAdequatelyCovered ? "Client is adequately covered." : `Coverage gap of ${fmt(results.coverageGap)}. Recommends ${fmt(results.recommendation?.coverageAmount || 0)} in ${results.recommendation?.coverageType || "term"} coverage.`}`}
                metrics={[
                  { label: "Coverage Gap", value: fmt(results.coverageGap), tooltip: "Difference between total coverage needed and existing life insurance + group coverage.", status: results.coverageGap > 0 ? "critical" : "good" },
                  { label: "Total Need", value: fmt(results.totalCoverageNeeded), tooltip: "Sum of income replacement, debt payoff, education funding, and final expenses.", status: undefined },
                  { label: "Existing", value: fmt(results.existingCoverage), tooltip: "Combined value of personal life insurance, group coverage, and liquid assets earmarked for survivors.", status: undefined },
                ]}
                insights={results.isAdequatelyCovered
                  ? ["Current coverage meets or exceeds identified needs"]
                  : [
                    `Recommended: ${results.recommendation?.coverageType || "Term"} policy for ${results.recommendation?.termLength || 20} years`,
                    `Estimated premium: ${fmt(results.recommendation?.estimatedAnnualPremium || 0)}/year`,
                  ]}
                warnings={results.notes || []}
                actions={[
                  { label: "Estate Planning", href: "/estate-planning" },
                ]}
                inputs={{ annualIncome, spouseIncome, dependents, youngestDependentAge, mortgageBalance, otherDebts, educationFundingGoal, childrenNeedingEducation, averageChildAge, existingLifeInsurance, existingGroupCoverage, liquidSavings, retirementAssets, filingStatus }}
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
