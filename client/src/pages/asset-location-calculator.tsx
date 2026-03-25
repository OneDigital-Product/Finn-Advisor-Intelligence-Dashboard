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
  Loader2, ArrowLeft, DollarSign, Percent, Info, AlertTriangle, Plus, Trash2, ArrowRight,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

import { formatCurrency } from "@/lib/format";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

interface HoldingEntry {
  name: string;
  ticker: string;
  marketValue: string;
  assetClass: string;
  currentAccountType: string;
  expectedReturn: string;
  dividendYield: string;
  turnoverRate: string;
  taxEfficiency: string;
}

const EMPTY_HOLDING: HoldingEntry = {
  name: "", ticker: "", marketValue: "", assetClass: "equity",
  currentAccountType: "taxable", expectedReturn: "8", dividendYield: "2",
  turnoverRate: "10", taxEfficiency: "medium",
};

export default function AssetLocationCalculatorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [holdings, setHoldings] = useState<HoldingEntry[]>([{ ...EMPTY_HOLDING }]);
  const [taxableCapacity, setTaxableCapacity] = useState("");
  const [traditionalCapacity, setTraditionalCapacity] = useState("");
  const [rothCapacity, setRothCapacity] = useState("");
  const [marginalTaxRate, setMarginalTaxRate] = useState("24");
  const [capitalGainsTaxRate, setCapitalGainsTaxRate] = useState("15");
  const [investmentHorizon, setInvestmentHorizon] = useState("20");
  const [clientId, setClientId] = useState("");
  const [results, setResults] = useState<any>(null);

  const { clients } = useAllClients();

  const addHolding = () => setHoldings([...holdings, { ...EMPTY_HOLDING }]);
  const removeHolding = (idx: number) => {
    if (holdings.length <= 1) return;
    setHoldings(holdings.filter((_, i) => i !== idx));
  };
  const updateHolding = (idx: number, field: keyof HoldingEntry, value: string) => {
    const updated = [...holdings];
    updated[idx] = { ...updated[idx], [field]: value };
    setHoldings(updated);
  };

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculators/asset-location", {
        holdings: holdings.map(h => ({
          name: h.name || "Unnamed",
          ticker: h.ticker || "N/A",
          marketValue: parseFloat(h.marketValue) || 0,
          assetClass: h.assetClass,
          currentAccountType: h.currentAccountType,
          expectedReturn: parseFloat(h.expectedReturn) / 100,
          dividendYield: parseFloat(h.dividendYield) / 100,
          turnoverRate: parseFloat(h.turnoverRate) / 100,
          taxEfficiency: h.taxEfficiency,
        })),
        taxableCapacity: parseFloat(taxableCapacity) || 0,
        traditionalCapacity: parseFloat(traditionalCapacity) || 0,
        rothCapacity: parseFloat(rothCapacity) || 0,
        marginalTaxRate: parseFloat(marginalTaxRate) / 100,
        capitalGainsTaxRate: parseFloat(capitalGainsTaxRate) / 100,
        investmentHorizon: parseInt(investmentHorizon),
        clientId: clientId && clientId !== "none" ? clientId : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["/api/calculators/runs"] });
      toast({ title: "Asset location analysis complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const validHoldings = holdings.filter(h => h.name && h.marketValue);
    if (validHoldings.length === 0) {
      toast({ title: "Missing data", description: "Add at least one holding with name and value.", variant: "destructive" });
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Asset Location Optimizer</h1>
          <p className="text-sm text-muted-foreground">Optimize asset placement across taxable, tax-deferred, and tax-free accounts</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Holdings</CardTitle>
              <Button variant="outline" size="sm" onClick={addHolding} data-testid="button-add-holding">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Holding
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCalculate}>
              <div className="space-y-4">
                {holdings.map((h, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-md bg-muted/30 border" data-testid={`holding-${idx}`}>
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor={`input-holding-name-${idx}`} className="text-xs">Name</Label>
                      <Input placeholder="S&P 500 ETF" value={h.name} onChange={(e) => updateHolding(idx, "name", e.target.value)} id={`input-holding-name-${idx}`} data-testid={`input-holding-name-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`input-holding-ticker-${idx}`} className="text-xs">Ticker</Label>
                      <Input placeholder="SPY" value={h.ticker} onChange={(e) => updateHolding(idx, "ticker", e.target.value)} id={`input-holding-ticker-${idx}`} data-testid={`input-holding-ticker-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`input-holding-value-${idx}`} className="text-xs">Value ($)</Label>
                      <Input type="number" min="0" placeholder="100000" value={h.marketValue} onChange={(e) => updateHolding(idx, "marketValue", e.target.value)} id={`input-holding-value-${idx}`} data-testid={`input-holding-value-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`select-holding-account-${idx}`} className="text-xs">Current Account</Label>
                      <Select value={h.currentAccountType} onValueChange={(v) => updateHolding(idx, "currentAccountType", v)}>
                        <SelectTrigger id={`select-holding-account-${idx}`} data-testid={`select-holding-account-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="taxable">Taxable</SelectItem>
                          <SelectItem value="traditional">Traditional</SelectItem>
                          <SelectItem value="roth">Roth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`select-holding-efficiency-${idx}`} className="text-xs">Tax Efficiency <InfoTip term="asset_location" /></Label>
                      <Select value={h.taxEfficiency} onValueChange={(v) => updateHolding(idx, "taxEfficiency", v)}>
                        <SelectTrigger id={`select-holding-efficiency-${idx}`} data-testid={`select-holding-efficiency-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`input-holding-yield-${idx}`} className="text-xs">Div Yield (%)</Label>
                      <Input type="number" step="0.1" min="0" value={h.dividendYield} onChange={(e) => updateHolding(idx, "dividendYield", e.target.value)} id={`input-holding-yield-${idx}`} data-testid={`input-holding-yield-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`input-holding-turnover-${idx}`} className="text-xs">Turnover (%)</Label>
                      <Input type="number" step="1" min="0" max="100" value={h.turnoverRate} onChange={(e) => updateHolding(idx, "turnoverRate", e.target.value)} id={`input-holding-turnover-${idx}`} data-testid={`input-holding-turnover-${idx}`} />
                    </div>
                    <div>
                      <Label htmlFor={`select-holding-class-${idx}`} className="text-xs">Asset Class</Label>
                      <Select value={h.assetClass} onValueChange={(v) => updateHolding(idx, "assetClass", v)}>
                        <SelectTrigger id={`select-holding-class-${idx}`} data-testid={`select-holding-class-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="bond">Bond</SelectItem>
                          <SelectItem value="fixed_income">Fixed Income</SelectItem>
                          <SelectItem value="reit">REIT</SelectItem>
                          <SelectItem value="international">International</SelectItem>
                          <SelectItem value="alternative">Alternative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeHolding(idx)} disabled={holdings.length <= 1} data-testid={`button-remove-holding-${idx}`}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
                <div>
                  <Label htmlFor="input-taxable-capacity" className="text-xs">Taxable Capacity ($)</Label>
                  <Input type="number" min="0" placeholder="500000" value={taxableCapacity} onChange={(e) => setTaxableCapacity(e.target.value)} id="input-taxable-capacity" data-testid="input-taxable-capacity" />
                </div>
                <div>
                  <Label htmlFor="input-traditional-capacity" className="text-xs">Traditional Capacity ($)</Label>
                  <Input type="number" min="0" placeholder="300000" value={traditionalCapacity} onChange={(e) => setTraditionalCapacity(e.target.value)} id="input-traditional-capacity" data-testid="input-traditional-capacity" />
                </div>
                <div>
                  <Label htmlFor="input-roth-capacity" className="text-xs">Roth Capacity ($)</Label>
                  <Input type="number" min="0" placeholder="200000" value={rothCapacity} onChange={(e) => setRothCapacity(e.target.value)} id="input-roth-capacity" data-testid="input-roth-capacity" />
                </div>
                <div>
                  <Label htmlFor="input-marginal-rate" className="text-xs">Marginal Tax (%)</Label>
                  <Input type="number" step="1" min="0" max="50" value={marginalTaxRate} onChange={(e) => setMarginalTaxRate(e.target.value)} id="input-marginal-rate" data-testid="input-marginal-rate" />
                </div>
                <div>
                  <Label htmlFor="input-horizon" className="text-xs">Horizon (Years)</Label>
                  <Input type="number" min="1" max="50" value={investmentHorizon} onChange={(e) => setInvestmentHorizon(e.target.value)} id="input-horizon" data-testid="input-horizon" />
                </div>
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
                  Optimize Locations
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Annual Tax Savings</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-annual-savings">{fmt(results.estimatedAnnualTaxSavings)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Lifetime Savings</p>
                  <p className="text-2xl font-bold" data-testid="text-lifetime-savings">{fmt(results.estimatedLifetimeSavings)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Holdings to Move</p>
                  <p className="text-2xl font-bold" data-testid="text-holdings-to-move">{results.summary.holdingsToMove} / {results.summary.holdingsAnalyzed}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Placement Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Holding</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead></TableHead>
                        <TableHead>Recommended</TableHead>
                        <TableHead className="text-right">Tax Savings/yr</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.recommendations?.map((rec: any, idx: number) => (
                        <TableRow key={idx} data-testid={`row-recommendation-${idx}`}>
                          <TableCell>
                            <div className="font-medium">{rec.name}</div>
                            <div className="text-xs text-muted-foreground">{rec.ticker}</div>
                          </TableCell>
                          <TableCell className="font-mono">{fmt(rec.marketValue)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="no-default-active-elevate capitalize">{rec.currentAccountType}</Badge>
                          </TableCell>
                          <TableCell>
                            {rec.needsMove ? (
                              <ArrowRight className="w-4 h-4 text-primary" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={rec.needsMove ? "default" : "secondary"} className="no-default-active-elevate capitalize">{rec.recommendedAccountType}</Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${rec.estimatedAnnualTaxSavings > 0 ? "text-green-600" : ""}`}>
                            {rec.estimatedAnnualTaxSavings !== 0 ? fmt(rec.estimatedAnnualTaxSavings) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">{rec.reason}</TableCell>
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
              calculatorName="Asset Location Optimizer"
              summary={`Optimizing placement of ${results.summary?.holdingsAnalyzed || 0} holdings could save ${fmt(results.estimatedAnnualTaxSavings)} annually (${fmt(results.estimatedLifetimeSavings)} over ${investmentHorizon} years). ${results.summary?.holdingsToMove || 0} holdings should be relocated.`}
              metrics={[
                { label: "Annual Savings", value: fmt(results.estimatedAnnualTaxSavings), tooltip: "Estimated annual tax savings from optimal asset placement across taxable, tax-deferred, and tax-free accounts.", status: results.estimatedAnnualTaxSavings > 0 ? "good" : undefined },
                { label: "Lifetime Savings", value: fmt(results.estimatedLifetimeSavings), tooltip: "Total projected tax savings over your investment horizon from optimized placement.", status: "good" },
                { label: "Holdings to Move", value: `${results.summary?.holdingsToMove || 0} / ${results.summary?.holdingsAnalyzed || 0}`, tooltip: "Number of holdings that would benefit from relocation to a different account type.", status: results.summary?.holdingsToMove > 0 ? "warning" : "good" },
              ]}
              insights={[
                "Tax-inefficient assets (REITs, bonds) belong in tax-deferred accounts",
                "Tax-efficient assets (index funds, growth stocks) belong in taxable accounts",
              ]}
              warnings={results.notes || []}
              actions={[
                { label: "View Tax Strategy", href: "/tax-strategy" },
              ]}
              inputs={{ holdings, taxableCapacity, traditionalCapacity, rothCapacity, marginalTaxRate, capitalGainsTaxRate, investmentHorizon }}
              results={results}
              clientId={clientId && clientId !== "none" ? clientId : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
