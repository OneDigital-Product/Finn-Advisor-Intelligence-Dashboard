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
  Loader2, ArrowLeft, DollarSign, Percent, Info, AlertTriangle,
  TrendingUp, Shield, CheckCircle, XCircle,
} from "lucide-react";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

function fmtPct(val: number): string {
  return `${val.toFixed(2)}%`;
}

export default function ConcentratedStockCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [stockName, setStockName] = useState("");
  const [sharesOwned, setSharesOwned] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [costBasisPerShare, setCostBasisPerShare] = useState("");
  const [holdingPeriodMonths, setHoldingPeriodMonths] = useState("24");
  const [totalPortfolioValue, setTotalPortfolioValue] = useState("");
  const [targetAllocationPercent, setTargetAllocationPercent] = useState("5");
  const [filingStatus, setFilingStatus] = useState("single");
  const [stateCapGainsRate, setStateCapGainsRate] = useState("0");
  const [sellYears, setSellYears] = useState("3");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/concentrated-stock", {
        stockName,
        sharesOwned: parseInt(sharesOwned),
        currentPrice: parseFloat(currentPrice),
        costBasisPerShare: parseFloat(costBasisPerShare),
        holdingPeriodMonths: parseInt(holdingPeriodMonths),
        totalPortfolioValue: parseFloat(totalPortfolioValue),
        targetAllocationPercent: parseFloat(targetAllocationPercent),
        filingStatus,
        stateCapGainsRate: parseFloat(stateCapGainsRate) / 100,
        sellYears: parseInt(sellYears),
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Concentrated stock analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockName || !sharesOwned || !currentPrice || !costBasisPerShare || !totalPortfolioValue) {
      toast({ title: "Missing required fields", description: "Please fill in all required fields.", variant: "destructive" });
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Concentrated Stock Analyzer</h1>
          <p className="text-sm text-muted-foreground">Model diversification strategies with tax impact analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Position Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalculate} className="space-y-4">
                <div>
                  <Label htmlFor="input-stock-name" className="text-xs">Stock Name / Ticker *</Label>
                  <Input placeholder="e.g. AAPL" value={stockName} onChange={(e) => setStockName(e.target.value)} required id="input-stock-name" data-testid="input-stock-name" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="input-shares" className="text-xs">Shares Owned *</Label>
                    <Input type="number" min="1" placeholder="5000" value={sharesOwned} onChange={(e) => setSharesOwned(e.target.value)} required id="input-shares" data-testid="input-shares" />
                  </div>
                  <div>
                    <Label htmlFor="input-price" className="text-xs">Current Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="number" step="0.01" min="0.01" placeholder="175.00" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} className="pl-9" required id="input-price" data-testid="input-price" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-cost-basis" className="text-xs">Cost Basis Per Share *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="0.01" min="0" placeholder="45.00" value={costBasisPerShare} onChange={(e) => setCostBasisPerShare(e.target.value)} className="pl-9" required id="input-cost-basis" data-testid="input-cost-basis" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="input-holding-period" className="text-xs">Holding Period (months)</Label>
                    <Input type="number" min="0" value={holdingPeriodMonths} onChange={(e) => setHoldingPeriodMonths(e.target.value)} id="input-holding-period" data-testid="input-holding-period" />
                  </div>
                  <div>
                    <Label htmlFor="input-target-alloc" className="text-xs">Target Allocation (%)</Label>
                    <div className="relative">
                      <Input type="number" step="1" min="0" max="100" value={targetAllocationPercent} onChange={(e) => setTargetAllocationPercent(e.target.value)} className="pr-8" id="input-target-alloc" data-testid="input-target-alloc" />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="input-portfolio-value" className="text-xs">Total Portfolio Value * <InfoTip term="concentrated_position" /></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="1000" min="0" placeholder="2000000" value={totalPortfolioValue} onChange={(e) => setTotalPortfolioValue(e.target.value)} className="pl-9" required id="input-portfolio-value" data-testid="input-portfolio-value" />
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
                    <Label htmlFor="input-state-rate" className="text-xs">State Cap Gains (%)</Label>
                    <div className="relative">
                      <Input type="number" step="0.1" min="0" max="15" value={stateCapGainsRate} onChange={(e) => setStateCapGainsRate(e.target.value)} className="pr-8" id="input-state-rate" data-testid="input-state-rate" />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="select-sell-years" className="text-xs">Staged Sale Years</Label>
                    <Select value={sellYears} onValueChange={setSellYears}>
                      <SelectTrigger id="select-sell-years" data-testid="select-sell-years">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Years</SelectItem>
                        <SelectItem value="3">3 Years</SelectItem>
                        <SelectItem value="5">5 Years</SelectItem>
                        <SelectItem value="7">7 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
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
                  Analyze Position
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!results && !calculateMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-1" data-testid="text-empty-results">Enter position details to analyze</h3>
                <p className="text-sm text-muted-foreground">Fill in the stock position details and click Analyze Position to see diversification strategies.</p>
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
                    <p className="text-xs text-muted-foreground mb-1">Concentration</p>
                    <p className="text-xl font-bold text-primary" data-testid="text-concentration">{fmtPct(results.currentPosition.concentrationPercent)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Market Value</p>
                    <p className="text-xl font-bold" data-testid="text-market-value">{fmt(results.currentPosition.marketValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Unrealized Gain</p>
                    <p className={`text-xl font-bold ${results.currentPosition.unrealizedGain >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-unrealized-gain">
                      {fmt(results.currentPosition.unrealizedGain)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                    <Badge variant={results.riskMetrics.singleStockRisk === "Critical" ? "destructive" : results.riskMetrics.singleStockRisk === "High" ? "destructive" : "secondary"} data-testid="text-risk-level">
                      {results.riskMetrics.singleStockRisk}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Diversification Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.strategies?.map((s: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4" data-testid={`card-strategy-${idx}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {s.strategy}
                              {s.eligible ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">{s.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Tax Liability</p>
                            <p className="font-semibold">{fmt(s.taxLiability)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Net Proceeds</p>
                            <p className="font-semibold">{fmt(s.netProceeds)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Diversified Amount</p>
                            <p className="font-semibold">{fmt(s.diversifiedAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Timeline</p>
                            <p className="font-semibold">{s.timelineYears === 0 ? "Immediate" : `${s.timelineYears} years`}</p>
                          </div>
                        </div>
                        {(s.pros.length > 0 || s.cons.length > 0) && (
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">Pros</p>
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
                              <p className="text-xs font-medium text-red-600 mb-1">Cons</p>
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
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {results.stagedSaleSchedule?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Staged Sale Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead className="text-right">Shares to Sell</TableHead>
                            <TableHead className="text-right">Proceeds</TableHead>
                            <TableHead className="text-right">Capital Gain</TableHead>
                            <TableHead className="text-right">Tax</TableHead>
                            <TableHead className="text-right">Net Proceeds</TableHead>
                            <TableHead className="text-right">Remaining %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.stagedSaleSchedule.map((row: any) => (
                            <TableRow key={row.year} data-testid={`row-staged-${row.year}`}>
                              <TableCell className="font-medium">Year {row.year}</TableCell>
                              <TableCell className="text-right font-mono">{row.sharesToSell.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono">{fmt(row.proceedsBeforeTax)}</TableCell>
                              <TableCell className="text-right font-mono">{fmt(row.capitalGain)}</TableCell>
                              <TableCell className="text-right font-mono text-red-600">{fmt(row.taxOnSale)}</TableCell>
                              <TableCell className="text-right font-mono">{fmt(row.netProceeds)}</TableCell>
                              <TableCell className="text-right font-mono">{fmtPct(row.remainingConcentration)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
                calculatorName="Concentrated Stock Analyzer"
                summary={`Position is ${fmtPct(results.currentPosition?.concentrationPercent)} of portfolio with ${fmt(results.currentPosition?.unrealizedGain)} unrealized gain. Risk level: ${results.riskMetrics?.singleStockRisk || "N/A"}. ${results.strategies?.length || 0} diversification strategies modeled.`}
                metrics={[
                  { label: "Concentration", value: fmtPct(results.currentPosition?.concentrationPercent), tooltip: "Percentage of total portfolio held in this single stock. Above 10% is generally considered concentrated.", status: (results.currentPosition?.concentrationPercent || 0) > 15 ? "critical" : (results.currentPosition?.concentrationPercent || 0) > 10 ? "warning" : "good" },
                  { label: "Unrealized Gain", value: fmt(results.currentPosition?.unrealizedGain), tooltip: "Paper profit that would be subject to capital gains tax if shares are sold.", status: undefined },
                  { label: "Risk Level", value: results.riskMetrics?.singleStockRisk || "N/A", tooltip: "Assessed risk level based on concentration percentage and position characteristics.", status: results.riskMetrics?.singleStockRisk === "High" ? "critical" : results.riskMetrics?.singleStockRisk === "Moderate" ? "warning" : "good" },
                ]}
                insights={[
                  "Consider staged selling, exchange funds, or protective puts to manage concentration risk",
                  `Target allocation of ${targetAllocationPercent}% would require selling a significant portion`,
                ]}
                warnings={results.notes || []}
                actions={[
                  { label: "Asset Location", href: "/calculators/asset-location" },
                ]}
                inputs={{ stockName, sharesOwned, currentPrice, costBasisPerShare, holdingPeriodMonths, totalPortfolioValue, targetAllocationPercent, filingStatus, stateCapGainsRate, sellYears }}
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
