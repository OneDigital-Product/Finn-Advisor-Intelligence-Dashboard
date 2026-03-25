import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingDown, TrendingUp, BarChart3, Shield, AlertTriangle, DollarSign,
  ArrowRightLeft, Loader2, Calculator, ChevronDown, ChevronUp,
  Activity, Target, Layers, Scale, PiggyBank,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });
const fmtK = (v: number) => formatCurrency(v);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

interface AnalysisAccount {
  name: string;
  type: "roth" | "taxable" | "traditional_ira" | "401k";
  balance: number;
  costBasis?: number;
  unrealizedGains?: number;
}

interface WithdrawalDetail {
  accountName: string;
  accountType: string;
  amount: number;
  taxCost: number;
  afterTaxIncome: number;
}

interface AccountBalance {
  accountName: string;
  accountType: string;
  startBalance: number;
  endBalance: number;
  declinePercent: number;
}

interface YearDetail {
  year: number;
  age: number;
  spendingNeed: number;
  totalWithdrawn: number;
  totalTaxCost: number;
  afterTaxIncome: number;
  effectiveTaxRate: number;
  marginalRate: number;
  ssIncome: number;
  federalTax: number;
  stateTax: number;
  ordinaryIncome: number;
  capitalGains: number;
  taxableSS: number;
  irmaaSurcharge: number;
  niitTax: number;
  rmdRequired: number;
  rmdSatisfied: boolean;
  qcdUsed: number;
  withdrawals: WithdrawalDetail[];
  accountBalances: AccountBalance[];
  depletionWarnings: string[];
}

interface TaxBracketFillResult {
  currentBracketRate: number;
  nextBracketRate: number;
  bracketRoom: number;
  recommendedIRAWithdrawal: number;
  taxCostOfFilling: number;
  tenYearProjection: Array<{
    year: number;
    bracketRoom: number;
    fillAmount: number;
    taxCostOptimized: number;
    taxCostUnoptimized: number;
    cumulativeSavings: number;
  }>;
  totalTenYearSavings: number;
}

interface RothConversionWindow {
  year: number;
  age: number;
  estimatedIncome: number;
  conversionRoom: number;
  recommendedConversion: number;
  taxCost: number;
  cumulativeRothBalance: number;
  isLowIncomeYear: boolean;
}

interface RMDCoordination {
  rmdAge: number;
  currentRMD: number;
  rmdSatisfiesCashNeed: boolean;
  excessRMD: number;
  qcdBenefit: number;
  qcdTaxSavings: number;
  strategies: Array<{
    name: string;
    rmdAmount: number;
    qcdAmount: number;
    taxableAmount: number;
    taxCost: number;
    netAfterTax: number;
  }>;
}

interface TaxEfficiencyRanking {
  accountType: string;
  accountName: string;
  marginalTaxCost: number;
  effectiveCostPerDollar: number;
  rank: number;
  notes: string;
}

interface StateTaxComparison {
  state: string;
  stateName: string;
  stateIncomeTaxRate: number;
  stateCapGainsRate: number;
  annualStateTax: number;
  tenYearStateTax: number;
  savingsVsCurrent: number;
}

interface IRMAAMonitoring {
  currentMAGI: number;
  nearestThreshold: number;
  distanceToThreshold: number;
  currentSurcharge: number;
  potentialSurcharge: number;
  avoidanceStrategy: string;
}

interface SSTaxationAnalysis {
  combinedIncome: number;
  taxablePortion: number;
  taxablePercentage: number;
  tier: "0%" | "50%" | "85%";
  roomToNextTier: number;
  taxOnSS: number;
  strategy: string;
}

interface NIITExposure {
  modifiedAGI: number;
  niitThreshold: number;
  netInvestmentIncome: number;
  niitLiability: number;
  spreadStrategy: string;
  multiYearSavings: number;
}

interface MarketDrawdownLevel {
  level: number;
  trigger: string;
  drawdownPercent: string;
  response: string;
  withdrawalModification: string;
}

interface SpendingGuardrails {
  ceiling: number;
  ceilingPercent: number;
  core: number;
  corePercent: number;
  floor: number;
  floorPercent: number;
  currentSpending: number;
  currentPercent: number;
  status: string;
}

interface TaxLawAdaptation {
  scenario: string;
  impact: string;
  adjustmentAction: string;
}

interface DynamicAdjustment {
  marketDrawdownProtocol: MarketDrawdownLevel[];
  spendingGuardrails: SpendingGuardrails;
  taxLawAdaptation: TaxLawAdaptation[];
}

interface StrategyComparisonData {
  strategyName: string;
  description: string;
  totalTaxesPaid: number;
  totalAfterTaxIncome: number;
  portfolioLongevityYears: number;
  depletionAge: number;
  averageEffectiveRate: number;
  yearByYear: Array<{
    year: number;
    withdrawal: number;
    taxCost: number;
    afterTax: number;
    endingBalance: number;
  }>;
}

