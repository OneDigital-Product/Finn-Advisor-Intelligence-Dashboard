import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { generateRetirementPDF } from "@/lib/retirement-pdf";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import React, { useState, useRef, useMemo } from "react";
import type { RetirementAnalysisResult, ScenarioProjection, SSAnalysisResult, CouplesSSCombo, PensionComparison, ExpenseModelResult, GapAnalysisResult, WithdrawalSequenceResult, PhasedRetirementProjection, PassiveIncomeSustainability } from "@shared/retirement-analysis-types";
import {
  TrendingUp,
  Calendar,
  Plus,
  Loader2,
  Trash2,
  PlayCircle,
  Activity,
  FileDown,
  AlertTriangle,
  Shield,
  DollarSign,
  Target,
  Briefcase,
  Heart,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { EmptyState } from "@/components/empty-state";
import { Score } from "@/components/design/score";
import { SignalCard } from "@/components/design/signal-card";
import { formatCurrency } from "./shared";
const ffc = (v: number) => formatCurrency(v, { abbreviated: false });

interface MonteCarloScenario {
  id: string;
  name: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  annualSpending: string;
  expectedReturn: string;
  returnStdDev: string;
  inflationRate: string;
  preRetirementContribution: string;
  results?: {
    successRate: number;
    numSimulations?: number;
    percentilePaths?: {
      ages: number[];
      p10: number[];
      p25: number[];
      p50: number[];
      p75: number[];
      p90: number[];
    };
    finalBalanceStats?: {
      median: number;
      p10: number;
      p90: number;
      mean?: number;
    };
    yearOfDepletion?: { median: number | null };
  };
  parameters?: Record<string, unknown>;
  events?: { id: string; name: string; type: string; amount: string; startAge: number; endAge: number; inflationAdjusted?: boolean }[];
  simulationResults?: { successRate: number };
}
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

export function RetirementSection({ clientId, totalAum, clientName }: { clientId: string; totalAum: number; clientName: string }) {
  const { toast } = useToast();
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [activeMainTab, setActiveMainTab] = useState("scenarios");

  const [scenarioName, setScenarioName] = useState("Base Case");
  const [currentAge, setCurrentAge] = useState("55");
  const [retirementAge, setRetirementAge] = useState("65");
  const [lifeExpectancy, setLifeExpectancy] = useState("90");
  const [annualSpending, setAnnualSpending] = useState("120000");
  const [expectedReturn, setExpectedReturn] = useState("7");
  const [returnStdDev, setReturnStdDev] = useState("12");
  const [inflationRate, setInflationRate] = useState("3");
  const [preRetirementContribution, setPreRetirementContribution] = useState("50000");

  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("expense");
  const [eventAmount, setEventAmount] = useState("");
  const [eventStartAge, setEventStartAge] = useState("");
  const [eventEndAge, setEventEndAge] = useState("");
  const [eventInflationAdjusted, setEventInflationAdjusted] = useState(true);

  const [ssPIA, setSSPIA] = useState("2500");
  const [ssClaimAge, setSSClaimAge] = useState("67");
  const [spousePIA, setSpousePIA] = useState("");
  const [pensionBenefit, setPensionBenefit] = useState("");
  const [pensionLumpSum, setPensionLumpSum] = useState("");
  const [pensionStartAge, setPensionStartAge] = useState("");
  const [rentalIncome, setRentalIncome] = useState("");
  const [filingStatus, setFilingStatus] = useState("single");
  const [traditionalBalance, setTraditionalBalance] = useState("");
  const [rothBalance, setRothBalance] = useState("");
  const [taxableBalance, setTaxableBalance] = useState("");
  const [marginalRate, setMarginalRate] = useState("24");
  const [stateRate, setStateRate] = useState("5");
  const [rentalVacancy, setRentalVacancy] = useState("5");

  const [analysisResults, setAnalysisResults] = useState<RetirementAnalysisResult | null>(null);
  const [analysisTab, setAnalysisTab] = useState("comparison");

  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery<MonteCarloScenario[]>({
    queryKey: ["/api/clients", clientId, "scenarios"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/scenarios`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scenarios");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000,
  });

  const { data: selectedScenario } = useQuery<MonteCarloScenario>({
    queryKey: ["/api/clients", clientId, "scenarios", selectedScenarioId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/scenarios/${selectedScenarioId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scenario");
      return res.json();
    },
    enabled: !!selectedScenarioId,
    staleTime: 15 * 60 * 1000,
  });

  const createScenarioMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/scenarios`, {
        name: scenarioName,
        currentAge: parseInt(currentAge),
        retirementAge: parseInt(retirementAge),
        lifeExpectancy: parseInt(lifeExpectancy),
        annualSpending: parseFloat(annualSpending),
        expectedReturn: parseFloat(expectedReturn) / 100,
        returnStdDev: parseFloat(returnStdDev) / 100,
        inflationRate: parseFloat(inflationRate) / 100,
        preRetirementContribution: parseFloat(preRetirementContribution || "0"),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "scenarios"] });
      setSelectedScenarioId(data.id);
      setShowNewScenario(false);
      toast({ title: "Scenario created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/scenarios/${scenarioId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "scenarios"] });
      setSelectedScenarioId(null);
      toast({ title: "Scenario deleted" });
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/scenarios/${selectedScenarioId}/events`, {
        name: eventName,
        type: eventType,
        amount: parseFloat(eventAmount),
        startAge: parseInt(eventStartAge),
        endAge: eventEndAge ? parseInt(eventEndAge) : null,
        inflationAdjusted: eventInflationAdjusted,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "scenarios", selectedScenarioId] });
      setShowAddEvent(false);
      setEventName("");
      setEventAmount("");
      setEventStartAge("");
      setEventEndAge("");
      toast({ title: "Event added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/scenarios/${selectedScenarioId}/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "scenarios", selectedScenarioId] });
      toast({ title: "Event removed" });
    },
  });

  const runSimulationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/scenarios/${selectedScenarioId}/run`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "scenarios", selectedScenarioId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "scenarios"] });
      toast({ title: `Simulation complete — ${data.simulationResults.successRate}% success rate` });
    },
    onError: (err: Error) => toast({ title: "Simulation failed", description: err.message, variant: "destructive" }),
  });

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/retirement-analysis", {
        currentAge: parseInt(currentAge),
        retirementAge: parseInt(retirementAge),
        lifeExpectancy: parseInt(lifeExpectancy),
        portfolioValue: totalAum,
        annualSpending: parseFloat(annualSpending),
        expectedReturn: parseFloat(expectedReturn) / 100,
        inflationRate: parseFloat(inflationRate) / 100,
        preRetirementContribution: parseFloat(preRetirementContribution || "0"),
        socialSecurityPIA: ssPIA ? parseFloat(ssPIA) : undefined,
        socialSecurityClaimingAge: ssClaimAge ? parseInt(ssClaimAge) : undefined,
        spousePIA: spousePIA ? parseFloat(spousePIA) : undefined,
        pensionAnnualBenefit: pensionBenefit ? parseFloat(pensionBenefit) : undefined,
        pensionLumpSum: pensionLumpSum ? parseFloat(pensionLumpSum) : undefined,
        pensionStartAge: pensionStartAge ? parseInt(pensionStartAge) : undefined,
        rentalIncome: rentalIncome ? parseFloat(rentalIncome) : undefined,
        rentalVacancyRate: rentalVacancy ? parseFloat(rentalVacancy) / 100 : undefined,
        filingStatus,
        traditionalBalance: traditionalBalance ? parseFloat(traditionalBalance) : undefined,
        rothBalance: rothBalance ? parseFloat(rothBalance) : undefined,
        taxableBalance: taxableBalance ? parseFloat(taxableBalance) : undefined,
        marginalTaxRate: marginalRate ? parseFloat(marginalRate) / 100 : undefined,
        stateRate: stateRate ? parseFloat(stateRate) / 100 : undefined,
        clientId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisResults(data.results);
      setActiveMainTab("analysis");
      toast({ title: "Retirement analysis complete" });
    },
    onError: (err: Error) => toast({ title: "Analysis failed", description: err.message, variant: "destructive" }),
  });

  const results = selectedScenario?.results;
  const paths = results?.percentilePaths;

  // Memoize chart data so form keystrokes don't trigger chart re-renders.
  // The chart only needs to update when the selected scenario changes.
  const chartData = useMemo(
    () => paths?.ages?.map((age: number, i: number) => ({
      age,
      p90: paths.p90[i],
      p75: paths.p75[i],
      p50: paths.p50[i],
      p25: paths.p25[i],
      p10: paths.p10[i],
    })) || [],
    [paths]
  );
  const successRate = results?.successRate ?? null;

  // Static chart configs — defined once, never reconstructed on re-render
  const monteCarloChartConfig = useMemo(() => ({
    p90: { label: "90th Percentile", theme: { light: "hsl(213, 72%, 60%)", dark: "hsl(213, 72%, 70%)" } },
    p75: { label: "75th Percentile", theme: { light: "hsl(168, 55%, 50%)", dark: "hsl(168, 55%, 60%)" } },
    p50: { label: "Median (50th)", theme: { light: "hsl(213, 72%, 35%)", dark: "hsl(213, 72%, 55%)" } },
    p25: { label: "25th Percentile", theme: { light: "hsl(28, 70%, 50%)", dark: "hsl(28, 70%, 60%)" } },
    p10: { label: "10th Percentile", theme: { light: "hsl(0, 70%, 50%)", dark: "hsl(0, 70%, 60%)" } },
  } satisfies ChartConfig), []);

  const EVENT_PRESETS = [
    { name: "College Tuition (per child)", type: "expense", amount: "50000", startAge: "60", endAge: "64" },
    { name: "Long-Term Care", type: "expense", amount: "100000", startAge: "80", endAge: "85" },
    { name: "Home Purchase", type: "expense", amount: "300000", startAge: "58", endAge: "" },
    { name: "Medical Expenses", type: "expense", amount: "20000", startAge: "70", endAge: "90" },
    { name: "Social Security", type: "income", amount: "30000", startAge: "67", endAge: "" },
    { name: "Pension Income", type: "income", amount: "40000", startAge: "65", endAge: "" },
    { name: "Part-Time Work", type: "income", amount: "25000", startAge: "65", endAge: "70" },
    { name: "Downsizing Home", type: "income", amount: "200000", startAge: "70", endAge: "" },
  ];

  const ar = analysisResults;

  return (
    <div className="space-y-4">
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scenarios" data-testid="tab-scenarios">Monte Carlo Scenarios</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            Retirement Analysis
            {ar && <Badge variant="secondary" className="ml-2 text-[10px]">{ar.gapAnalysis.readinessRating === "on_track" ? "On Track" : "Review"}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card style={V2_CARD}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
                      <div className="w-6 h-6 rounded bg-violet-500/10 dark:bg-violet-400/10 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      Scenarios
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setShowNewScenario(true)} data-testid="button-new-scenario">
                      <Plus className="w-3.5 h-3.5 mr-1" /> New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {scenariosLoading && <Skeleton className="h-20" />}
                  {!scenariosLoading && (!scenarios || scenarios.length === 0) && (
                    <EmptyState
                      icon={TrendingUp}
                      title="No scenarios yet"
                      description="Create a scenario to run Monte Carlo retirement simulations with 1,000 market paths."
                      actionLabel="New Scenario"
                      actionIcon={Plus}
                      onAction={() => setShowNewScenario(true)}
                      className="py-6"
                    />
                  )}
                  <div className="space-y-2">
                    {scenarios?.map((s) => (
                      <div
                        key={s.id}
                        className={`p-3 rounded-md cursor-pointer hover-elevate ${selectedScenarioId === s.id ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}
                        onClick={() => setSelectedScenarioId(s.id)}
                        data-testid={`scenario-card-${s.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.name}</span>
                          {s.results && (
                            <Score value={s.results?.successRate ?? 0} max={100} size={28} showPercent />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#C7D0DD]">
                          <span>Age {s.currentAge}→{s.retirementAge}</span>
                          <span>{ffc(parseFloat(s.annualSpending))}/yr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card style={V2_CARD}>
                <CardHeader className="pb-3">
                  <CardTitle className="" style={V2_TITLE}>Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold" data-testid="text-portfolio-value">{formatCurrency(totalAum)}</div>
                  <p className="text-xs text-[#C7D0DD] mt-1">Current portfolio value used in simulation</p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {!selectedScenarioId && !showNewScenario && (
                <Card style={V2_CARD}>
                  <CardContent className="py-16 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Monte Carlo Retirement Simulation</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      Run 1,000 simulated market scenarios to estimate the probability of maintaining your client's desired retirement lifestyle. Add life events like college tuition, Social Security, and medical expenses to create realistic projections.
                    </p>
                    <Button onClick={() => setShowNewScenario(true)} data-testid="button-create-first-scenario">
                      <Plus className="w-4 h-4 mr-2" /> Create First Scenario
                    </Button>
                  </CardContent>
                </Card>
              )}

              {showNewScenario && (
                <Card style={V2_CARD}>
                  <CardHeader className="pb-3">
                    <CardTitle className="" style={V2_TITLE}>New Scenario</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="ret-scenario-name">Scenario Name</Label>
                      <Input id="ret-scenario-name" value={scenarioName} onChange={e => setScenarioName(e.target.value)} data-testid="input-scenario-name" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="ret-current-age">Current Age</Label>
                        <Input id="ret-current-age" type="number" value={currentAge} onChange={e => setCurrentAge(e.target.value)} data-testid="input-current-age" />
                      </div>
                      <div>
                        <Label htmlFor="ret-retirement-age">Retirement Age</Label>
                        <Input id="ret-retirement-age" type="number" value={retirementAge} onChange={e => setRetirementAge(e.target.value)} data-testid="input-retirement-age" />
                      </div>
                      <div>
                        <Label htmlFor="ret-life-exp">Life Expectancy</Label>
                        <Input id="ret-life-exp" type="number" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} data-testid="input-life-expectancy" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="ret-annual-spending" className="flex items-center gap-1">Annual Spending (Retirement) <InfoTip term="safe_withdrawal" /></Label>
                        <Input id="ret-annual-spending" type="number" value={annualSpending} onChange={e => setAnnualSpending(e.target.value)} placeholder="120000" data-testid="input-annual-spending" />
                      </div>
                      <div>
                        <Label htmlFor="ret-contribution">Pre-Retirement Annual Contribution</Label>
                        <Input id="ret-contribution" type="number" value={preRetirementContribution} onChange={e => setPreRetirementContribution(e.target.value)} placeholder="50000" data-testid="input-contribution" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="ret-expected-return" className="flex items-center gap-1">Expected Return (%) <InfoTip term="expected_return" /></Label>
                        <Input id="ret-expected-return" type="number" step="0.1" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} data-testid="input-expected-return" />
                      </div>
                      <div>
                        <Label htmlFor="ret-std-dev" className="flex items-center gap-1">Volatility / Std Dev (%) <InfoTip term="std_dev" /></Label>
                        <Input id="ret-std-dev" type="number" step="0.1" value={returnStdDev} onChange={e => setReturnStdDev(e.target.value)} data-testid="input-std-dev" />
                      </div>
                      <div>
                        <Label htmlFor="ret-inflation" className="flex items-center gap-1">Inflation (%) <InfoTip term="inflation_rate" /></Label>
                        <Input id="ret-inflation" type="number" step="0.1" value={inflationRate} onChange={e => setInflationRate(e.target.value)} data-testid="input-inflation" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button onClick={() => createScenarioMutation.mutate()} disabled={createScenarioMutation.isPending} data-testid="button-create-scenario">
                        {createScenarioMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Create Scenario
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewScenario(false)} data-testid="button-cancel-scenario">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedScenarioId && selectedScenario && (
                <>
                  <Card style={V2_CARD}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="" style={V2_TITLE}>{selectedScenario.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {results && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await generateRetirementPDF(selectedScenario as Parameters<typeof generateRetirementPDF>[0], clientName, totalAum, chartContainerRef.current);
                                  toast({ title: "PDF report downloaded" });
                                } catch (err: unknown) {
                                  toast({ title: "Export failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
                                }
                              }}
                              data-testid="button-export-pdf"
                            >
                              <FileDown className="w-3.5 h-3.5 mr-1" />
                              Export PDF
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => runSimulationMutation.mutate()}
                            disabled={runSimulationMutation.isPending}
                            data-testid="button-run-simulation"
                          >
                            {runSimulationMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <PlayCircle className="w-3.5 h-3.5 mr-1" />}
                            {runSimulationMutation.isPending ? "Running..." : "Run Simulation"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteScenarioMutation.mutate(selectedScenarioId)}
                            data-testid="button-delete-scenario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="p-2 rounded bg-muted/40">
                          <div className="text-[12px] text-[#C7D0DD] uppercase tracking-wide">Current Age</div>
                          <div className="font-semibold">{selectedScenario.currentAge}</div>
                        </div>
                        <div className="p-2 rounded bg-muted/40">
                          <div className="text-[12px] text-[#C7D0DD] uppercase tracking-wide">Retirement</div>
                          <div className="font-semibold">{selectedScenario.retirementAge}</div>
                        </div>
                        <div className="p-2 rounded bg-muted/40">
                          <div className="text-[12px] text-[#C7D0DD] uppercase tracking-wide">Annual Spending</div>
                          <div className="font-semibold">{ffc(parseFloat(selectedScenario.annualSpending))}</div>
                        </div>
                        <div className="p-2 rounded bg-muted/40">
                          <div className="text-[12px] text-[#C7D0DD] uppercase tracking-wide">Life Expectancy</div>
                          <div className="font-semibold">{selectedScenario.lifeExpectancy}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm mt-3">
                        <div className="p-2 rounded bg-muted/40">
                          <div className="text-[12px] text-[#C7D0DD] uppercase tracking-wide">Expected Return</div>
                          <div className="font-semibold">{(parseFloat(selectedScenario.expectedReturn) * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-2 rounded bg-muted/40">
                          <div className="text-[12px] text-[#C7D0DD] uppercase tracking-wide">Volatility</div>
                          <div className="font-semibold">{(parseFloat(selectedScenario.returnStdDev) * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-2 rounded bg-muted/40">
                          <div className="text-[12px] text-[#C7D0DD] uppercase tracking-wide">Inflation</div>
                          <div className="font-semibold">{(parseFloat(selectedScenario.inflationRate) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card style={V2_CARD}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
                          <div className="w-6 h-6 rounded bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          Life Events & Income Sources
                        </CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setShowAddEvent(true)} data-testid="button-add-event">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Event
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(!selectedScenario.events || selectedScenario.events.length === 0) && (
                        <EmptyState
                          icon={Calendar}
                          title="No life events added"
                          description="Add events like college tuition, Social Security income, or medical expenses to create realistic projections."
                          actionLabel="Add Event"
                          actionIcon={Plus}
                          onAction={() => setShowAddEvent(true)}
                          className="py-4"
                        />
                      )}
                      <div className="space-y-2">
                        {selectedScenario.events?.map((event) => (
                          <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/40" data-testid={`event-${event.id}`}>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${event.type === "income" ? "bg-emerald-500" : "bg-red-500"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{event.name}</div>
                              <div className="text-xs text-[#C7D0DD]">
                                {ffc(parseFloat(event.amount))}/yr · Age {event.startAge}{event.endAge ? `–${event.endAge}` : "+"}{event.inflationAdjusted ? " · Inflation adj." : ""}
                              </div>
                            </div>
                            <Badge variant={event.type === "income" ? "secondary" : "destructive"} className="text-[10px]">
                              {event.type}
                            </Badge>
                            <Button size="icon" variant="ghost" onClick={() => deleteEventMutation.mutate(event.id)} data-testid={`button-delete-event-${event.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Add Life Event</DialogTitle>
                        <DialogDescription>Add a recurring income source or expense to the simulation.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
                          <div className="flex flex-wrap gap-2">
                            {EVENT_PRESETS.map(preset => (
                              <Badge
                                key={preset.name}
                                variant="outline"
                                className="cursor-pointer hover:bg-accent text-xs"
                                onClick={() => {
                                  setEventName(preset.name);
                                  setEventType(preset.type);
                                  setEventAmount(preset.amount);
                                  setEventStartAge(preset.startAge);
                                  setEventEndAge(preset.endAge);
                                }}
                                data-testid={`preset-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {preset.type === "income" ? "+" : "−"} {preset.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>Event Name</Label>
                          <Input id="event-name" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g., College Tuition" data-testid="input-event-name" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="event-type">Type</Label>
                            <Select value={eventType} onValueChange={setEventType}>
                              <SelectTrigger id="event-type" data-testid="select-event-type"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="event-amount">Annual Amount ($)</Label>
                            <Input id="event-amount" type="number" value={eventAmount} onChange={e => setEventAmount(e.target.value)} placeholder="50000" data-testid="input-event-amount" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="event-start-age">Start Age</Label>
                            <Input id="event-start-age" type="number" value={eventStartAge} onChange={e => setEventStartAge(e.target.value)} data-testid="input-event-start-age" />
                          </div>
                          <div>
                            <Label htmlFor="event-end-age">End Age (leave empty for one-time)</Label>
                            <Input id="event-end-age" type="number" value={eventEndAge} onChange={e => setEventEndAge(e.target.value)} data-testid="input-event-end-age" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={eventInflationAdjusted} onChange={e => setEventInflationAdjusted(e.target.checked)} id="inflation-adj" data-testid="checkbox-inflation-adj" />
                          <Label htmlFor="inflation-adj" className="text-sm">Adjust for inflation</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAddEvent(false)} data-testid="button-cancel-event">Cancel</Button>
                          <Button
                            onClick={() => addEventMutation.mutate()}
                            disabled={!eventName || !eventAmount || !eventStartAge || addEventMutation.isPending}
                            data-testid="button-save-event"
                          >
                            {addEventMutation.isPending ? "Adding..." : "Add Event"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {results && (
                    <Card style={V2_CARD}>
                      <CardHeader className="pb-3">
                        <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
                          <div className="w-6 h-6 rounded bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
                            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          Simulation Results
                          <Badge variant="outline" className="text-[10px] ml-auto">{results.numSimulations} simulations</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center gap-6 flex-wrap" data-testid="text-success-rate">
                          <Score value={successRate ?? 0} max={100} size={72} label="Success" showPercent />
                          <div className="flex-1 min-w-[200px]">
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${successRate ?? 0}%`, background: (successRate ?? 0) >= 80 ? P.grn : (successRate ?? 0) >= 60 ? P.amb : P.red }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-[#C7D0DD] mt-1">
                              <span>0%</span>
                              <span>{(successRate ?? 0) >= 80 ? "On Track" : (successRate ?? 0) >= 60 ? "Needs Attention" : "At Risk"}</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="p-3 rounded-md bg-muted/40">
                            <div className="text-[14px] text-[#C7D0DD] uppercase tracking-wide">Median Final Balance</div>
                            <div className="font-semibold text-lg">{ffc(results.finalBalanceStats?.median ?? 0)}</div>
                          </div>
                          <div className="p-3 rounded-md bg-muted/40">
                            <div className="text-[14px] text-[#C7D0DD] uppercase tracking-wide">Best Case (90th)</div>
                            <div className="font-semibold text-lg" style={{ color: P.grn }}>{ffc(results.finalBalanceStats?.p90 ?? 0)}</div>
                          </div>
                          <div className="p-3 rounded-md bg-muted/40">
                            <div className="text-[14px] text-[#C7D0DD] uppercase tracking-wide">Worst Case (10th)</div>
                            <div className="font-semibold text-lg" style={{ color: P.red }}>{ffc(results.finalBalanceStats?.p10 ?? 0)}</div>
                          </div>
                          <div className="p-3 rounded-md bg-muted/40">
                            <div className="text-[14px] text-[#C7D0DD] uppercase tracking-wide">Average</div>
                            <div className="font-semibold text-lg">{ffc(results.finalBalanceStats?.mean ?? 0)}</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-3">Projected Wealth Over Time</h4>
                          <div className="h-[350px]" ref={chartContainerRef} role="img" aria-label="Projected wealth over time showing Monte Carlo simulation percentiles from age to retirement">
                            <ChartContainer
                              config={monteCarloChartConfig}
                              className="h-full w-full"
                            >
                              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                                <defs>
                                  <linearGradient id="band90" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-p90)" stopOpacity={0.08} />
                                    <stop offset="100%" stopColor="var(--color-p90)" stopOpacity={0.02} />
                                  </linearGradient>
                                  <linearGradient id="band75" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-p75)" stopOpacity={0.12} />
                                    <stop offset="100%" stopColor="var(--color-p75)" stopOpacity={0.04} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: "Age", position: "bottom", offset: 0, fontSize: 12 }} />
                                <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={70} />
                                <ChartTooltip
                                  content={
                                    <ChartTooltipContent
                                      formatter={(value, name) => [ffc(value as number), name]}
                                      labelFormatter={(label) => `Age ${label}`}
                                    />
                                  }
                                />
                                <Area type="monotone" dataKey="p90" stroke="var(--color-p90)" fill="url(#band90)" strokeWidth={1} name="90th Percentile" dot={false} />
                                <Area type="monotone" dataKey="p75" stroke="var(--color-p75)" fill="url(#band75)" strokeWidth={1} name="75th Percentile" dot={false} />
                                <Area type="monotone" dataKey="p50" stroke="var(--color-p50)" fill="none" strokeWidth={2.5} name="Median (50th)" dot={false} />
                                <Area type="monotone" dataKey="p25" stroke="var(--color-p25)" fill="none" strokeWidth={1} strokeDasharray="4 4" name="25th Percentile" dot={false} />
                                <Area type="monotone" dataKey="p10" stroke="var(--color-p10)" fill="none" strokeWidth={1} strokeDasharray="4 4" name="10th Percentile" dot={false} />
                                <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
                              </AreaChart>
                            </ChartContainer>
                          </div>
                        </div>

                        {results.yearOfDepletion?.median && (
                          <SignalCard level="action-needed" title="Depletion Risk">
                            In scenarios where the portfolio runs out, the median depletion age is {results.yearOfDepletion?.median}.
                            Consider reducing spending, increasing contributions, or adjusting the retirement age.
                          </SignalCard>
                        )}

                        <CassidyAnalysisButton
                          taskType="analysis"
                          clientId={clientId}
                          context={{
                            analysisType: "retirement",
                            clientName,
                            scenarioName: selectedScenario.name,
                            currentAge: selectedScenario.currentAge,
                            retirementAge: selectedScenario.retirementAge,
                            lifeExpectancy: selectedScenario.lifeExpectancy,
                            annualSpending: parseFloat(selectedScenario.annualSpending),
                            expectedReturn: parseFloat(selectedScenario.expectedReturn),
                            returnStdDev: parseFloat(selectedScenario.returnStdDev),
                            inflationRate: parseFloat(selectedScenario.inflationRate),
                            portfolioValue: totalAum,
                            successRate: results.successRate,
                            medianFinalBalance: results.finalBalanceStats?.median ?? 0,
                            p10FinalBalance: results.finalBalanceStats?.p10 ?? 0,
                            p90FinalBalance: results.finalBalanceStats?.p90 ?? 0,
                            medianDepletionAge: results.yearOfDepletion?.median || null,
                            events: (selectedScenario.events || []).map((e) => ({
                              name: e.name,
                              type: e.type,
                              amount: parseFloat(e.amount),
                              startAge: e.startAge,
                              endAge: e.endAge || null,
                            })),
                          }}
                          label="Interpret Projections"
                          variant="outline"
                          displayMode="inline"
                        />
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card style={V2_CARD}>
                <CardHeader className="pb-3">
                  <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
                    <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    Analysis Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Current Age</Label>
                      <Input type="number" value={currentAge} onChange={e => setCurrentAge(e.target.value)} data-testid="input-ra-current-age" />
                    </div>
                    <div>
                      <Label className="text-xs">Retire Age</Label>
                      <Input type="number" value={retirementAge} onChange={e => setRetirementAge(e.target.value)} data-testid="input-ra-retire-age" />
                    </div>
                    <div>
                      <Label className="text-xs">Life Exp.</Label>
                      <Input type="number" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} data-testid="input-ra-life-exp" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Annual Spending</Label>
                      <Input type="number" value={annualSpending} onChange={e => setAnnualSpending(e.target.value)} data-testid="input-ra-spending" />
                    </div>
                    <div>
                      <Label className="text-xs">Annual Contribution</Label>
                      <Input type="number" value={preRetirementContribution} onChange={e => setPreRetirementContribution(e.target.value)} data-testid="input-ra-contribution" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Return (%)</Label>
                      <Input type="number" step="0.1" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} data-testid="input-ra-return" />
                    </div>
                    <div>
                      <Label className="text-xs">Inflation (%)</Label>
                      <Input type="number" step="0.1" value={inflationRate} onChange={e => setInflationRate(e.target.value)} data-testid="input-ra-inflation" />
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-[#C7D0DD] mb-2">Social Security</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Monthly PIA ($)</Label>
                        <Input type="number" value={ssPIA} onChange={e => setSSPIA(e.target.value)} data-testid="input-ra-ss-pia" />
                      </div>
                      <div>
                        <Label className="text-xs">Claiming Age</Label>
                        <Input type="number" min="62" max="70" value={ssClaimAge} onChange={e => setSSClaimAge(e.target.value)} data-testid="input-ra-ss-age" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs">Spouse PIA (optional)</Label>
                      <Input type="number" value={spousePIA} onChange={e => setSpousePIA(e.target.value)} placeholder="0" data-testid="input-ra-spouse-pia" />
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-[#C7D0DD] mb-2">Pension</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Annual Benefit</Label>
                        <Input type="number" value={pensionBenefit} onChange={e => setPensionBenefit(e.target.value)} placeholder="0" data-testid="input-ra-pension" />
                      </div>
                      <div>
                        <Label className="text-xs">Lump Sum Option</Label>
                        <Input type="number" value={pensionLumpSum} onChange={e => setPensionLumpSum(e.target.value)} placeholder="0" data-testid="input-ra-pension-lump" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-[#C7D0DD] mb-2">Passive Income</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Rental Income ($/yr)</Label>
                        <Input type="number" value={rentalIncome} onChange={e => setRentalIncome(e.target.value)} placeholder="0" data-testid="input-ra-rental" />
                      </div>
                      <div>
                        <Label className="text-xs">Vacancy Rate (%)</Label>
                        <Input type="number" value={rentalVacancy} onChange={e => setRentalVacancy(e.target.value)} placeholder="5" data-testid="input-ra-vacancy" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-[#C7D0DD] mb-2">Account Balances</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Traditional</Label>
                        <Input type="number" value={traditionalBalance} onChange={e => setTraditionalBalance(e.target.value)} placeholder="0" data-testid="input-ra-trad" />
                      </div>
                      <div>
                        <Label className="text-xs">Roth</Label>
                        <Input type="number" value={rothBalance} onChange={e => setRothBalance(e.target.value)} placeholder="0" data-testid="input-ra-roth" />
                      </div>
                      <div>
                        <Label className="text-xs">Taxable</Label>
                        <Input type="number" value={taxableBalance} onChange={e => setTaxableBalance(e.target.value)} placeholder="0" data-testid="input-ra-taxable" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-[#C7D0DD] mb-2">Tax & Filing</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Marginal Rate (%)</Label>
                        <Input type="number" value={marginalRate} onChange={e => setMarginalRate(e.target.value)} data-testid="input-ra-marginal" />
                      </div>
                      <div>
                        <Label className="text-xs">State Rate (%)</Label>
                        <Input type="number" value={stateRate} onChange={e => setStateRate(e.target.value)} data-testid="input-ra-state" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs">Filing Status</Label>
                      <Select value={filingStatus} onValueChange={setFilingStatus}>
                        <SelectTrigger data-testid="select-ra-filing">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-2"
                    onClick={() => runAnalysisMutation.mutate()}
                    disabled={runAnalysisMutation.isPending}
                    data-testid="button-run-analysis"
                  >
                    {runAnalysisMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" />}
                    {runAnalysisMutation.isPending ? "Analyzing..." : "Run Full Analysis"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {!ar && !runAnalysisMutation.isPending && (
                <Card style={V2_CARD}>
                  <CardContent className="py-16 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Comprehensive Retirement Analysis</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      Run multi-scenario projections, Social Security optimization, expense modeling, gap analysis with remediation strategies, and tax-efficient withdrawal sequencing.
                    </p>
                    <Button onClick={() => runAnalysisMutation.mutate()} disabled={runAnalysisMutation.isPending} data-testid="button-run-analysis-cta">
                      <Target className="w-4 h-4 mr-2" /> Run Full Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}

              {runAnalysisMutation.isPending && (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              )}

              {ar && (
                <>
                  <GapSummaryCard gap={ar.gapAnalysis} />

                  <Tabs value={analysisTab} onValueChange={setAnalysisTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="comparison" className="text-xs" data-testid="tab-comparison">Scenarios</TabsTrigger>
                      <TabsTrigger value="social-security" className="text-xs" data-testid="tab-ss">SS</TabsTrigger>
                      <TabsTrigger value="expenses" className="text-xs" data-testid="tab-expenses">Expenses</TabsTrigger>
                      <TabsTrigger value="gap" className="text-xs" data-testid="tab-gap">Gap</TabsTrigger>
                      <TabsTrigger value="withdrawal" className="text-xs" data-testid="tab-withdrawal">Withdrawal</TabsTrigger>
                      <TabsTrigger value="phased" className="text-xs" data-testid="tab-phased">Phased</TabsTrigger>
                    </TabsList>

                    <TabsContent value="comparison" className="mt-4 space-y-4">
                      <ScenarioComparisonPanel scenarios={ar.scenarios} />
                    </TabsContent>

                    <TabsContent value="social-security" className="mt-4 space-y-4">
                      <SSOptimizationPanel ss={ar.socialSecurity} pension={ar.pension} />
                    </TabsContent>

                    <TabsContent value="expenses" className="mt-4 space-y-4">
                      <ExpenseModelPanel expense={ar.expenseModel} />
                    </TabsContent>

                    <TabsContent value="gap" className="mt-4 space-y-4">
                      <GapRemediationPanel gap={ar.gapAnalysis} />
                    </TabsContent>

                    <TabsContent value="withdrawal" className="mt-4 space-y-4">
                      <WithdrawalSequencePanel withdrawal={ar.withdrawalSequence} />
                    </TabsContent>

                    <TabsContent value="phased" className="mt-4 space-y-4">
                      <PhasedRetirementPanel phased={ar.phasedRetirement} passiveIncome={ar.passiveIncome} />
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GapSummaryCard({ gap }: { gap: GapAnalysisResult }) {
  const ratingColors: Record<string, string> = {
    on_track: "text-emerald-600 dark:text-emerald-400",
    needs_attention: "text-amber-600 dark:text-amber-400",
    at_risk: "text-orange-600 dark:text-orange-400",
    critical: "text-red-600 dark:text-red-400",
  };
  const ratingLabels: Record<string, string> = {
    on_track: "On Track",
    needs_attention: "Needs Attention",
    at_risk: "At Risk",
    critical: "Critical",
  };
  const ratingIcons: Record<string, typeof CheckCircle2> = {
    on_track: CheckCircle2,
    needs_attention: AlertTriangle,
    at_risk: AlertTriangle,
    critical: XCircle,
  };
  const Icon = ratingIcons[gap.readinessRating] || AlertTriangle;

  return (
    <Card style={V2_CARD}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Score value={gap.fundedPercentage} max={100} size={56} label="Funded" showPercent />
            <div>
              <div className={`text-lg font-bold flex items-center gap-1.5 ${ratingColors[gap.readinessRating]}`}>
                <Icon className="w-4 h-4" />
                {ratingLabels[gap.readinessRating]}
              </div>
              <p className="text-xs text-[#C7D0DD]">
                {gap.gap <= 0 ? "Surplus of " + ffc(Math.abs(gap.gap)) : "Gap of " + ffc(gap.gap)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="text-[10px] text-[#C7D0DD] uppercase">Assets</div>
              <div className="font-semibold" data-testid="text-total-assets">{ffc(gap.totalAssetsAvailable)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#C7D0DD] uppercase">Needs</div>
              <div className="font-semibold" data-testid="text-total-needs">{ffc(gap.totalRetirementNeeds)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#C7D0DD] uppercase">Success Prob.</div>
              <div className="font-semibold" data-testid="text-success-prob">{gap.successProbability}%</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScenarioComparisonPanel({ scenarios }: { scenarios: ScenarioProjection[] }) {
  if (!scenarios || scenarios.length === 0) return <Card style={V2_CARD}><CardContent className="py-8 text-center text-sm text-muted-foreground">No scenario data available</CardContent></Card>;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenarios.map((s) => (
          <Card key={s.name} style={V2_CARD} data-testid={`scenario-compare-${s.name.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{s.name}</span>
                <Score value={s.successProbability} max={100} size={32} showPercent />
              </div>
              <p className="text-xs text-[#C7D0DD] mb-3">{s.description}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#C7D0DD]">Terminal Value</span>
                  <span className="font-mono font-medium">{ffc(s.terminalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C7D0DD]">Avg Annual Balance</span>
                  <span className="font-mono font-medium">{ffc(s.averageAnnualBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C7D0DD]">Depletion Age</span>
                  <span className="font-mono font-medium">{s.portfolioDepletionAge || "Never"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C7D0DD]">First Decline</span>
                  <span className="font-mono font-medium">{s.firstYearOfDecline ? `Age ${s.firstYearOfDecline}` : "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className="" style={V2_TITLE}>Scenario Comparison Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ChartContainer
              config={{
                base: { label: "Base Case", theme: { light: "hsl(213, 72%, 50%)", dark: "hsl(213, 72%, 60%)" } },
                optimistic: { label: "Optimistic", theme: { light: "hsl(168, 55%, 45%)", dark: "hsl(168, 55%, 55%)" } },
                pessimistic: { label: "Pessimistic", theme: { light: "hsl(0, 70%, 50%)", dark: "hsl(0, 70%, 60%)" } },
                early: { label: "Early Retirement", theme: { light: "hsl(28, 70%, 50%)", dark: "hsl(28, 70%, 60%)" } },
                extended: { label: "Extended Career", theme: { light: "hsl(270, 60%, 55%)", dark: "hsl(270, 60%, 65%)" } },
              } satisfies ChartConfig}
              className="h-full w-full"
            >
              <LineChart
                data={scenarios[0]?.yearByYear?.filter((_: unknown, i: number) => i % 2 === 0).map((y, i: number) => ({
                  age: y.age,
                  base: scenarios[0]?.yearByYear?.[i * 2]?.portfolioBalance || 0,
                  optimistic: scenarios[1]?.yearByYear?.[i * 2]?.portfolioBalance || 0,
                  pessimistic: scenarios[2]?.yearByYear?.[i * 2]?.portfolioBalance || 0,
                  early: scenarios[3]?.yearByYear?.[i * 2]?.portfolioBalance || 0,
                  extended: scenarios[4]?.yearByYear?.[i * 2]?.portfolioBalance || 0,
                })) || []}
                margin={{ top: 5, right: 20, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: "Age", position: "bottom", offset: 0, fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [ffc(value as number), name]} labelFormatter={(label) => `Age ${label}`} />} />
                <Line type="monotone" dataKey="base" stroke="var(--color-base)" strokeWidth={2} dot={false} name="Base Case" />
                <Line type="monotone" dataKey="optimistic" stroke="var(--color-optimistic)" strokeWidth={1.5} dot={false} name="Optimistic" />
                <Line type="monotone" dataKey="pessimistic" stroke="var(--color-pessimistic)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Pessimistic" />
                <Line type="monotone" dataKey="early" stroke="var(--color-early)" strokeWidth={1.5} dot={false} strokeDasharray="6 3" name="Early Retirement" />
                <Line type="monotone" dataKey="extended" stroke="var(--color-extended)" strokeWidth={1.5} dot={false} name="Extended Career" />
                <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function SSOptimizationPanel({ ss, pension }: { ss: SSAnalysisResult; pension: PensionComparison | null }) {
  if (!ss?.claimingOptions) return <Card style={V2_CARD}><CardContent className="py-8 text-center text-sm text-muted-foreground">No Social Security data available</CardContent></Card>;
  return (
    <>
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
            <Shield className="w-4 h-4 text-blue-600" />
            Social Security Claiming Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claiming Age</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Annual</TableHead>
                  <TableHead>Adjustment</TableHead>
                  <TableHead className="text-right">Break-Even</TableHead>
                  <TableHead className="text-right">Lifetime PV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ss.claimingOptions.map((opt) => (
                  <TableRow
                    key={opt.claimingAge}
                    className={opt.claimingAge === ss.optimalClaimingAge ? "bg-primary/5" : ""}
                    data-testid={`ss-row-${opt.claimingAge}`}
                  >
                    <TableCell className="font-medium">
                      {opt.claimingAge}
                      {opt.claimingAge === ss.optimalClaimingAge && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">Optimal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">${opt.monthlyBenefit.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{ffc(opt.annualBenefit)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={opt.claimingAge < 67 ? "destructive" : opt.claimingAge > 67 ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {opt.reductionOrBonus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{opt.breakEvenAge ? `Age ${opt.breakEvenAge}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{ffc(opt.lifetimePresentValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {ss.couplesStrategy && (
            <SignalCard level="info" title="Couples Coordination Strategy" className="mt-4">
              {ss.couplesStrategy}
            </SignalCard>
          )}

          {ss.couplesMatrix && ss.couplesMatrix.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Couples Claiming Age Matrix (Top Combinations)</div>
              <div className="overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Primary Age</TableHead>
                      <TableHead>Spouse Age</TableHead>
                      <TableHead className="text-right">Combined Annual</TableHead>
                      <TableHead className="text-right">Lifetime PV</TableHead>
                      <TableHead className="text-right">Survivor Benefit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...ss.couplesMatrix]
                      .sort((a: CouplesSSCombo, b: CouplesSSCombo) => b.combinedLifetimePV - a.combinedLifetimePV)
                      .slice(0, 10)
                      .map((combo: CouplesSSCombo) => (
                      <TableRow
                        key={`${combo.primaryAge}-${combo.spouseAge}`}
                        className={ss.optimalCouplesCombination && combo.primaryAge === ss.optimalCouplesCombination.primaryAge && combo.spouseAge === ss.optimalCouplesCombination.spouseAge ? "bg-primary/5" : ""}
                        data-testid={`couples-combo-${combo.primaryAge}-${combo.spouseAge}`}
                      >
                        <TableCell className="font-medium">{combo.primaryAge}</TableCell>
                        <TableCell>{combo.spouseAge}</TableCell>
                        <TableCell className="text-right font-mono">{ffc(combo.combinedAnnual)}</TableCell>
                        <TableCell className="text-right font-mono">{ffc(combo.combinedLifetimePV)}</TableCell>
                        <TableCell className="text-right font-mono">{ffc(combo.survivorBenefit)}/yr</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {pension && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
              <Briefcase className="w-4 h-4 text-amber-600" />
              Pension Payout Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase tracking-wide mb-1">Lump Sum</div>
                <div className="font-semibold">{ffc(pension.lumpSum.amount)}</div>
                <div className="text-xs text-[#C7D0DD] mt-1">Projected at 85: {ffc(pension.lumpSum.projectedValueAt85)}</div>
                {pension.lumpSum.breakEvenAge && (
                  <div className="text-xs text-[#C7D0DD]">Break-even: Age {pension.lumpSum.breakEvenAge}</div>
                )}
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase tracking-wide mb-1">Single Life Annuity</div>
                <div className="font-semibold">{ffc(pension.singleLifeAnnuity.annualPayment)}/yr</div>
                <div className="text-xs text-[#C7D0DD] mt-1">Total to 85: {ffc(pension.singleLifeAnnuity.totalPaymentsTo85)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase tracking-wide mb-1">Joint & Survivor</div>
                <div className="font-semibold">{ffc(pension.jointSurvivorAnnuity.annualPayment)}/yr</div>
                <div className="text-xs text-[#C7D0DD] mt-1">Total to 85: {ffc(pension.jointSurvivorAnnuity.totalPaymentsTo85)}</div>
                <div className="text-xs text-[#C7D0DD]">Survivor: {ffc(pension.jointSurvivorAnnuity.survivalBenefit)}/yr</div>
              </div>
              <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
                <div className="text-[10px] text-[#C7D0DD] uppercase tracking-wide mb-1">Hybrid (50/50)</div>
                <div className="font-semibold">{ffc(pension.hybridApproach.combinedProjectedValue)}</div>
                <div className="text-xs text-[#C7D0DD] mt-1">Annuity: {ffc(pension.hybridApproach.annuityPortion)}</div>
                <div className="text-xs text-[#C7D0DD]">Invested: {ffc(pension.hybridApproach.investedPortion)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ExpenseModelPanel({ expense }: { expense: ExpenseModelResult }) {
  if (!expense?.phases) return <Card style={V2_CARD}><CardContent className="py-8 text-center text-sm text-muted-foreground">No expense data available</CardContent></Card>;
  return (
    <>
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
            <DollarSign className="w-4 h-4 text-green-600" />
            Expense Phase Model
            <Badge variant="outline" className="ml-auto text-[10px]">
              Lifetime: {ffc(expense.totalLifetimeSpending)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expense.phases.map((phase) => (
              <div key={phase.name} className="p-3 rounded-md bg-muted/40" data-testid={`phase-${phase.name.split(" ")[0].toLowerCase()}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{phase.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    Age {phase.startAge}–{phase.endAge}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs mt-2">
                  <div>
                    <span className="text-[#C7D0DD]">Base Spending</span>
                    <div className="font-mono font-medium">{ffc(phase.baseSpending)}/yr</div>
                  </div>
                  <div>
                    <span className="text-[#C7D0DD]">Healthcare</span>
                    <div className="font-mono font-medium">{ffc(phase.healthcareCost)}/yr</div>
                  </div>
                  <div>
                    <span className="text-[#C7D0DD]">Total</span>
                    <div className="font-mono font-semibold">{ffc(phase.totalAnnual)}/yr</div>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${phase.spendingMultiplier * 90}%`,
                      background: phase.spendingMultiplier >= 1.0 ? P.amb : P.grn,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
            <Heart className="w-4 h-4 text-red-500" />
            Healthcare Cost Projection (5% inflation)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ChartContainer
              config={{
                cost: { label: "Healthcare Cost", theme: { light: "hsl(0, 70%, 50%)", dark: "hsl(0, 70%, 60%)" } },
              } satisfies ChartConfig}
              className="h-full w-full"
            >
              <AreaChart
                data={expense.healthcareProjection.filter((_: unknown, i: number) => i % 2 === 0)}
                margin={{ top: 5, right: 20, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => [ffc(value as number), "Annual Cost"]} labelFormatter={(label) => `Age ${label}`} />} />
                <Area type="monotone" dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.1} strokeWidth={2} dot={false} name="Healthcare Cost" />
              </AreaChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {expense.oneTimeExpenses.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="" style={V2_TITLE}>Budgeted One-Time Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expense.oneTimeExpenses.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm" data-testid={`onetime-expense-${i}`}>
                  <div>
                    <span className="font-medium">{e.description}</span>
                    <span className="text-[#C7D0DD] ml-2 text-xs">Age {e.age}</span>
                  </div>
                  <span className="font-mono font-medium">{ffc(e.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {expense.ltcProbability && expense.ltcProbability.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
              <Heart className="w-4 h-4 text-red-500" />
              Long-Term Care Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase tracking-wide mb-1">Expected LTC Cost</div>
                <div className="font-semibold text-lg" data-testid="text-expected-ltc-cost">{ffc(expense.expectedLTCCost)}</div>
                <div className="text-xs text-[#C7D0DD] mt-1">Probability-weighted lifetime estimate</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase tracking-wide mb-1">Peak Probability Age</div>
                <div className="font-semibold text-lg" data-testid="text-peak-ltc-age">
                  {expense.ltcProbability.reduce((max, e) => e.probabilityOfNeed > max.probabilityOfNeed ? e : max).age}
                </div>
                <div className="text-xs text-[#C7D0DD] mt-1">
                  {expense.ltcProbability.reduce((max, e) => e.probabilityOfNeed > max.probabilityOfNeed ? e : max).probabilityOfNeed}% probability
                </div>
              </div>
            </div>
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Probability</TableHead>
                    <TableHead className="text-right">Annual Cost</TableHead>
                    <TableHead className="text-right">Weighted Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expense.ltcProbability.filter((_: unknown, i: number) => i % 2 === 0).map((entry) => (
                    <TableRow key={entry.age} data-testid={`ltc-row-${entry.age}`}>
                      <TableCell className="font-medium">{entry.age}</TableCell>
                      <TableCell className="text-right">{entry.probabilityOfNeed}%</TableCell>
                      <TableCell className="text-right font-mono">{ffc(entry.expectedAnnualCost)}</TableCell>
                      <TableCell className="text-right font-mono">{ffc(entry.weightedCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function GapRemediationPanel({ gap }: { gap: GapAnalysisResult }) {
  if (!gap?.remediations) return <Card style={V2_CARD}><CardContent className="py-8 text-center text-sm text-muted-foreground">No gap analysis data available</CardContent></Card>;
  const barData = gap.remediations.map((r) => ({
    name: r.strategy.length > 20 ? r.strategy.substring(0, 20) + "…" : r.strategy,
    fullName: r.strategy,
    closure: r.gapClosurePercent,
    impact: r.impact,
  }));

  return (
    <>
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
            <Target className="w-4 h-4 text-violet-600" />
            Retirement Readiness Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-[10px] text-[#C7D0DD] uppercase">Projected Assets</div>
              <div className="font-semibold text-lg" data-testid="text-gap-assets">{ffc(gap.totalAssetsAvailable)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-[10px] text-[#C7D0DD] uppercase">Retirement Needs</div>
              <div className="font-semibold text-lg" data-testid="text-gap-needs">{ffc(gap.totalRetirementNeeds)}</div>
            </div>
            <div className={`p-3 rounded-md ${gap.gap > 0 ? "bg-red-500/5 border border-red-500/20" : "bg-emerald-500/5 border border-emerald-500/20"}`}>
              <div className="text-[10px] text-[#C7D0DD] uppercase">{gap.gap > 0 ? "Shortfall" : "Surplus"}</div>
              <div className={`font-semibold text-lg ${gap.gap > 0 ? "text-red-600" : "text-emerald-600"}`} data-testid="text-gap-amount">
                {ffc(Math.abs(gap.gap))}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-[10px] text-[#C7D0DD] uppercase">Funded</div>
              <div className="font-semibold text-lg" data-testid="text-gap-funded">{gap.fundedPercentage}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className="" style={V2_TITLE}>Gap Remediation Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gap.remediations.map((r, i) => (
            <div key={i} className="p-3 rounded-md bg-muted/40" data-testid={`remediation-${i}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{r.strategy}</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={r.feasibility === "high" ? "secondary" : r.feasibility === "medium" ? "outline" : "destructive"}
                    className="text-[10px]"
                  >
                    {r.feasibility} feasibility
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {r.gapClosurePercent}% closure
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-[#C7D0DD] mb-2">{r.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, r.gapClosurePercent)}%`,
                      background: r.gapClosurePercent >= 80 ? P.grn : r.gapClosurePercent >= 40 ? P.amb : P.red,
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-medium text-[#C7D0DD]">{ffc(r.impact)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className="" style={V2_TITLE}>Gap Closure Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ChartContainer
              config={{
                closure: { label: "Gap Closure %", theme: { light: "hsl(213, 72%, 50%)", dark: "hsl(213, 72%, 60%)" } },
              } satisfies ChartConfig}
              className="h-full w-full"
            >
              <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`${value}%`, "Gap Closure"]} />} />
                <Bar dataKey="closure" fill="var(--color-closure)" radius={[0, 4, 4, 0]} name="Gap Closure %" />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function WithdrawalSequencePanel({ withdrawal }: { withdrawal: WithdrawalSequenceResult }) {
  if (!withdrawal?.drawdownPriority) return <Card style={V2_CARD}><CardContent className="py-8 text-center text-sm text-muted-foreground">No withdrawal data available</CardContent></Card>;
  return (
    <>
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
            <ArrowRight className="w-4 h-4 text-blue-600" />
            Account Draw-Down Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {withdrawal.drawdownPriority.map((p) => (
              <div key={p.order} className="flex items-start gap-3 p-3 rounded-md bg-muted/40" data-testid={`drawdown-priority-${p.order}`}>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{p.order}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">{p.accountType}</div>
                  <div className="text-xs text-[#C7D0DD]">{p.rationale}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {withdrawal.rothConversionLadder.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="" style={V2_TITLE}>Roth Conversion Ladder Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Tax Cost</TableHead>
                    <TableHead>Bracket</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawal.rothConversionLadder.map((r) => (
                    <TableRow key={r.year} data-testid={`roth-ladder-${r.year}`}>
                      <TableCell className="font-medium">{r.year}</TableCell>
                      <TableCell>{r.age}</TableCell>
                      <TableCell className="text-right font-mono">{ffc(r.conversionAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{ffc(r.taxCost)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.bracketUtilized}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{ffc(r.cumulativeConverted)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className="" style={V2_TITLE}>Year-by-Year Withdrawal Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">RMD</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">Traditional</TableHead>
                  <TableHead className="text-right">Roth</TableHead>
                  <TableHead className="text-right">Est. Tax</TableHead>
                  <TableHead className="text-right">After-Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawal.yearByYearPlan.filter((_: unknown, i: number) => i % 2 === 0).slice(0, 15).map((y) => (
                  <TableRow key={y.age} data-testid={`withdrawal-year-${y.age}`}>
                    <TableCell className="font-medium">{y.age}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{y.rmdAmount > 0 ? ffc(y.rmdAmount) : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{ffc(y.taxableWithdrawal)}</TableCell>
                    <TableCell className="text-right font-mono">{ffc(y.traditionalWithdrawal)}</TableCell>
                    <TableCell className="text-right font-mono">{ffc(y.rothWithdrawal)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{ffc(y.estimatedTax)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{ffc(y.afterTaxIncome)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="h-[250px] mt-4">
            <ChartContainer
              config={{
                taxableBalance: { label: "Taxable", theme: { light: "hsl(213, 72%, 50%)", dark: "hsl(213, 72%, 60%)" } },
                traditionalBalance: { label: "Traditional", theme: { light: "hsl(28, 70%, 50%)", dark: "hsl(28, 70%, 60%)" } },
                rothBalance: { label: "Roth", theme: { light: "hsl(168, 55%, 45%)", dark: "hsl(168, 55%, 55%)" } },
              } satisfies ChartConfig}
              className="h-full w-full"
            >
              <AreaChart
                data={withdrawal.yearByYearPlan.filter((_: unknown, i: number) => i % 2 === 0)}
                margin={{ top: 5, right: 20, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [ffc(value as number), name]} labelFormatter={(label) => `Age ${label}`} />} />
                <Area type="monotone" dataKey="taxableBalance" stackId="1" stroke="var(--color-taxableBalance)" fill="var(--color-taxableBalance)" fillOpacity={0.3} name="Taxable" />
                <Area type="monotone" dataKey="traditionalBalance" stackId="1" stroke="var(--color-traditionalBalance)" fill="var(--color-traditionalBalance)" fillOpacity={0.3} name="Traditional" />
                <Area type="monotone" dataKey="rothBalance" stackId="1" stroke="var(--color-rothBalance)" fill="var(--color-rothBalance)" fillOpacity={0.3} name="Roth" />
                <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
              </AreaChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function PhasedRetirementPanel({ phased, passiveIncome }: { phased: PhasedRetirementProjection; passiveIncome: PassiveIncomeSustainability | null }) {
  if (!phased?.phases) return <Card style={V2_CARD}><CardContent className="py-8 text-center text-sm text-muted-foreground">No phased retirement data available</CardContent></Card>;
  return (
    <>
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
            <Briefcase className="w-4 h-4 text-amber-600" />
            Employment Transition Phases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {phased.phases.map((p) => (
              <div key={p.name} className="p-3 rounded-md bg-muted/40" data-testid={`phase-transition-${p.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">Age {p.startAge}–{p.endAge}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[#C7D0DD]">Earned Income</span>
                    <div className="font-mono font-medium">{ffc(p.earnedIncome)}</div>
                  </div>
                  <div>
                    <span className="text-[#C7D0DD]">SS Income</span>
                    <div className="font-mono font-medium">{ffc(p.ssIncome)}</div>
                  </div>
                  <div>
                    <span className="text-[#C7D0DD]">Portfolio Draw</span>
                    <div className="font-mono font-medium">{ffc(p.portfolioDraw)}</div>
                  </div>
                  <div>
                    <span className="text-[#C7D0DD]">Total Income</span>
                    <div className="font-mono font-semibold">{ffc(p.totalIncome)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className="" style={V2_TITLE}>Income Sources Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ChartContainer
              config={{
                earnedIncome: { label: "Earned Income", theme: { light: "hsl(213, 72%, 50%)", dark: "hsl(213, 72%, 60%)" } },
                ssIncome: { label: "Social Security", theme: { light: "hsl(168, 55%, 45%)", dark: "hsl(168, 55%, 55%)" } },
                portfolioDraw: { label: "Portfolio Draw", theme: { light: "hsl(28, 70%, 50%)", dark: "hsl(28, 70%, 60%)" } },
              } satisfies ChartConfig}
              className="h-full w-full"
            >
              <AreaChart
                data={phased.yearByYear.filter((_: unknown, i: number) => i % 2 === 0)}
                margin={{ top: 5, right: 20, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [ffc(value as number), name]} labelFormatter={(label) => `Age ${label}`} />} />
                <Area type="monotone" dataKey="earnedIncome" stackId="1" stroke="var(--color-earnedIncome)" fill="var(--color-earnedIncome)" fillOpacity={0.3} name="Earned Income" />
                <Area type="monotone" dataKey="ssIncome" stackId="1" stroke="var(--color-ssIncome)" fill="var(--color-ssIncome)" fillOpacity={0.3} name="Social Security" />
                <Area type="monotone" dataKey="portfolioDraw" stackId="1" stroke="var(--color-portfolioDraw)" fill="var(--color-portfolioDraw)" fillOpacity={0.3} name="Portfolio Draw" />
                <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
              </AreaChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {passiveIncome && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
              <DollarSign className="w-4 h-4 text-green-600" />
              Passive Income Sustainability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase">Gross Annual</div>
                <div className="font-semibold" data-testid="text-passive-gross">{ffc(passiveIncome.grossAnnualIncome)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase">Net Annual</div>
                <div className="font-semibold" data-testid="text-passive-net">{ffc(passiveIncome.netAnnualIncome)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase">Vacancy Rate</div>
                <div className="font-semibold">{(passiveIncome.vacancyRate * 100).toFixed(0)}%</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-[10px] text-[#C7D0DD] uppercase">Maintenance</div>
                <div className="font-semibold">{(passiveIncome.maintenanceFactor * 100).toFixed(0)}%</div>
              </div>
            </div>

            <div className="h-[200px]">
              <ChartContainer
                config={{
                  netIncome: { label: "Net Rental Income", theme: { light: "hsl(168, 55%, 45%)", dark: "hsl(168, 55%, 55%)" } },
                } satisfies ChartConfig}
                className="h-full w-full"
              >
                <AreaChart
                  data={passiveIncome.yearByYear.filter((_: unknown, i: number) => i % 2 === 0)}
                  margin={{ top: 5, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={70} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [ffc(value as number), name]} labelFormatter={(label) => `Age ${label}`} />} />
                  <Area type="monotone" dataKey="netIncome" stroke="var(--color-netIncome)" fill="var(--color-netIncome)" fillOpacity={0.15} strokeWidth={2} dot={false} name="Net Rental Income" />
                  <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
                </AreaChart>
              </ChartContainer>
            </div>

            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passiveIncome.yearByYear.filter((_: unknown, i: number) => i % 5 === 0).map((y) => (
                  <TableRow key={y.age} data-testid={`passive-income-${y.age}`}>
                    <TableCell className="font-medium">{y.age}</TableCell>
                    <TableCell className="text-right font-mono">{ffc(y.grossIncome)}</TableCell>
                    <TableCell className="text-right font-mono">{ffc(y.netIncome)}</TableCell>
                    <TableCell className="text-right font-mono">{ffc(y.cumulativeNet)}</TableCell>
                    <TableCell className="text-right font-mono">{y.spendingCoverage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
