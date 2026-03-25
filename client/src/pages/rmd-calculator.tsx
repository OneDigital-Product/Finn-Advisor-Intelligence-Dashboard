import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  Loader2, ArrowLeft, AlertTriangle, Info, DollarSign, Percent, Clock, Plus, X, ArrowRightLeft,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency as _fc } from "@/lib/format";
const formatCurrency = (v: number) => _fc(v, { abbreviated: false });

interface AccountEntry {
  id: number;
  name: string;
  type: string;
  balance: string;
}

export default function RMDCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [accountHolderDOB, setAccountHolderDOB] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [beneficiaryDOB, setBeneficiaryDOB] = useState("");
  const [beneficiaryRelationship, setBeneficiaryRelationship] = useState("none");
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));
  const [assumedGrowthRate, setAssumedGrowthRate] = useState("7");
  const [inheritanceStatus, setInheritanceStatus] = useState("original_owner");
  const [projectionYears, setProjectionYears] = useState("10");
  const [clientId, setClientId] = useState("");
  const [qcdAmount, setQcdAmount] = useState("");
  const [qcdAnnualIncrease, setQcdAnnualIncrease] = useState("0");
  const [marginalTaxRate, setMarginalTaxRate] = useState("24");

  const [results, setResults] = useState<any>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("standard");

  const [accounts, setAccounts] = useState<AccountEntry[]>([
    { id: 1, name: "Traditional IRA", type: "traditional_ira", balance: "" },
  ]);
  const [aggregatedResults, setAggregatedResults] = useState<any>(null);

  const [strategyResults, setStrategyResults] = useState<any>(null);
  const [strategyQcdAmount, setStrategyQcdAmount] = useState("10000");

  const { data: clientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw?.clients ?? []);

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/rmd", {
        accountHolderDOB,
        accountBalance: parseFloat(accountBalance),
        beneficiaryDOB: beneficiaryDOB || undefined,
        beneficiaryRelationship,
        taxYear: parseInt(taxYear),
        assumedGrowthRate: parseFloat(assumedGrowthRate) / 100,
        inheritanceStatus,
        projectionYears: parseInt(projectionYears),
        clientId: clientId && clientId !== "none" ? clientId : undefined,
        qcdAmount: qcdAmount ? parseFloat(qcdAmount) : undefined,
        qcdAnnualIncrease: qcdAnnualIncrease ? parseFloat(qcdAnnualIncrease) / 100 : undefined,
        marginalTaxRate: marginalTaxRate ? parseFloat(marginalTaxRate) / 100 : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      setLastRunId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "RMD calculated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const aggregatedMutation = useMutation({
    mutationFn: async () => {
      const validAccounts = accounts.filter(a => a.balance && parseFloat(a.balance) > 0);
      if (validAccounts.length === 0) throw new Error("Add at least one account with a balance");

      const res = await apiRequest("POST", "/api/calculators/rmd/aggregated", {
        accountHolderDOB,
        taxYear: parseInt(taxYear),
        accounts: validAccounts.map(a => ({
          name: a.name,
          type: a.type,
          balance: parseFloat(a.balance),
        })),
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setAggregatedResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Aggregated RMD calculated" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const strategyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/rmd/compare-strategies", {
        accountHolderDOB,
        accountBalance: parseFloat(accountBalance),
        taxYear: parseInt(taxYear),
        assumedGrowthRate: parseFloat(assumedGrowthRate) / 100,
        projectionYears: parseInt(projectionYears),
        qcdAmount: parseFloat(strategyQcdAmount) || 0,
        marginalTaxRate: parseFloat(marginalTaxRate) / 100,
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setStrategyResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Strategy comparison complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Comparison failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountHolderDOB || !accountBalance || !taxYear) {
      toast({ title: "Missing required fields", description: "Please fill in DOB, balance, and tax year.", variant: "destructive" });
      return;
    }
    calculateMutation.mutate();
  };

  const addAccount = () => {
    setAccounts(prev => [...prev, {
      id: Date.now(),
      name: "",
      type: "traditional_ira",
      balance: "",
    }]);
  };

  const removeAccount = (id: number) => {
    if (accounts.length <= 1) return;
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const updateAccount = (id: number, field: keyof AccountEntry, value: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/calculators")} data-testid="button-back-calculators">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Calculators
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">RMD Calculator</h1>
          <p className="text-sm text-muted-foreground">Calculate Required Minimum Distributions using IRS tables</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Input Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="input-dob" className="text-xs">Account Holder Date of Birth *</Label>
                  <Input type="date" value={accountHolderDOB} onChange={(e) => setAccountHolderDOB(e.target.value)} required id="input-dob" data-testid="input-dob" />
                </div>

                <div>
                  <Label htmlFor="input-balance" className="text-xs">Account Balance (Dec 31 Prior Year) * <InfoTip term="rmd" /></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="0.01" min="0" placeholder="500000" value={accountBalance} onChange={(e) => setAccountBalance(e.target.value)} className="pl-9" required id="input-balance" data-testid="input-balance" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-tax-year" className="text-xs">Tax Year *</Label>
                  <Input type="number" min="2000" max="2100" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} required id="input-tax-year" data-testid="input-tax-year" />
                </div>

                <div>
                  <Label htmlFor="select-client" className="text-xs">Client (Optional)</Label>
                  <div className="flex gap-2">
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
                    {clientId && clientId !== "none" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-[10px]"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/clients/${clientId}/rmd`, { credentials: "include" });
                            const json = await res.json();
                            if (json.rmdCalculations?.length > 0) {
                              const rmd = json.rmdCalculations[0];
                              if (rmd.priorYearEndBalance > 0) {
                                setAccountBalance(String(Math.round(rmd.priorYearEndBalance)));
                              }
                              toast({ title: "Orion RMD imported", description: `Pre-populated from ${json.rmdCalculations.length} retirement account(s).` });
                            } else {
                              toast({ title: "No Orion RMD data", description: "No retirement account RMD data found for this client.", variant: "destructive" });
                            }
                          } catch {
                            toast({ title: "Import failed", description: "Could not fetch Orion RMD data.", variant: "destructive" });
                          }
                        }}
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" />
                        Import Orion RMD
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Beneficiary Information</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="select-beneficiary" className="text-xs">Beneficiary Relationship</Label>
                      <Select value={beneficiaryRelationship} onValueChange={setBeneficiaryRelationship}>
                        <SelectTrigger id="select-beneficiary" data-testid="select-beneficiary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="non_spouse">Non-Spouse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {beneficiaryRelationship !== "none" && (
                      <div>
                        <Label htmlFor="input-beneficiary-dob" className="text-xs">Beneficiary Date of Birth</Label>
                        <Input type="date" value={beneficiaryDOB} onChange={(e) => setBeneficiaryDOB(e.target.value)} id="input-beneficiary-dob" data-testid="input-beneficiary-dob" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Projection Settings</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="input-growth-rate" className="text-xs">Assumed Growth Rate (%)</Label>
                      <div className="relative">
                        <Input type="number" step="0.1" min="0" max="20" value={assumedGrowthRate} onChange={(e) => setAssumedGrowthRate(e.target.value)} className="pr-8" id="input-growth-rate" data-testid="input-growth-rate" />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="select-inheritance" className="text-xs">Inheritance Status</Label>
                      <Select value={inheritanceStatus} onValueChange={setInheritanceStatus}>
                        <SelectTrigger id="select-inheritance" data-testid="select-inheritance">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="original_owner">Original Owner</SelectItem>
                          <SelectItem value="inherited_ira">Inherited IRA</SelectItem>
                          <SelectItem value="post_secure_act">Post-SECURE Act</SelectItem>
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
                          <SelectItem value="5">5 Years</SelectItem>
                          <SelectItem value="10">10 Years</SelectItem>
                          <SelectItem value="15">15 Years</SelectItem>
                          <SelectItem value="20">20 Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">QCD & Tax</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="input-qcd-amount" className="text-xs">Annual QCD Amount <InfoTip term="qcd" /></Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="100" min="0" max="105000" placeholder="10000" value={qcdAmount} onChange={(e) => setQcdAmount(e.target.value)} className="pl-9" id="input-qcd-amount" data-testid="input-qcd-amount" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="input-qcd-increase" className="text-xs">QCD Annual Increase (%)</Label>
                      <Input type="number" step="0.5" min="0" max="10" value={qcdAnnualIncrease} onChange={(e) => setQcdAnnualIncrease(e.target.value)} id="input-qcd-increase" data-testid="input-qcd-increase" />
                    </div>
                    <div>
                      <Label htmlFor="input-marginal-tax-rate" className="text-xs">Marginal Tax Rate (%) <InfoTip term="marginal_rate" /></Label>
                      <Input type="number" step="1" min="0" max="50" value={marginalTaxRate} onChange={(e) => setMarginalTaxRate(e.target.value)} id="input-marginal-tax-rate" data-testid="input-marginal-tax-rate" />
                    </div>
                  </div>
                </div>

                <Button type="button" className="w-full" disabled={calculateMutation.isPending} onClick={handleCalculate} data-testid="button-calculate">
                  {calculateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Calculate RMD
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standard" data-testid="tab-standard-rmd">Standard RMD</TabsTrigger>
              <TabsTrigger value="aggregated" data-testid="tab-aggregated-rmd">Multi-Account</TabsTrigger>
              <TabsTrigger value="strategy" data-testid="tab-strategy-comparison">QCD Strategy</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-4 mt-4">
              {!results && !calculateMutation.isPending && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <DollarSign className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-1" data-testid="text-empty-results">Enter parameters to calculate</h3>
                    <p className="text-sm text-muted-foreground">Fill in the form and click Calculate RMD to see results.</p>
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
                  <div className={`grid grid-cols-1 ${results.qcdSummary ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"} gap-4`}>
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Current Year RMD</p>
                        <p className="text-2xl font-bold text-primary" data-testid="text-current-rmd">{formatCurrency(results.currentYearRMD)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">RMD as % of Balance</p>
                        <p className="text-2xl font-bold" data-testid="text-rmd-pct">{results.rmdPercentage.toFixed(2)}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Life Expectancy Factor</p>
                        <p className="text-2xl font-bold" data-testid="text-life-factor">{results.lifeExpectancyFactor}</p>
                      </CardContent>
                    </Card>
                    {results.qcdSummary && (
                      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="pt-5 pb-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1">QCD Tax Savings</p>
                          <p className="text-2xl font-bold text-green-600" data-testid="text-qcd-savings">{formatCurrency(results.qcdSummary.totalTaxSavings)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(results.qcdSummary.totalQCDOverPeriod)} total QCD</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

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
                              <TableHead className="text-right">RMD Amount</TableHead>
                              {results.qcdSummary && <TableHead className="text-right">QCD</TableHead>}
                              {results.qcdSummary && <TableHead className="text-right">Taxable</TableHead>}
                              {results.qcdSummary && <TableHead className="text-right">Tax Saved</TableHead>}
                              <TableHead className="text-right">Projected Balance</TableHead>
                              <TableHead className="text-right">Withdrawal %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.projections?.map((proj: any) => (
                              <TableRow key={proj.year} data-testid={`row-projection-${proj.year}`}>
                                <TableCell className="font-medium">{proj.year}</TableCell>
                                <TableCell>{proj.age}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(proj.rmdAmount)}</TableCell>
                                {results.qcdSummary && (
                                  <TableCell className="text-right font-mono text-green-600">{proj.qcdAmount ? formatCurrency(proj.qcdAmount) : "$0"}</TableCell>
                                )}
                                {results.qcdSummary && (
                                  <TableCell className="text-right font-mono">{proj.taxableDistribution !== undefined ? formatCurrency(proj.taxableDistribution) : formatCurrency(proj.rmdAmount)}</TableCell>
                                )}
                                {results.qcdSummary && (
                                  <TableCell className="text-right font-mono text-green-600">{proj.taxSavingsFromQCD ? formatCurrency(proj.taxSavingsFromQCD) : "$0"}</TableCell>
                                )}
                                <TableCell className="text-right font-mono">{formatCurrency(proj.accountBalance)}</TableCell>
                                <TableCell className="text-right">{proj.withdrawalPercentage.toFixed(2)}%</TableCell>
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
                    calculatorName="RMD Calculator"
                    summary={`Required minimum distribution of ${results.currentYearRMD ? formatCurrency(results.currentYearRMD) : "N/A"} based on a ${formatCurrency(parseFloat(accountBalance) || 0)} account balance. ${results.qcdSummary ? `QCD strategy could save ${formatCurrency(results.qcdSummary.totalTaxSavings || 0)} in taxes.` : ""}`}
                    metrics={[
                      { label: "Current RMD", value: results.currentYearRMD ? formatCurrency(results.currentYearRMD) : "N/A", tooltip: "The required minimum distribution you must take this year to avoid the 25% penalty.", status: "good" },
                      { label: "Distribution Factor", value: results.lifeExpectancyFactor?.toFixed(1) || "N/A", tooltip: "IRS life expectancy factor used to calculate your RMD. Lower = higher required distribution.", status: undefined },
                      ...(results.qcdSummary ? [{ label: "QCD Tax Savings", value: formatCurrency(results.qcdSummary.totalTaxSavings || 0), tooltip: "Total projected tax savings from qualified charitable distributions over the projection period.", status: "good" as const }] : []),
                    ]}
                    insights={[
                      `Distribution percentage is ${results.projections?.[0]?.withdrawalPercentage?.toFixed(2) || "N/A"}% of portfolio`,
                      ...(results.qcdSummary ? [`QCD strategy redirects distributions to charity, reducing taxable income`] : []),
                    ]}
                    warnings={results.notes || []}
                    actions={[{ label: "View Tax Strategy", href: "/tax-strategy" }]}
                    inputs={{ accountHolderDOB, accountBalance, beneficiaryDOB, beneficiaryRelationship, taxYear, assumedGrowthRate, inheritanceStatus, projectionYears, qcdAmount, qcdAnnualIncrease, marginalTaxRate }}
                    results={results}
                    clientId={clientId && clientId !== "none" ? clientId : undefined}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="aggregated" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Multiple Retirement Accounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Add all retirement accounts. IRA RMDs can be aggregated; employer plans (401k/403b/457b) require separate distributions.</p>
                  {accounts.map((account, idx) => (
                    <div key={account.id} className="flex gap-2 items-end" data-testid={`account-row-${idx}`}>
                      <div className="flex-1">
                        <Label className="text-xs">Account Name</Label>
                        <Input
                          placeholder="e.g., Fidelity IRA"
                          value={account.name}
                          onChange={(e) => updateAccount(account.id, "name", e.target.value)}
                          data-testid={`input-account-name-${idx}`}
                        />
                      </div>
                      <div className="w-40">
                        <Label className="text-xs">Type</Label>
                        <Select value={account.type} onValueChange={(v) => updateAccount(account.id, "type", v)}>
                          <SelectTrigger data-testid={`select-account-type-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="traditional_ira">Traditional IRA</SelectItem>
                            <SelectItem value="sep_ira">SEP IRA</SelectItem>
                            <SelectItem value="simple_ira">SIMPLE IRA</SelectItem>
                            <SelectItem value="401k">401(k)</SelectItem>
                            <SelectItem value="403b">403(b)</SelectItem>
                            <SelectItem value="457b">457(b)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36">
                        <Label className="text-xs">Balance</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            placeholder="250000"
                            value={account.balance}
                            onChange={(e) => updateAccount(account.id, "balance", e.target.value)}
                            className="pl-7"
                            data-testid={`input-account-balance-${idx}`}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAccount(account.id)}
                        disabled={accounts.length <= 1}
                        data-testid={`button-remove-account-${idx}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addAccount} data-testid="button-add-account">
                      <Plus className="w-3 h-3 mr-1" /> Add Account
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => aggregatedMutation.mutate()}
                      disabled={aggregatedMutation.isPending || !accountHolderDOB}
                      data-testid="button-calculate-aggregated"
                    >
                      {aggregatedMutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                      Calculate Aggregated RMD
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {aggregatedMutation.isPending && <Skeleton className="h-64 w-full" />}

              {aggregatedResults && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total RMD</p>
                        <p className="text-2xl font-bold text-primary" data-testid="text-aggregated-rmd">{formatCurrency(aggregatedResults.totalRMD)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Age</p>
                        <p className="text-2xl font-bold" data-testid="text-aggregated-age">{aggregatedResults.accountHolderAge}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Life Expectancy Factor</p>
                        <p className="text-2xl font-bold" data-testid="text-aggregated-factor">{aggregatedResults.lifeExpectancyFactor}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {aggregatedResults.aggregationGroups?.map((group: any, idx: number) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {group.groupName}
                          <Badge variant="outline" className="text-xs">{formatCurrency(group.totalRMD)} RMD</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-2">{group.note}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Balance</p>
                            <p className="font-semibold">{formatCurrency(group.totalBalance)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Accounts</p>
                            <p className="font-semibold">{group.accounts.join(", ")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Account Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">RMD</TableHead>
                            <TableHead>Aggregation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aggregatedResults.accountDetails?.map((detail: any, idx: number) => (
                            <TableRow key={idx} data-testid={`row-account-detail-${idx}`}>
                              <TableCell className="font-medium">{detail.name}</TableCell>
                              <TableCell>{detail.type}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(detail.balance)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(detail.rmdAmount)}</TableCell>
                              <TableCell className="text-xs">{detail.canAggregateWith}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {aggregatedResults.notes?.length > 0 && (
                    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" /> Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {aggregatedResults.notes.map((note: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
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

            <TabsContent value="strategy" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" /> QCD vs Standard Withdrawal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Compare the tax impact of directing RMD distributions as Qualified Charitable Distributions versus standard taxable withdrawal.</p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor="input-strategy-qcd" className="text-xs">Annual QCD Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" step="1000" min="0" max="105000" placeholder="10000" value={strategyQcdAmount} onChange={(e) => setStrategyQcdAmount(e.target.value)} className="pl-9" id="input-strategy-qcd" data-testid="input-strategy-qcd" />
                      </div>
                    </div>
                    <Button
                      onClick={() => strategyMutation.mutate()}
                      disabled={strategyMutation.isPending || !accountHolderDOB || !accountBalance}
                      data-testid="button-compare-strategies"
                    >
                      {strategyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Compare
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {strategyMutation.isPending && <Skeleton className="h-64 w-full" />}

              {strategyResults && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Standard Withdrawal Taxes</p>
                        <p className="text-xl font-bold text-red-600" data-testid="text-standard-taxes">{formatCurrency(strategyResults.standardWithdrawal.totalTaxes)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">QCD Strategy Taxes</p>
                        <p className="text-xl font-bold text-green-600" data-testid="text-qcd-taxes">{formatCurrency(strategyResults.qcdStrategy.totalTaxes)}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Tax Savings from QCD</p>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-strategy-savings">{formatCurrency(strategyResults.taxSavingsFromQCD)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Side-by-Side Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead>Age</TableHead>
                              <TableHead className="text-right">RMD</TableHead>
                              <TableHead className="text-right">Std. Tax</TableHead>
                              <TableHead className="text-right">QCD Amount</TableHead>
                              <TableHead className="text-right">QCD Tax</TableHead>
                              <TableHead className="text-right">Savings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {strategyResults.qcdStrategy.projections?.map((proj: any, idx: number) => {
                              const stdProj = strategyResults.standardWithdrawal.projections?.[idx];
                              const stdTax = stdProj ? stdProj.rmdAmount * (parseFloat(marginalTaxRate) / 100) : 0;
                              const qcdTax = (proj.taxableDistribution || 0) * (parseFloat(marginalTaxRate) / 100);
                              return (
                                <TableRow key={proj.year} data-testid={`row-strategy-${proj.year}`}>
                                  <TableCell className="font-medium">{proj.year}</TableCell>
                                  <TableCell>{proj.age}</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(proj.rmdAmount)}</TableCell>
                                  <TableCell className="text-right font-mono text-red-600">{formatCurrency(stdTax)}</TableCell>
                                  <TableCell className="text-right font-mono text-blue-600">{formatCurrency(proj.qcdAmount || 0)}</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(qcdTax)}</TableCell>
                                  <TableCell className="text-right font-mono text-green-600">{formatCurrency(proj.taxSavingsFromQCD || 0)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Total QCD Giving</p>
                          <p className="font-semibold text-blue-600" data-testid="text-total-qcd">{formatCurrency(strategyResults.qcdStrategy.totalQCD)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Standard End Balance</p>
                          <p className="font-semibold">{formatCurrency(strategyResults.standardWithdrawal.endingBalance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">QCD End Balance</p>
                          <p className="font-semibold">{formatCurrency(strategyResults.qcdStrategy.endingBalance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Tax Savings</p>
                          <p className="font-bold text-green-600">{formatCurrency(strategyResults.qcdStrategy.totalTaxSavings)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {strategyResults.notes?.length > 0 && (
                    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" /> Analysis Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {strategyResults.notes.map((note: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`note-strategy-${idx}`}>
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