interface WithdrawalAnalysisResult {
  yearByYearPlan: YearDetail[];
  bracketFilling: TaxBracketFillResult;
  rothConversionWindows: RothConversionWindow[];
  rmdCoordination: RMDCoordination;
  taxEfficiencyRanking: TaxEfficiencyRanking[];
  stateTaxComparisons: StateTaxComparison[];
  irmaaMonitoring: IRMAAMonitoring;
  ssTaxation: SSTaxationAnalysis;
  niitExposure: NIITExposure;
  dynamicAdjustments: DynamicAdjustment;
  strategyComparisons: StrategyComparisonData[];
  notes: string[];
}

interface WithdrawalAnalysisPanelProps {
  clientId?: string;
  accounts?: Array<{ accountNumber: string; accountType: string; balance: string; id: string }>;
  compact?: boolean;
}

export function WithdrawalAnalysisPanel({ clientId, accounts, compact }: WithdrawalAnalysisPanelProps) {
  const [currentAge, setCurrentAge] = useState("65");
  const [retirementAge, setRetirementAge] = useState("65");
  const [filingStatus, setFilingStatus] = useState("married_filing_jointly");
  const [annualSpending, setAnnualSpending] = useState("80000");
  const [ssBenefit, setSSBenefit] = useState("30000");
  const [pensionIncome, setPensionIncome] = useState("0");
  const [otherIncome, setOtherIncome] = useState("0");
  const [stateOfResidence, setStateOfResidence] = useState("CA");
  const [projectionYears, setProjectionYears] = useState("10");
  const [qcdAmount, setQcdAmount] = useState("0");
  const [showForm, setShowForm] = useState(true);
  const [analysisAccounts, setAnalysisAccounts] = useState<AnalysisAccount[]>(() => {
    if (accounts && accounts.length > 0) {
      return accounts.map(a => {
        let mappedType: AnalysisAccount["type"] = "taxable";
        const at = a.accountType.toLowerCase();
        if (at.includes("roth")) mappedType = "roth";
        else if (at.includes("ira") || at.includes("traditional")) mappedType = "traditional_ira";
        else if (at.includes("401")) mappedType = "401k";
        return {
          name: `${a.accountNumber} (${a.accountType})`,
          type: mappedType,
          balance: parseFloat(a.balance) || 0,
          costBasis: parseFloat(a.balance) * 0.6,
          unrealizedGains: parseFloat(a.balance) * 0.4,
        };
      });
    }
    return [
      { name: "Traditional IRA", type: "traditional_ira" as const, balance: 500000, costBasis: 300000 },
      { name: "Roth IRA", type: "roth" as const, balance: 200000 },
      { name: "Taxable Brokerage", type: "taxable" as const, balance: 300000, costBasis: 200000, unrealizedGains: 100000 },
    ];
  });

  const [result, setResult] = useState<WithdrawalAnalysisResult | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/withdrawals/analysis", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setShowForm(false);
    },
  });

  function runAnalysis() {
    analysisMutation.mutate({
      currentAge: parseInt(currentAge),
      retirementAge: parseInt(retirementAge),
      lifeExpectancy: 90,
      filingStatus,
      annualSpendingNeed: parseFloat(annualSpending),
      socialSecurityBenefit: parseFloat(ssBenefit),
      pensionIncome: parseFloat(pensionIncome),
      otherIncome: parseFloat(otherIncome),
      accounts: analysisAccounts,
      stateOfResidence,
      expectedGrowthRate: 0.06,
      inflationRate: 0.025,
      projectionYears: parseInt(projectionYears),
      qcdAmount: parseFloat(qcdAmount) || undefined,
      clientId,
    });
  }

  function addAccount() {
    setAnalysisAccounts([...analysisAccounts, { name: `Account ${analysisAccounts.length + 1}`, type: "taxable", balance: 0 }]);
  }

  function updateAccount(idx: number, field: keyof AnalysisAccount, value: string | number) {
    const updated = [...analysisAccounts];
    const acct = { ...updated[idx] };
    if (field === "name") acct.name = value as string;
    else if (field === "type") acct.type = value as AnalysisAccount["type"];
    else if (field === "balance") acct.balance = value as number;
    else if (field === "costBasis") acct.costBasis = value as number;
    updated[idx] = acct;
    setAnalysisAccounts(updated);
  }

  function removeAccount(idx: number) {
    setAnalysisAccounts(analysisAccounts.filter((_, i) => i !== idx));
  }

  if (compact && !result && !showForm) {
    return (
      <Card data-testid="withdrawal-analysis-compact">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: P.bIce }}>
                <Calculator className="w-5 h-5" style={{ color: P.blue }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Withdrawal Analysis</h3>
                <p className="text-xs text-muted-foreground">Optimize withdrawal sequencing and tax impact</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-start-analysis">
              <Calculator className="w-4 h-4 mr-1" /> Run Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="withdrawal-analysis-panel">
      {showForm && (
        <Card data-testid="withdrawal-analysis-form">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Withdrawal Analysis Configuration
              </CardTitle>
              {result && (
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} data-testid="button-hide-form">
                  <ChevronUp className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs" data-testid="label-current-age">Current Age</Label>
                <Input type="number" value={currentAge} onChange={e => setCurrentAge(e.target.value)} data-testid="input-current-age" />
              </div>
              <div>
                <Label className="text-xs" data-testid="label-retirement-age">Retirement Age</Label>
                <Input type="number" value={retirementAge} onChange={e => setRetirementAge(e.target.value)} data-testid="input-retirement-age" />
              </div>
              <div>
                <Label className="text-xs" data-testid="label-filing-status">Filing Status</Label>
                <Select value={filingStatus} onValueChange={setFilingStatus}>
                  <SelectTrigger data-testid="select-filing-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs" data-testid="label-state">State</Label>
                <Select value={stateOfResidence} onValueChange={setStateOfResidence}>
                  <SelectTrigger data-testid="select-state"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["CA","NY","TX","FL","NJ","IL","PA","MA","WA","CT"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs" data-testid="label-annual-spending">Annual Spending ($)</Label>
                <Input type="number" value={annualSpending} onChange={e => setAnnualSpending(e.target.value)} data-testid="input-annual-spending" />
              </div>
              <div>
                <Label className="text-xs" data-testid="label-ss-benefit">Social Security ($)</Label>
                <Input type="number" value={ssBenefit} onChange={e => setSSBenefit(e.target.value)} data-testid="input-ss-benefit" />
              </div>
              <div>
                <Label className="text-xs" data-testid="label-pension">Pension Income ($)</Label>
                <Input type="number" value={pensionIncome} onChange={e => setPensionIncome(e.target.value)} data-testid="input-pension" />
              </div>
              <div>
                <Label className="text-xs" data-testid="label-other-income">Other Income ($)</Label>
                <Input type="number" value={otherIncome} onChange={e => setOtherIncome(e.target.value)} data-testid="input-other-income" />
              </div>
              <div>
                <Label className="text-xs" data-testid="label-projection-years">Projection Years</Label>
                <Input type="number" value={projectionYears} onChange={e => setProjectionYears(e.target.value)} data-testid="input-projection-years" />
              </div>
              <div>
                <Label className="text-xs" data-testid="label-qcd-amount">QCD Amount ($)</Label>
                <Input type="number" value={qcdAmount} onChange={e => setQcdAmount(e.target.value)} data-testid="input-qcd-amount" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Accounts</Label>
                <Button variant="outline" size="sm" onClick={addAccount} data-testid="button-add-account">+ Add Account</Button>
              </div>
              <div className="space-y-2">
                {analysisAccounts.map((acct, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-end" data-testid={`account-row-${idx}`}>
                    <div>
                      <Label className="text-[10px]">Name</Label>
                      <Input value={acct.name} onChange={e => updateAccount(idx, "name", e.target.value)} className="h-8 text-xs" data-testid={`input-account-name-${idx}`} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Type</Label>
                      <Select value={acct.type} onValueChange={v => updateAccount(idx, "type", v)}>
                        <SelectTrigger className="h-8 text-xs" data-testid={`select-account-type-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="roth">Roth IRA</SelectItem>
                          <SelectItem value="traditional_ira">Traditional IRA</SelectItem>
                          <SelectItem value="401k">401(k)</SelectItem>
                          <SelectItem value="taxable">Taxable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Balance ($)</Label>
                      <Input type="number" value={acct.balance} onChange={e => updateAccount(idx, "balance", parseFloat(e.target.value) || 0)} className="h-8 text-xs" data-testid={`input-account-balance-${idx}`} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Cost Basis ($)</Label>
                      <Input type="number" value={acct.costBasis || 0} onChange={e => updateAccount(idx, "costBasis", parseFloat(e.target.value) || 0)} className="h-8 text-xs" data-testid={`input-account-basis-${idx}`} />
                    </div>
                    <div>
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => removeAccount(idx)} data-testid={`button-remove-account-${idx}`}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={runAnalysis} disabled={analysisMutation.isPending || analysisAccounts.length === 0} className="w-full" data-testid="button-run-analysis">
              {analysisMutation.isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <BarChart3 className="w-4 h-4 mr-2" />}
              Run Withdrawal Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {analysisMutation.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {analysisMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive" data-testid="text-analysis-error">Failed to run analysis. Please check your inputs and try again.</p>
          </CardContent>
        </Card>
      )}

      {result && !analysisMutation.isPending && (
        <AnalysisResults result={result} onShowForm={() => setShowForm(true)} showForm={showForm} />
      )}
    </div>
  );
}

function AnalysisResults({ result, onShowForm, showForm }: { result: WithdrawalAnalysisResult; onShowForm: () => void; showForm: boolean }) {
  return (
    <div className="space-y-4" data-testid="analysis-results">
      {!showForm && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onShowForm} data-testid="button-modify-inputs">
            <ChevronDown className="w-4 h-4 mr-1" /> Modify Inputs
          </Button>
        </div>
      )}

      <Tabs defaultValue="strategies" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="strategies" data-testid="tab-strategies">Strategies</TabsTrigger>
          <TabsTrigger value="year-by-year" data-testid="tab-year-by-year">Year-by-Year</TabsTrigger>
          <TabsTrigger value="tax-impact" data-testid="tab-tax-impact">Tax Impact</TabsTrigger>
          <TabsTrigger value="adjustments" data-testid="tab-adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="roth-rmd" data-testid="tab-roth-rmd">Roth & RMD</TabsTrigger>
          <TabsTrigger value="bracket" data-testid="tab-bracket">Bracket Fill</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="space-y-4">
          <StrategyComparisonPanel comparisons={result.strategyComparisons} />
        </TabsContent>

        <TabsContent value="year-by-year" className="space-y-4">
          <YearByYearPanel plan={result.yearByYearPlan} />
        </TabsContent>

        <TabsContent value="tax-impact" className="space-y-4">
          <TaxImpactPanel
            ranking={result.taxEfficiencyRanking}
            stateComparisons={result.stateTaxComparisons}
            irmaa={result.irmaaMonitoring}
            ssTax={result.ssTaxation}
            niit={result.niitExposure}
          />
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <DynamicAdjustmentsPanel adjustments={result.dynamicAdjustments} />
        </TabsContent>

        <TabsContent value="roth-rmd" className="space-y-4">
          <RothRMDPanel
            rothWindows={result.rothConversionWindows}
            rmdCoordination={result.rmdCoordination}
          />
        </TabsContent>

        <TabsContent value="bracket" className="space-y-4">
          <BracketFillingPanel bracketFilling={result.bracketFilling} />
        </TabsContent>
      </Tabs>

      {result.notes && result.notes.length > 0 && (
        <Card className="border-0 shadow-sm" style={{ background: P.aL }}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium mb-2" style={{ color: P.amb }}>Analysis Notes</p>
            <ul className="text-xs space-y-1" style={{ color: P.mid }}>
              {result.notes.map((n: string, i: number) => (
                <li key={i} data-testid={`text-note-${i}`}>• {n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StrategyComparisonPanel({ comparisons }: { comparisons: StrategyComparisonData[] }) {
  const best = comparisons.reduce((a, b) => a.totalAfterTaxIncome > b.totalAfterTaxIncome ? a : b, comparisons[0]);

  return (
    <div className="space-y-4" data-testid="strategy-comparison-panel">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {comparisons.map((s, i) => {
          const isBest = s.strategyName === best.strategyName;
          return (
            <Card key={i} className={isBest ? "ring-2 ring-primary" : ""} data-testid={`card-strategy-${i}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded" style={{ background: isBest ? P.gL : P.bIce }}>
                    <Scale className="w-3.5 h-3.5" style={{ color: isBest ? P.grn : P.blue }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.strategyName}</p>
                    {isBest && <Badge variant="default" className="text-[9px] px-1.5 py-0">Recommended</Badge>}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">{s.description}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Taxes</span>
                    <span className="font-medium" style={{ color: P.red }} data-testid={`text-strategy-taxes-${i}`}>{fmtK(s.totalTaxesPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">After-Tax Income</span>
                    <span className="font-semibold" style={{ color: P.grn }} data-testid={`text-strategy-income-${i}`}>{fmtK(s.totalAfterTaxIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Eff. Rate</span>
                    <span className="font-medium" data-testid={`text-strategy-rate-${i}`}>{s.averageEffectiveRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longevity</span>
                    <span className="font-medium" data-testid={`text-strategy-longevity-${i}`}>{s.portfolioLongevityYears} yrs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Account Balance Trajectory by Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Year</TableHead>
                {comparisons.map((s, i) => (
                  <TableHead key={i} className="text-xs text-right">{s.strategyName}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons[0]?.yearByYear?.slice(0, 10).map((_, yIdx) => (
                <TableRow key={yIdx} data-testid={`row-trajectory-${yIdx}`}>
                  <TableCell className="text-xs font-medium">Year {yIdx + 1}</TableCell>
                  {comparisons.map((s, sIdx) => (
                    <TableCell key={sIdx} className="text-xs text-right font-mono">
                      {fmtK(s.yearByYear[yIdx]?.endingBalance || 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function YearByYearPanel({ plan }: { plan: YearDetail[] }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  return (
    <div className="space-y-3" data-testid="year-by-year-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4" /> 10-Year Withdrawal Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Year</TableHead>
                  <TableHead className="text-xs">Age</TableHead>
                  <TableHead className="text-xs text-right">Spending</TableHead>
                  <TableHead className="text-xs text-right">Withdrawn</TableHead>
                  <TableHead className="text-xs text-right">Fed Tax</TableHead>
                  <TableHead className="text-xs text-right">State Tax</TableHead>
                  <TableHead className="text-xs text-right">Total Tax</TableHead>
                  <TableHead className="text-xs text-right">After-Tax</TableHead>
                  <TableHead className="text-xs text-right">RMD</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.slice(0, 10).map((yr) => (
                  <>
                    <TableRow key={yr.year} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedYear(expandedYear === yr.year ? null : yr.year)} data-testid={`row-year-${yr.year}`}>
                      <TableCell className="text-xs font-medium">Yr {yr.year}</TableCell>
                      <TableCell className="text-xs">{yr.age}</TableCell>
                      <TableCell className="text-xs text-right">{fmtK(yr.spendingNeed)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmtK(yr.totalWithdrawn)}</TableCell>
                      <TableCell className="text-xs text-right" style={{ color: P.red }}>{fmtK(yr.federalTax)}</TableCell>
                      <TableCell className="text-xs text-right" style={{ color: P.red }}>{fmtK(yr.stateTax)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold" style={{ color: P.red }}>{fmtK(yr.totalTaxCost)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold" style={{ color: P.grn }}>{fmtK(yr.afterTaxIncome)}</TableCell>
                      <TableCell className="text-xs text-right">{yr.rmdRequired > 0 ? fmtK(yr.rmdRequired) : "—"}</TableCell>
                      <TableCell className="text-xs">
                        {expandedYear === yr.year ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </TableCell>
                    </TableRow>
                    {expandedYear === yr.year && (
                      <TableRow key={`detail-${yr.year}`} data-testid={`row-year-detail-${yr.year}`}>
                        <TableCell colSpan={10} className="bg-muted/30 p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                            <div><span className="text-muted-foreground">Ordinary Income:</span> <span className="font-medium">{fmt(yr.ordinaryIncome)}</span></div>
                            <div><span className="text-muted-foreground">Capital Gains:</span> <span className="font-medium">{fmt(yr.capitalGains)}</span></div>
                            <div><span className="text-muted-foreground">Taxable SS:</span> <span className="font-medium">{fmt(yr.taxableSS)}</span></div>
                            <div><span className="text-muted-foreground">IRMAA:</span> <span className="font-medium">{fmt(yr.irmaaSurcharge)}</span></div>
                            {yr.niitTax > 0 && <div><span className="text-muted-foreground">NIIT:</span> <span className="font-medium">{fmt(yr.niitTax)}</span></div>}
                            {yr.qcdUsed > 0 && <div><span className="text-muted-foreground">QCD Used:</span> <span className="font-medium" style={{ color: P.grn }}>{fmt(yr.qcdUsed)}</span></div>}
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-medium text-muted-foreground">Withdrawal Sources:</p>
                            {yr.withdrawals.map((w, wi) => (
                              <div key={wi} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
                                <span>{w.accountName} <Badge variant="outline" className="text-[9px] ml-1 no-default-active-elevate">{w.accountType}</Badge></span>
                                <span className="font-mono">{fmt(w.amount)} <span className="text-muted-foreground">(tax: {fmt(w.taxCost)})</span></span>
                              </div>
                            ))}
                          </div>
                          {yr.accountBalances && yr.accountBalances.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-[10px] font-medium text-muted-foreground">Account Balances:</p>
                              {yr.accountBalances.map((ab, abi) => (
                                <div key={abi} className="flex items-center justify-between text-xs">
                                  <span>{ab.accountName}</span>
                                  <span className="font-mono">{fmtK(ab.endBalance)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {yr.depletionWarnings.length > 0 && (
                            <div className="mt-2">
                              {yr.depletionWarnings.map((w: string, wi: number) => (
                                <p key={wi} className="text-xs flex items-center gap-1" style={{ color: P.red }}>
                                  <AlertTriangle className="w-3 h-3" /> {w}
                                </p>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaxImpactPanel({ ranking, stateComparisons, irmaa, ssTax, niit }: { ranking: TaxEfficiencyRanking[]; stateComparisons: StateTaxComparison[]; irmaa: IRMAAMonitoring; ssTax: SSTaxationAnalysis; niit: NIITExposure }) {
  return (
    <div className="space-y-4" data-testid="tax-impact-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" /> Tax Efficiency Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border" data-testid={`card-ranking-${i}`}>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{
                    background: r.rank === 1 ? P.gL : r.rank === 2 ? P.bIce : P.aL,
                    color: r.rank === 1 ? P.grn : r.rank === 2 ? P.blue : P.amb,
                  }}>
                    {r.rank}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.accountName}</p>
                    <p className="text-[10px] text-muted-foreground">{r.notes}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{r.marginalTaxCost}%</p>
                  <p className="text-[10px] text-muted-foreground">cost per $1</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card data-testid="card-irmaa">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" style={{ color: P.amb }} />
              <p className="text-sm font-semibold">Medicare IRMAA</p>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Current MAGI</span><span className="font-medium">{fmtK(irmaa.currentMAGI)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nearest Threshold</span><span className="font-medium">{fmtK(irmaa.nearestThreshold)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="font-medium" style={{ color: irmaa.distanceToThreshold > 0 ? P.grn : P.red }}>{fmtK(irmaa.distanceToThreshold)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current Surcharge</span><span className="font-medium">{fmt(irmaa.currentSurcharge)}/yr</span></div>
            </div>
            <p className="text-[10px] mt-2 p-1.5 rounded" style={{ background: P.aL, color: P.amb }}>{irmaa.avoidanceStrategy}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ss-taxation">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4" style={{ color: P.blue }} />
              <p className="text-sm font-semibold">SS Taxation</p>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Combined Income</span><span className="font-medium">{fmtK(ssTax.combinedIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable Tier</span><Badge variant="outline" className="text-[9px] no-default-active-elevate">{ssTax.tier}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable Portion</span><span className="font-medium">{fmtK(ssTax.taxablePortion)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax on SS</span><span className="font-medium" style={{ color: P.red }}>{fmtK(ssTax.taxOnSS)}</span></div>
              {ssTax.roomToNextTier > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Room to Next Tier</span><span className="font-medium" style={{ color: P.grn }}>{fmtK(ssTax.roomToNextTier)}</span></div>}
            </div>
            <p className="text-[10px] mt-2 p-1.5 rounded" style={{ background: P.bIce, color: P.bLo }}>{ssTax.strategy}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-niit">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" style={{ color: P.org }} />
              <p className="text-sm font-semibold">NIIT 3.8%</p>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Modified AGI</span><span className="font-medium">{fmtK(niit.modifiedAGI)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Threshold</span><span className="font-medium">{fmtK(niit.niitThreshold)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Net Investment Income</span><span className="font-medium">{fmtK(niit.netInvestmentIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">NIIT Liability</span><span className="font-medium" style={{ color: niit.niitLiability > 0 ? P.red : P.grn }}>{fmt(niit.niitLiability)}</span></div>
              {niit.multiYearSavings > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Spread Savings</span><span className="font-medium" style={{ color: P.grn }}>{fmt(niit.multiYearSavings)}</span></div>}
            </div>
            <p className="text-[10px] mt-2 p-1.5 rounded" style={{ background: P.oL, color: P.org }}>{niit.spreadStrategy}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">State Tax Comparison (10-Year)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">State</TableHead>
                <TableHead className="text-xs text-right">Income Tax Rate</TableHead>
                <TableHead className="text-xs text-right">Cap Gains Rate</TableHead>
                <TableHead className="text-xs text-right">Annual Tax</TableHead>
                <TableHead className="text-xs text-right">10-Year Tax</TableHead>
                <TableHead className="text-xs text-right">10-Year Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stateComparisons.map((s) => (
                <TableRow key={s.state} data-testid={`row-state-${s.state}`}>
                  <TableCell className="text-xs font-medium">{s.stateName} ({s.state})</TableCell>
                  <TableCell className="text-xs text-right">{(s.stateIncomeTaxRate * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-xs text-right">{(s.stateCapGainsRate * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmtK(s.annualStateTax)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmtK(s.tenYearStateTax)}</TableCell>
                  <TableCell className="text-xs text-right font-mono" style={{ color: s.savingsVsCurrent > 0 ? P.grn : s.savingsVsCurrent < 0 ? P.red : P.mid }}>
                    {s.savingsVsCurrent > 0 ? "+" : ""}{fmtK(s.savingsVsCurrent)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DynamicAdjustmentsPanel({ adjustments }: { adjustments: DynamicAdjustment }) {
  const guardrails = adjustments.spendingGuardrails;
  const statusColors: Record<string, string> = {
    above_ceiling: P.red,
    at_ceiling: P.org,
    core: P.grn,
    at_floor: P.amb,
    below_floor: P.blue,
  };
  const statusLabels: Record<string, string> = {
    above_ceiling: "Above Ceiling",
    at_ceiling: "At Ceiling",
    core: "Core Range",
    at_floor: "At Floor",
    below_floor: "Below Floor",
  };

  return (
    <div className="space-y-4" data-testid="dynamic-adjustments-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Market Drawdown Response Protocol
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adjustments.marketDrawdownProtocol.map((level) => (
              <div key={level.level} className="border rounded-lg p-3" data-testid={`card-drawdown-level-${level.level}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant={level.level <= 2 ? "secondary" : "destructive"} className="text-[10px] no-default-active-elevate">
                    Level {level.level}
                  </Badge>
                  <span className="text-xs font-semibold">{level.response}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{level.drawdownPercent} decline</span>
                </div>
                <p className="text-xs text-muted-foreground">{level.trigger}</p>
                <p className="text-xs mt-1 p-1.5 rounded" style={{ background: P.bIce }}>{level.withdrawalModification}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-spending-guardrails">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" /> Spending Guardrails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <div className="h-8 bg-muted rounded-full overflow-hidden flex">
              <div className="h-full" style={{ width: "30%", background: P.bIce }} />
              <div className="h-full" style={{ width: "25%", background: P.gL }} />
              <div className="h-full" style={{ width: "20%", background: P.aL }} />
              <div className="h-full" style={{ width: "25%", background: P.rL }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1 px-1">
              <span>Floor ({guardrails.floorPercent}%)</span>
              <span>Core ({guardrails.corePercent}%)</span>
              <span>Ceiling ({guardrails.ceilingPercent}%)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2 rounded border">
              <p className="text-muted-foreground">Ceiling</p>
              <p className="font-semibold">{fmt(guardrails.ceiling)}</p>
              <p className="text-[10px] text-muted-foreground">{guardrails.ceilingPercent}% of portfolio</p>
            </div>
            <div className="p-2 rounded border">
              <p className="text-muted-foreground">Core</p>
              <p className="font-semibold">{fmt(guardrails.core)}</p>
              <p className="text-[10px] text-muted-foreground">{guardrails.corePercent}% of portfolio</p>
            </div>
            <div className="p-2 rounded border">
              <p className="text-muted-foreground">Floor</p>
              <p className="font-semibold">{fmt(guardrails.floor)}</p>
              <p className="text-[10px] text-muted-foreground">{guardrails.floorPercent}% of portfolio</p>
            </div>
            <div className="p-2 rounded border" style={{ borderColor: statusColors[guardrails.status] || P.mid }}>
              <p className="text-muted-foreground">Current</p>
              <p className="font-semibold" style={{ color: statusColors[guardrails.status] || P.ink }}>{fmt(guardrails.currentSpending)}</p>
              <p className="text-[10px]" style={{ color: statusColors[guardrails.status] || P.mid }}>{statusLabels[guardrails.status] || guardrails.status} ({guardrails.currentPercent}%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-tax-law-adaptation">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tax Law Change Adaptation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adjustments.taxLawAdaptation.map((item, i) => (
              <div key={i} className="border rounded-lg p-3" data-testid={`card-tax-law-${i}`}>
                <p className="text-sm font-semibold mb-1">{item.scenario}</p>
                <p className="text-xs text-muted-foreground mb-1.5">{item.impact}</p>
                <p className="text-xs p-1.5 rounded" style={{ background: P.gL, color: P.gD }}>
                  <strong>Action:</strong> {item.adjustmentAction}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RothRMDPanel({ rothWindows, rmdCoordination }: { rothWindows: RothConversionWindow[]; rmdCoordination: RMDCoordination }) {
  return (
    <div className="space-y-4" data-testid="roth-rmd-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Roth Conversion Windows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Year</TableHead>
                <TableHead className="text-xs">Age</TableHead>
                <TableHead className="text-xs text-right">Est. Income</TableHead>
                <TableHead className="text-xs text-right">Bracket Room</TableHead>
                <TableHead className="text-xs text-right">Conversion</TableHead>
                <TableHead className="text-xs text-right">Tax Cost</TableHead>
                <TableHead className="text-xs text-right">Roth Balance</TableHead>
                <TableHead className="text-xs">Window</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rothWindows.map((w) => (
                <TableRow key={w.year} data-testid={`row-roth-window-${w.year}`} className={w.isLowIncomeYear ? "bg-green-50/50" : ""}>
                  <TableCell className="text-xs">Yr {w.year}</TableCell>
                  <TableCell className="text-xs">{w.age}</TableCell>
                  <TableCell className="text-xs text-right">{fmtK(w.estimatedIncome)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtK(w.conversionRoom)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold" style={{ color: P.blue }}>{fmtK(w.recommendedConversion)}</TableCell>
                  <TableCell className="text-xs text-right" style={{ color: P.red }}>{fmtK(w.taxCost)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmtK(w.cumulativeRothBalance)}</TableCell>
                  <TableCell className="text-xs">
                    {w.isLowIncomeYear ? (
                      <Badge variant="default" className="text-[9px] bg-green-600">Optimal</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] no-default-active-elevate">Standard</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card data-testid="card-rmd-coordination">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> RMD Coordination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
            <div className="p-2 rounded border">
              <p className="text-muted-foreground">RMD Start Age</p>
              <p className="text-lg font-bold">{rmdCoordination.rmdAge}</p>
            </div>
            <div className="p-2 rounded border">
              <p className="text-muted-foreground">Current RMD</p>
              <p className="text-lg font-bold">{fmtK(rmdCoordination.currentRMD)}</p>
            </div>
            <div className="p-2 rounded border">
              <p className="text-muted-foreground">QCD Benefit</p>
              <p className="text-lg font-bold" style={{ color: P.grn }}>{fmtK(rmdCoordination.qcdBenefit)}</p>
            </div>
            <div className="p-2 rounded border">
              <p className="text-muted-foreground">QCD Tax Savings</p>
              <p className="text-lg font-bold" style={{ color: P.grn }}>{fmtK(rmdCoordination.qcdTaxSavings)}</p>
            </div>
          </div>

          <p className="text-xs font-medium mb-2">Strategy Comparison</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Strategy</TableHead>
                <TableHead className="text-xs text-right">RMD</TableHead>
                <TableHead className="text-xs text-right">QCD</TableHead>
                <TableHead className="text-xs text-right">Taxable</TableHead>
                <TableHead className="text-xs text-right">Tax Cost</TableHead>
                <TableHead className="text-xs text-right">Net After Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rmdCoordination.strategies.map((s, i) => (
                <TableRow key={i} data-testid={`row-rmd-strategy-${i}`}>
                  <TableCell className="text-xs font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-right">{fmtK(s.rmdAmount)}</TableCell>
                  <TableCell className="text-xs text-right" style={{ color: P.grn }}>{s.qcdAmount > 0 ? fmtK(s.qcdAmount) : "—"}</TableCell>
                  <TableCell className="text-xs text-right">{fmtK(s.taxableAmount)}</TableCell>
                  <TableCell className="text-xs text-right" style={{ color: P.red }}>{fmtK(s.taxCost)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold" style={{ color: P.grn }}>{fmtK(s.netAfterTax)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BracketFillingPanel({ bracketFilling }: { bracketFilling: TaxBracketFillResult }) {
  return (
    <div className="space-y-4" data-testid="bracket-filling-panel">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Current Bracket</p>
            <p className="text-2xl font-bold" data-testid="text-current-bracket">{(bracketFilling.currentBracketRate * 100).toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">Next: {(bracketFilling.nextBracketRate * 100).toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Bracket Room</p>
            <p className="text-2xl font-bold" style={{ color: P.grn }} data-testid="text-bracket-room">{fmtK(bracketFilling.bracketRoom)}</p>
            <p className="text-[10px] text-muted-foreground">Before next bracket</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">10-Year Savings</p>
            <p className="text-2xl font-bold" style={{ color: P.grn }} data-testid="text-10yr-savings">{fmtK(bracketFilling.totalTenYearSavings)}</p>
            <p className="text-[10px] text-muted-foreground">vs unoptimized approach</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recommended: Withdraw {fmtK(bracketFilling.recommendedIRAWithdrawal)} from IRA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Fill the {(bracketFilling.currentBracketRate * 100).toFixed(0)}% bracket with {fmt(bracketFilling.recommendedIRAWithdrawal)} in IRA withdrawals at a tax cost of {fmt(bracketFilling.taxCostOfFilling)}. This avoids paying the {(bracketFilling.nextBracketRate * 100).toFixed(0)}% rate later.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Year</TableHead>
                <TableHead className="text-xs text-right">Bracket Room</TableHead>
                <TableHead className="text-xs text-right">Fill Amount</TableHead>
                <TableHead className="text-xs text-right">Tax (Optimized)</TableHead>
                <TableHead className="text-xs text-right">Tax (Unoptimized)</TableHead>
                <TableHead className="text-xs text-right">Cumulative Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bracketFilling.tenYearProjection.map((yr) => (
                <TableRow key={yr.year} data-testid={`row-bracket-fill-${yr.year}`}>
                  <TableCell className="text-xs">Yr {yr.year}</TableCell>
                  <TableCell className="text-xs text-right">{fmtK(yr.bracketRoom)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmtK(yr.fillAmount)}</TableCell>
                  <TableCell className="text-xs text-right" style={{ color: P.grn }}>{fmtK(yr.taxCostOptimized)}</TableCell>
                  <TableCell className="text-xs text-right" style={{ color: P.red }}>{fmtK(yr.taxCostUnoptimized)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold" style={{ color: P.grn }}>{fmtK(yr.cumulativeSavings)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
