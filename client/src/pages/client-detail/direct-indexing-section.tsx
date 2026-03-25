import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Target,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  ShieldAlert,
  Layers,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Calculator,
  PieChart,
  Scale,
  Calendar,
  Shield,
  Zap,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { SignalCard } from "@/components/design/signal-card";
import { InfoTip } from "@/components/info-tip";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "./shared";
const ffc = (v: number) => formatCurrency(v, { abbreviated: false });
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

interface DirectIndexingSectionProps {
  clientId: string;
  clientName: string;
  totalAum: number;
}

export function DirectIndexingSection({ clientId, clientName, totalAum }: DirectIndexingSectionProps) {
  const [activeTab, setActiveTab] = useState<"lots" | "harvest" | "wash-sale" | "portfolios" | "alpha" | "rebalance" | "strategy" | "construction" | "tax-context">("lots");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState("sp500");
  const [portfolioValue, setPortfolioValue] = useState("");

  const { data: taxLots, isLoading: lotsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "tax-lots"],
  });

  const { data: harvestable, isLoading: harvestLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "harvestable-lots"],
  });

  const { data: washSale, isLoading: washLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "wash-sale-tracker"],
  });

  const { data: portfolios, isLoading: portfoliosLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "direct-index-portfolios"],
  });

  const { data: taxAlpha, isLoading: alphaLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "tax-alpha"],
  });

  const { data: indices } = useQuery<any[]>({
    queryKey: ["/api/direct-indexing/indices"],
  });

  const { data: taxAlphaComparison, isLoading: comparisonLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, `tax-alpha-comparison?portfolioValue=${totalAum}`],
  });

  const harvestBenefit = (harvestable || []).reduce((s: number, h: any) => s + (h.annualTaxSavings || h.potentialTaxSavings || 0), 0);

  const { data: feeComparison, isLoading: feeLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, `fee-comparison?portfolioValue=${totalAum}&harvestBenefit=${harvestBenefit}`],
  });

  const { data: harvestingStrategy, isLoading: strategyLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "harvesting-strategy"],
  });

  const { data: taxContext, isLoading: taxContextLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "tax-context"],
  });

  const createPortfolioMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/clients/${clientId}/direct-index-portfolios`, {
        targetIndex: selectedIndex,
        totalValue: parseFloat(portfolioValue),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "direct-index-portfolios"] });
      setCreateOpen(false);
      setPortfolioValue("");
    },
  });

  const totalUnrealizedLoss = (taxLots || [])
    .filter((l: any) => parseFloat(l.unrealizedGainLoss || "0") < 0)
    .reduce((sum: number, l: any) => sum + Math.abs(parseFloat(l.unrealizedGainLoss || "0")), 0);

  const totalUnrealizedGain = (taxLots || [])
    .filter((l: any) => parseFloat(l.unrealizedGainLoss || "0") > 0)
    .reduce((sum: number, l: any) => sum + parseFloat(l.unrealizedGainLoss || "0"), 0);

  const tabs = [
    { id: "lots" as const, label: "Tax Lots", icon: Layers },
    { id: "harvest" as const, label: "Harvestable", icon: TrendingDown },
    { id: "wash-sale" as const, label: "Wash Sales", icon: ShieldAlert },
    { id: "strategy" as const, label: "Strategy", icon: Calendar },
    { id: "portfolios" as const, label: "Portfolios", icon: Target },
    { id: "construction" as const, label: "Construction", icon: PieChart },
    { id: "rebalance" as const, label: "Rebalance", icon: ArrowRightLeft },
    { id: "alpha" as const, label: "Tax Alpha", icon: DollarSign },
    { id: "tax-context" as const, label: "Tax Context", icon: Scale },
  ];

  return (
    <div className="space-y-6" data-testid="section-direct-indexing">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-1.5" data-testid="text-direct-indexing-title">
            Direct Indexing & Tax-Lot Management <InfoTip term="direct_indexing" />
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Individual security-level index tracking and tax-lot harvesting for {clientName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CassidyAnalysisButton
            taskType="analysis"
            clientId={clientId}
            context={{
              analysisType: "direct_indexing",
              clientName,
              totalUnrealizedLoss,
              totalUnrealizedGain,
              taxLotCount: taxLots?.length || 0,
              harvestableCount: harvestable?.length || 0,
              totalHarvestableSavings: (harvestable || []).reduce((s: number, h: any) => s + (h.annualTaxSavings || h.potentialTaxSavings || 0), 0),
              washSaleTickersCount: washSale?.tickersInWindow?.length || 0,
              washSaleTickers: washSale?.tickersInWindow || [],
              topHarvestable: (harvestable || []).slice(0, 5).map((h: any) => ({
                ticker: h.lot?.ticker || "Unknown",
                unrealizedLoss: h.unrealizedLoss,
                potentialTaxSavings: h.potentialTaxSavings,
                washSaleRisk: h.washSaleRisk,
                replacementTicker: h.replacementTicker,
                holdingPeriod: h.holdingPeriod,
              })),
              portfolioCount: portfolios?.length || 0,
              taxAlpha: taxAlpha?.directIndexAdvantage || 0,
            }}
            label="AI Harvesting Analysis"
            variant="outline"
            disabled={lotsLoading || harvestLoading}
          />
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            data-testid="button-create-direct-index"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Direct Index
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card style={V2_CARD} data-testid="card-total-lots">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-[#C7D0DD]">Tax Lots</span>
            </div>
            <div className="text-xl font-bold" data-testid="text-total-lots">
              {lotsLoading ? <Skeleton className="h-6 w-16" /> : (taxLots?.length || 0)}
            </div>
          </CardContent>
        </Card>
        <Card style={V2_CARD} data-testid="card-unrealized-losses">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="w-4 h-4" style={{ color: P.red }} />
              <span className="text-xs text-[#C7D0DD]">Unrealized Losses</span>
            </div>
            <div className="text-xl font-bold" style={{ color: P.red }} data-testid="text-unrealized-losses">
              {lotsLoading ? <Skeleton className="h-6 w-24" /> : ffc(totalUnrealizedLoss)}
            </div>
          </CardContent>
        </Card>
        <Card style={V2_CARD} data-testid="card-unrealized-gains">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4" style={{ color: P.grn }} />
              <span className="text-xs text-[#C7D0DD]">Unrealized Gains</span>
            </div>
            <div className="text-xl font-bold" style={{ color: P.grn }} data-testid="text-unrealized-gains">
              {lotsLoading ? <Skeleton className="h-6 w-24" /> : ffc(totalUnrealizedGain)}
            </div>
          </CardContent>
        </Card>
        <Card style={V2_CARD} data-testid="card-harvestable-savings">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" style={{ color: P.amb }} />
              <span className="text-xs text-[#C7D0DD]">Harvestable Savings</span>
            </div>
            <div className="text-xl font-bold" style={{ color: P.amb }} data-testid="text-harvestable-savings">
              {harvestLoading ? <Skeleton className="h-6 w-24" /> : ffc(
                (harvestable || []).reduce((s: number, h: any) => s + (h.annualTaxSavings || h.potentialTaxSavings || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b pb-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className="text-xs"
            >
              <Icon className="w-3.5 h-3.5 mr-1" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === "lots" && (
        <TaxLotsTab lots={taxLots || []} loading={lotsLoading} />
      )}

      {activeTab === "harvest" && (
        <HarvestableTab harvestable={harvestable || []} loading={harvestLoading} />
      )}

      {activeTab === "wash-sale" && (
        <WashSaleTab data={washSale} loading={washLoading} clientId={clientId} />
      )}

      {activeTab === "strategy" && (
        <HarvestingStrategyTab data={harvestingStrategy} loading={strategyLoading} />
      )}

      {activeTab === "portfolios" && (
        <PortfoliosTab portfolios={portfolios || []} loading={portfoliosLoading} clientId={clientId} />
      )}

      {activeTab === "construction" && (
        <PortfolioConstructionTab portfolios={portfolios || []} loading={portfoliosLoading} clientId={clientId} />
      )}

      {activeTab === "rebalance" && (
        <RebalanceTab portfolios={portfolios || []} loading={portfoliosLoading} clientId={clientId} />
      )}

      {activeTab === "alpha" && (
        <TaxAlphaTab
          data={taxAlpha}
          loading={alphaLoading}
          comparison={taxAlphaComparison}
          comparisonLoading={comparisonLoading}
          feeComparison={feeComparison}
          feeLoading={feeLoading}
          totalAum={totalAum}
        />
      )}

      {activeTab === "tax-context" && (
        <ClientTaxContextTab data={taxContext} loading={taxContextLoading} />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Direct Index Portfolio</DialogTitle>
            <DialogDescription>
              Select a target index and portfolio value to generate individual stock allocations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Index</label>
              <Select value={selectedIndex} onValueChange={setSelectedIndex}>
                <SelectTrigger data-testid="select-target-index">
                  <SelectValue placeholder="Select index..." />
                </SelectTrigger>
                <SelectContent>
                  {(indices || []).map((idx: any) => (
                    <SelectItem key={idx.id} value={idx.id}>
                      {idx.name} ({idx.constituentCount} stocks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolio Value ($)</label>
              <Input
                type="number"
                placeholder="e.g., 1000000"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(e.target.value)}
                data-testid="input-portfolio-value"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={() => createPortfolioMutation.mutate()}
              disabled={!portfolioValue || parseFloat(portfolioValue) <= 0 || createPortfolioMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createPortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaxLotsTab({ lots, loading }: { lots: any[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-64" />;

  const grouped = lots.reduce((acc: Record<string, any[]>, lot: any) => {
    const ticker = lot.ticker || "Unknown";
    if (!acc[ticker]) acc[ticker] = [];
    acc[ticker].push(lot);
    return acc;
  }, {});

  if (lots.length === 0) {
    return (
      <Card style={V2_CARD}>
        <CardContent>
          <EmptyState
            icon={Layers}
            title="No tax lots found"
            description="Tax lots will be generated automatically from existing holdings. Each lot tracks individual purchase date and cost basis for precise tax-loss harvesting."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {lots.length} lots across {Object.keys(grouped).length} securities
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Ticker</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Shares</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Cost Basis</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Market Value</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Gain/Loss</th>
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Acquired</th>
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Period</th>
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Wash Sale</th>
            </tr>
          </thead>
          <tbody>
            {lots.slice(0, 50).map((lot: any) => {
              const gl = parseFloat(lot.unrealizedGainLoss || "0");
              return (
                <tr key={lot.id} className="border-b last:border-0" data-testid={`tax-lot-row-${lot.id}`}>
                  <td className="p-2.5 font-medium">{lot.ticker}</td>
                  <td className="p-2.5 text-right">{parseFloat(lot.shares).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                  <td className="p-2.5 text-right">{ffc(parseFloat(lot.totalCostBasis || "0"))}</td>
                  <td className="p-2.5 text-right font-medium">{ffc(parseFloat(lot.marketValue || "0"))}</td>
                  <td className={`p-2.5 text-right ${gl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {gl >= 0 ? "+" : ""}{ffc(gl)}
                  </td>
                  <td className="p-2.5 text-[#C7D0DD]">{lot.acquisitionDate}</td>
                  <td className="p-2.5">
                    <Badge variant={lot.holdingPeriod === "long-term" ? "default" : "secondary"} className="text-[10px]">
                      {lot.holdingPeriod}
                    </Badge>
                  </td>
                  <td className="p-2.5">
                    {lot.washSaleDisallowed ? (
                      <Badge variant="destructive" className="text-[10px]">Disallowed</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lots.length > 50 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t">
            Showing 50 of {lots.length} lots
          </div>
        )}
      </div>
    </div>
  );
}

function HarvestableTab({ harvestable, loading }: { harvestable: any[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (loading) return <Skeleton className="h-64" />;

  if (harvestable.length === 0) {
    return (
      <Card style={V2_CARD}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No harvestable losses identified at current thresholds.</p>
        </CardContent>
      </Card>
    );
  }

  const totalSavings = harvestable.reduce((s: number, h: any) => s + (h.annualTaxSavings || h.potentialTaxSavings || 0), 0);
  const shortTermLots = harvestable.filter((h: any) => h.holdingPeriod === "short-term");
  const longTermLots = harvestable.filter((h: any) => h.holdingPeriod === "long-term");

  return (
    <div className="space-y-4">
      <SignalCard level="review" title={`Total Potential Tax Savings: ${ffc(totalSavings)}`}>
        <span data-testid="text-total-harvest-savings">{harvestable.length} lots with harvestable losses</span>
      </SignalCard>

      <div className="grid gap-4 md:grid-cols-3">
        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-[#C7D0DD] mb-1">Short-Term Lots</div>
            <div className="text-lg font-bold">{shortTermLots.length}</div>
            <div className="text-xs text-[#C7D0DD]">Tax rate: up to 37%</div>
          </CardContent>
        </Card>
        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-[#C7D0DD] mb-1">Long-Term Lots</div>
            <div className="text-lg font-bold">{longTermLots.length}</div>
            <div className="text-xs text-[#C7D0DD]">Tax rate: up to 20%</div>
          </CardContent>
        </Card>
        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-[#C7D0DD] mb-1">Annual Tax Savings</div>
            <div className="text-lg font-bold" style={{ color: P.grn }}>
              {ffc(harvestable.reduce((s: number, h: any) => s + (h.annualTaxSavings || 0), 0))}
            </div>
            <div className="text-xs text-[#C7D0DD]">At applicable rates</div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD] w-8"></th>
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Ticker</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Unrealized Loss</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">% Loss</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Tax Savings</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Tax Rate</th>
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Period</th>
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Wash Risk</th>
              <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Replacement</th>
              <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {harvestable.map((h: any, i: number) => (
              <Fragment key={`harvest-${i}`}>
                <tr
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.has(i) ? next.delete(i) : next.add(i);
                      return next;
                    });
                  }}
                  data-testid={`harvestable-row-${i}`}
                >
                  <td className="p-2.5">
                    {expanded.has(i) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </td>
                  <td className="p-2.5 font-medium">{h.lot?.ticker || "—"}</td>
                  <td className="p-2.5 text-right text-red-600 dark:text-red-400">
                    {ffc(h.unrealizedLoss)}
                  </td>
                  <td className="p-2.5 text-right text-red-600 dark:text-red-400">
                    {h.percentLoss.toFixed(1)}%
                  </td>
                  <td className="p-2.5 text-right font-medium text-amber-600 dark:text-amber-400">
                    {ffc(h.potentialTaxSavings)}
                  </td>
                  <td className="p-2.5 text-right text-[#C7D0DD]">
                    {((h.applicableTaxRate || 0) * 100).toFixed(0)}%
                  </td>
                  <td className="p-2.5">
                    <Badge variant={h.holdingPeriod === "long-term" ? "default" : "secondary"} className="text-[10px]">
                      {h.holdingPeriod}
                    </Badge>
                  </td>
                  <td className="p-2.5">
                    {h.washSaleRisk ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="w-3 h-3 mr-0.5" /> Risk
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-green-600">Clear</Badge>
                    )}
                  </td>
                  <td className="p-2.5 text-[#C7D0DD] text-xs">{h.replacementTicker || "—"}</td>
                  <td className="p-2.5 text-right">
                    <Button
                      size="sm"
                      variant={h.washSaleRisk ? "outline" : "default"}
                      className="h-7 text-xs px-2.5"
                      disabled={h.washSaleRisk}
                      onClick={(e) => { e.stopPropagation(); }}
                      data-testid={`button-harvest-${i}`}
                    >
                      {h.washSaleRisk ? "Blocked" : "Harvest"}
                    </Button>
                  </td>
                </tr>
                {expanded.has(i) && (
                  <tr key={`detail-${i}`} className="border-b bg-muted/10">
                    <td colSpan={10} className="p-3">
                      <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                        <div>
                          <span className="text-[#C7D0DD]">Days Held:</span>{" "}
                          <span className="font-medium">{h.daysHeld}d</span>
                        </div>
                        <div>
                          <span className="text-[#C7D0DD]">Tax Benefit Rate:</span>{" "}
                          <span className="font-medium">{h.taxBenefitRate?.toFixed(2) || "0"}%</span>
                        </div>
                        <div>
                          <span className="text-[#C7D0DD]">Annual Savings:</span>{" "}
                          <span className="font-medium" style={{ color: P.grn }}>{ffc(h.annualTaxSavings || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[#C7D0DD]">Cost Basis:</span>{" "}
                          <span className="font-medium">{ffc(parseFloat(h.lot?.totalCostBasis || "0"))}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={h.washSaleRisk}
                          data-testid={`button-harvest-and-replace-${i}`}
                        >
                          Harvest & Replace with {h.replacementTicker || "ETF"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={h.washSaleRisk}
                          data-testid={`button-harvest-to-cash-${i}`}
                        >
                          Harvest to Cash
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          data-testid={`button-schedule-harvest-${i}`}
                        >
                          Schedule for Year-End
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WashSaleTab({ data, loading, clientId }: { data: any; loading: boolean; clientId: string }) {
  const [complianceTicker, setComplianceTicker] = useState("");
  const [complianceResults, setComplianceResults] = useState<any[] | null>(null);
  const [checkingCompliance, setCheckingCompliance] = useState(false);

  const handleCheckCompliance = async () => {
    if (!complianceTicker) return;
    setCheckingCompliance(true);
    try {
      const resp = await fetch(`/api/clients/${clientId}/wash-sale-compliance/${complianceTicker.toUpperCase()}`);
      const results = await resp.json();
      setComplianceResults(results);
    } catch {
      setComplianceResults([]);
    }
    setCheckingCompliance(false);
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card style={V2_CARD} data-testid="card-active-windows">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-[#C7D0DD]">Active Windows</span>
            </div>
            <div className="text-xl font-bold">{data?.activeWindows?.length || 0}</div>
          </CardContent>
        </Card>
        <Card style={V2_CARD} data-testid="card-tickers-in-window">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-xs text-[#C7D0DD]">Restricted Tickers</span>
            </div>
            <div className="text-xl font-bold">{data?.tickersInWindow?.length || 0}</div>
          </CardContent>
        </Card>
        <Card style={V2_CARD} data-testid="card-disallowed-losses">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" style={{ color: P.red }} />
              <span className="text-xs text-[#C7D0DD]">Disallowed Losses</span>
            </div>
            <div className="text-xl font-bold" style={{ color: P.red }}>
              {ffc(data?.totalDisallowedLosses || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            IRC §1091 Compliance Checker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter ticker to check (e.g., AAPL)"
              value={complianceTicker}
              onChange={(e) => setComplianceTicker(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheckCompliance()}
              className="max-w-xs"
              data-testid="input-compliance-ticker"
            />
            <Button
              size="sm"
              onClick={handleCheckCompliance}
              disabled={!complianceTicker || checkingCompliance}
              data-testid="button-check-compliance"
            >
              {checkingCompliance ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Check Compliance"}
            </Button>
          </div>

          {complianceResults && complianceResults.length > 0 && (
            <div className="space-y-3">
              {complianceResults.map((result: any, i: number) => (
                <div key={i} className={`p-3 rounded-md border ${
                  result.status === "clear" ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" :
                  result.status === "warning" ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20" :
                  "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                }`} data-testid={`compliance-result-${i}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.ticker}</span>
                      <Badge variant={result.status === "clear" ? "outline" : result.status === "warning" ? "secondary" : "destructive"} className="text-[10px]">
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    {result.daysRemaining > 0 && (
                      <span className="text-xs text-[#C7D0DD]">{result.daysRemaining} days remaining</span>
                    )}
                  </div>
                  <div className="text-xs text-[#C7D0DD] mb-2">{result.detectionMethod}</div>
                  {result.correlationScore !== null && (
                    <div className="text-xs mb-2">Correlation: <span className="font-medium">{result.correlationScore}</span></div>
                  )}
                  {result.replacementStrategies?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="text-xs font-medium text-[#C7D0DD]">Replacement Strategies:</div>
                      {result.replacementStrategies.map((s: any, si: number) => (
                        <div key={si} className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className={`text-[10px] ${
                            s.riskLevel === "low" ? "text-green-600" : s.riskLevel === "medium" ? "text-amber-600" : "text-red-600"
                          }`}>{s.riskLevel}</Badge>
                          <span>{s.strategy}: {s.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data?.tickersInWindow?.length > 0 ? (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tickers in 61-Day Wash Sale Window</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.tickersInWindow.map((ticker: string) => (
                <Badge key={ticker} variant="destructive" data-testid={`wash-sale-ticker-${ticker}`}>
                  {ticker}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card style={V2_CARD}>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active wash sale windows. All tickers are clear for harvesting.</p>
          </CardContent>
        </Card>
      )}

      {data?.activeWindows?.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Ticker</th>
                <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Sell Date</th>
                <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Window End</th>
                <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Disallowed Loss</th>
                <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.activeWindows.map((event: any, i: number) => (
                <tr key={event.id || i} className="border-b last:border-0" data-testid={`wash-sale-row-${i}`}>
                  <td className="p-2.5 font-medium">{event.ticker}</td>
                  <td className="p-2.5 text-[#C7D0DD]">{event.sellDate}</td>
                  <td className="p-2.5 text-[#C7D0DD]">{event.windowEnd}</td>
                  <td className="p-2.5 text-right text-red-600 dark:text-red-400">
                    {ffc(parseFloat(event.disallowedLoss || "0"))}
                  </td>
                  <td className="p-2.5">
                    <Badge variant="outline" className="text-[10px]">{event.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HarvestingStrategyTab({ data, loading }: { data: any; loading: boolean }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("immediate");

  if (loading) return <Skeleton className="h-64" />;

  if (!data) {
    return (
      <Card style={V2_CARD}>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title="No harvesting strategy data"
            description="Harvesting strategies will be generated once tax lots are available."
          />
        </CardContent>
      </Card>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-4">
      <Card style={V2_CARD} data-testid="card-immediate-harvest">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("immediate")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              Immediate Harvest Opportunities
              {data.immediate.safeToHarvest && (
                <Badge variant="outline" className="text-[10px] text-green-600">Ready</Badge>
              )}
            </CardTitle>
            {expandedSection === "immediate" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSection === "immediate" && (
          <CardContent>
            <div className="mb-3">
              <span className="text-lg font-bold" style={{ color: P.grn }} data-testid="text-immediate-savings">
                {ffc(data.immediate.totalSavings)}
              </span>
              <span className="text-sm text-[#C7D0DD] ml-2">total savings from {data.immediate.lots?.length || 0} positions</span>
            </div>
            {data.immediate.lots?.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Ticker</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Loss</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Savings</th>
                      <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Period</th>
                      <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Replacement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.immediate.lots.slice(0, 10).map((h: any, i: number) => (
                      <tr key={i} className="border-b last:border-0" data-testid={`immediate-lot-${i}`}>
                        <td className="p-2 font-medium">{h.lot?.ticker || "—"}</td>
                        <td className="p-2 text-right text-red-600 dark:text-red-400">{ffc(h.unrealizedLoss)}</td>
                        <td className="p-2 text-right font-medium" style={{ color: P.grn }}>{ffc(h.potentialTaxSavings)}</td>
                        <td className="p-2">
                          <Badge variant={h.holdingPeriod === "long-term" ? "default" : "secondary"} className="text-[10px]">
                            {h.holdingPeriod}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-[#C7D0DD]">{h.replacementTicker || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card style={V2_CARD} data-testid="card-year-end-planning">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("yearEnd")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Year-End Tax Planning
            </CardTitle>
            {expandedSection === "yearEnd" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSection === "yearEnd" && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">YTD Gains</div>
                <div className="text-lg font-bold" style={{ color: P.grn }} data-testid="text-ytd-gains">{ffc(data.yearEnd.ytdGains)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">YTD Losses</div>
                <div className="text-lg font-bold" style={{ color: P.red }} data-testid="text-ytd-losses">{ffc(data.yearEnd.ytdLosses)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Net Position</div>
                <div className={`text-lg font-bold ${data.yearEnd.netPosition >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-net-position">
                  {data.yearEnd.netPosition >= 0 ? "+" : ""}{ffc(data.yearEnd.netPosition)}
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Ordinary Income Offset</div>
                <div className="text-lg font-bold" data-testid="text-ordinary-offset">{ffc(data.yearEnd.ordinaryIncomeOffset)}</div>
                <div className="text-[10px] text-[#C7D0DD]">Max $3,000/yr</div>
              </div>
            </div>
            <div className="text-sm text-[#C7D0DD]">
              Projected year-end savings: <span className="font-medium" style={{ color: P.grn }}>{ffc(data.yearEnd.projectedSavings)}</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card style={V2_CARD} data-testid="card-multi-year">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("multiYear")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Multi-Year Harvesting Schedule
            </CardTitle>
            {expandedSection === "multiYear" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSection === "multiYear" && (
          <CardContent>
            {data.multiYear?.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Year</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Positions</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Est. Losses</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Est. Savings</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.multiYear.map((yr: any) => (
                      <tr key={yr.year} className="border-b last:border-0" data-testid={`multi-year-row-${yr.year}`}>
                        <td className="p-2 font-medium">{yr.year}</td>
                        <td className="p-2 text-right">{yr.scheduledHarvests?.length || 0}</td>
                        <td className="p-2 text-right text-red-600 dark:text-red-400">
                          {ffc(yr.scheduledHarvests?.reduce((s: number, h: any) => s + h.estimatedLoss, 0) || 0)}
                        </td>
                        <td className="p-2 text-right" style={{ color: P.grn }}>
                          {ffc(yr.scheduledHarvests?.reduce((s: number, h: any) => s + h.estimatedSavings, 0) || 0)}
                        </td>
                        <td className="p-2 text-right font-medium" style={{ color: P.grn }}>
                          {ffc(yr.cumulativeSavings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card style={V2_CARD} data-testid="card-carryforward">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("carryforward")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-500" />
              Capital Loss Carryforward
            </CardTitle>
            {expandedSection === "carryforward" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSection === "carryforward" && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Short-Term</div>
                <div className="text-lg font-bold" data-testid="text-st-carryforward">{ffc(data.carryforward.shortTermCarryforward)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Long-Term</div>
                <div className="text-lg font-bold" data-testid="text-lt-carryforward">{ffc(data.carryforward.longTermCarryforward)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Total</div>
                <div className="text-lg font-bold" style={{ color: P.amb }} data-testid="text-total-carryforward">{ffc(data.carryforward.totalCarryforward)}</div>
              </div>
            </div>
            <div className="text-xs text-[#C7D0DD] italic">{data.carryforward.expirationNotes}</div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function PortfoliosTab({ portfolios, loading, clientId }: { portfolios: any[]; loading: boolean; clientId: string }) {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);

  const { data: trackingReport, isLoading: trackingLoading } = useQuery<any>({
    queryKey: ["/api/direct-index-portfolios", selectedPortfolio, "tracking"],
    enabled: !!selectedPortfolio,
  });

  if (loading) return <Skeleton className="h-64" />;

  if (portfolios.length === 0) {
    return (
      <Card style={V2_CARD}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No direct index portfolios. Create one to start tracking individual stock allocations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {portfolios.map((p: any) => (
          <Card
            key={p.id}
            className={`cursor-pointer transition-shadow hover:shadow-md ${selectedPortfolio === p.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedPortfolio(p.id === selectedPortfolio ? null : p.id)}
            data-testid={`portfolio-card-${p.id}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{p.name}</CardTitle>
                <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-[#C7D0DD]">Target Index</div>
                  <div className="font-medium">{p.targetIndex}</div>
                </div>
                <div>
                  <div className="text-xs text-[#C7D0DD]">Total Value</div>
                  <div className="font-medium">{ffc(parseFloat(p.totalValue || "0"))}</div>
                </div>
                <div>
                  <div className="text-xs text-[#C7D0DD]">Tracking Diff</div>
                  <div className="font-medium">
                    {parseFloat(p.trackingDifference || "0").toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#C7D0DD]">Harvested Losses</div>
                  <div className="font-medium text-amber-600 dark:text-amber-400">
                    {ffc(parseFloat(p.totalHarvestedLosses || "0"))}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-[#C7D0DD]">
                {(p.allocations as any[])?.length || 0} individual positions
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPortfolio && trackingReport && !trackingLoading && (
        <Card style={V2_CARD} data-testid="card-tracking-report">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Tracking Difference Report — {trackingReport.portfolioName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Tracking Difference</div>
                <div className="text-lg font-bold">{trackingReport.trackingDifference.toFixed(2)}%</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Active Share</div>
                <div className="text-lg font-bold">{trackingReport.activeShare.toFixed(1)}%</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Target Index</div>
                <div className="text-lg font-bold">{trackingReport.targetIndex}</div>
              </div>
            </div>

            {trackingReport.sectorDeviations?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[#C7D0DD] mb-2">Sector Deviations</h4>
                <div className="space-y-1.5">
                  {trackingReport.sectorDeviations.map((sd: any) => (
                    <div key={sd.sector} className="flex items-center justify-between text-sm">
                      <span className="text-[#C7D0DD]">{sd.sector}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs">{sd.target.toFixed(1)}% → {sd.actual.toFixed(1)}%</span>
                        <span className={`font-medium text-xs ${sd.deviation >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {sd.deviation >= 0 ? "+" : ""}{sd.deviation.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedPortfolio && trackingLoading && <Skeleton className="h-48" />}
    </div>
  );
}

const ESG_EXCLUSION_OPTIONS = [
  { value: "tobacco", label: "Tobacco" },
  { value: "firearms", label: "Firearms" },
  { value: "fossil_fuels", label: "Fossil Fuels" },
  { value: "gambling", label: "Gambling" },
  { value: "alcohol", label: "Alcohol" },
  { value: "nuclear", label: "Nuclear" },
  { value: "private_prisons", label: "Private Prisons" },
];

function PortfolioConstructionTab({ portfolios, loading, clientId }: { portfolios: any[]; loading: boolean; clientId: string }) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [esgExclusions, setEsgExclusions] = useState<string[]>([]);

  const esgParam = esgExclusions.length > 0 ? `?esgExclusions=${esgExclusions.join(",")}` : "";
  const { data: construction, isLoading: constructionLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "direct-index-portfolios", selectedPortfolioId, `construction-analysis${esgParam}`],
    enabled: !!selectedPortfolioId,
  });

  if (loading) return <Skeleton className="h-64" />;

  if (portfolios.length === 0) {
    return (
      <Card style={V2_CARD}>
        <CardContent>
          <EmptyState
            icon={PieChart}
            title="No portfolios for construction analysis"
            description="Create a direct index portfolio first to analyze factor exposure, sector constraints, and concentration limits."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="space-y-1 flex-1">
          <label className="text-xs font-medium text-[#C7D0DD]">Select Portfolio</label>
          <Select value={selectedPortfolioId || ""} onValueChange={setSelectedPortfolioId}>
            <SelectTrigger data-testid="select-construction-portfolio">
              <SelectValue placeholder="Choose a portfolio..." />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {ffc(parseFloat(p.totalValue || "0"))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#C7D0DD]">ESG Exclusions</label>
        <div className="flex flex-wrap gap-2">
          {ESG_EXCLUSION_OPTIONS.map((opt) => {
            const active = esgExclusions.includes(opt.value);
            return (
              <Button
                key={opt.value}
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-7 text-xs"
                data-testid={`button-esg-${opt.value}`}
                onClick={() => {
                  setEsgExclusions((prev) =>
                    active ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                  );
                }}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
        {esgExclusions.length > 0 && (
          <div className="text-xs text-[#C7D0DD]">
            {esgExclusions.length} exclusion{esgExclusions.length > 1 ? "s" : ""} active — matching holdings will be flagged with replacement suggestions
          </div>
        )}
      </div>

      {constructionLoading && <Skeleton className="h-64" />}

      {construction && !constructionLoading && (
        <div className="space-y-4">
          <Card style={V2_CARD} data-testid="card-factor-exposure">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Factor Exposure Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Metric</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Target</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Actual</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Deviation</th>
                      <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Tolerance</th>
                      <th className="text-center p-2 text-xs font-medium text-[#C7D0DD]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {construction.factorExposure?.slice(0, 12).map((fe: any, i: number) => (
                      <tr key={i} className="border-b last:border-0" data-testid={`factor-row-${i}`}>
                        <td className="p-2 font-medium text-xs">{fe.metric}</td>
                        <td className="p-2 text-right text-xs">{fe.target.toFixed(2)}</td>
                        <td className="p-2 text-right text-xs">{fe.actual.toFixed(2)}</td>
                        <td className={`p-2 text-right text-xs ${Math.abs(fe.deviation) > fe.tolerance ? "text-red-600" : "text-green-600"}`}>
                          {fe.deviation >= 0 ? "+" : ""}{fe.deviation.toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-xs text-[#C7D0DD]">±{fe.tolerance}</td>
                        <td className="p-2 text-center">
                          {fe.withinTolerance ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card style={V2_CARD} data-testid="card-concentration-limits">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Concentration Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-[#C7D0DD]">Single Stock Limit</div>
                  <div className="text-lg font-bold">{construction.concentrationLimits.singleStockLimit}%</div>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-[#C7D0DD]">Top-10 Weight</div>
                  <div className={`text-lg font-bold ${construction.concentrationLimits.top10WithinLimit ? "text-green-600" : "text-red-600"}`} data-testid="text-top10-weight">
                    {construction.concentrationLimits.top10Weight.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-[#C7D0DD]">Limit: {construction.concentrationLimits.top10Limit}%</div>
                </div>
              </div>

              {construction.concentrationLimits.violations?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-600 mb-2">Violations ({construction.concentrationLimits.violations.length})</div>
                  {construction.concentrationLimits.violations.map((v: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded-md bg-red-50 dark:bg-red-950/20 mb-1" data-testid={`violation-${i}`}>
                      <span className="font-medium">{v.ticker}</span>
                      <span className="text-red-600">{v.weight.toFixed(1)}% (limit: {v.limit}%)</span>
                    </div>
                  ))}
                </div>
              )}

              {construction.concentrationLimits.violations?.length === 0 && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  All positions within concentration limits
                </div>
              )}
            </CardContent>
          </Card>

          {construction.esgScreening && (
            <Card style={V2_CARD} data-testid="card-esg-screening">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  ESG / Values Screening
                </CardTitle>
              </CardHeader>
              <CardContent>
                {construction.esgScreening.excludedTickers?.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {construction.esgScreening.excludedTickers.map((t: string) => (
                        <Badge key={t} variant="secondary">{t} (excluded)</Badge>
                      ))}
                    </div>
                    {construction.esgScreening.replacementSuggestions?.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Excluded</th>
                              <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Replacement</th>
                              <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Sector</th>
                            </tr>
                          </thead>
                          <tbody>
                            {construction.esgScreening.replacementSuggestions.map((s: any, i: number) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="p-2 text-red-600">{s.excluded}</td>
                                <td className="p-2 font-medium text-green-600">{s.replacement}</td>
                                <td className="p-2 text-[#C7D0DD]">{s.sector}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="text-xs text-[#C7D0DD]">
                      Tracking impact: +{construction.esgScreening.impactOnTracking.toFixed(2)}% additional tracking error
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No ESG exclusions configured. Add exclusions to see replacement suggestions.</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function TaxAlphaTab({
  data,
  loading,
  comparison,
  comparisonLoading,
  feeComparison,
  feeLoading,
  totalAum,
}: {
  data: any;
  loading: boolean;
  comparison: any;
  comparisonLoading: boolean;
  feeComparison: any;
  feeLoading: boolean;
  totalAum: number;
}) {
  if (loading) return <Skeleton className="h-64" />;

  if (!data) {
    return (
      <Card style={V2_CARD}>
        <CardContent>
          <EmptyState
            icon={DollarSign}
            title="No tax alpha data yet"
            description="Create a direct index portfolio to start tracking tax-loss harvesting savings. Tax alpha measures the additional after-tax return generated through individual lot-level management."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SignalCard level="info" title="Direct Indexing Tax Alpha Advantage">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold" style={{ color: P.grn }} data-testid="text-direct-index-advantage">
              {ffc(data.directIndexAdvantage)}
            </div>
            <div className="text-xs mt-1" style={{ color: P.mid }}>
              Additional savings vs. ETF-level harvesting
            </div>
          </div>
          <DollarSign className="w-10 h-10 opacity-50" style={{ color: P.grn }} />
        </div>
      </SignalCard>

      <div className="grid gap-4 md:grid-cols-2">
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Loss Harvesting Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Total Harvested Losses</span>
              <span className="font-medium" data-testid="text-total-harvested">{ffc(data.totalHarvestedLosses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Estimated Tax Savings</span>
              <span className="font-medium" style={{ color: P.grn }} data-testid="text-estimated-savings">{ffc(data.estimatedTaxSavings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Short-Term Losses</span>
              <span className="font-medium" style={{ color: P.red }}>{ffc(data.realizedShortTermLosses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Long-Term Losses</span>
              <span className="font-medium" style={{ color: P.red }}>{ffc(data.realizedLongTermLosses)}</span>
            </div>
          </CardContent>
        </Card>

        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Direct Index vs. ETF Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Direct Index Savings</span>
              <span className="font-medium" style={{ color: P.grn }}>{ffc(data.estimatedTaxSavings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">ETF-Level Equivalent</span>
              <span className="font-medium">{ffc(data.etfEquivalentSavings)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-[#C7D0DD] font-medium">Direct Index Advantage</span>
              <span className="font-bold" style={{ color: P.grn }}>{ffc(data.directIndexAdvantage)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Effective Tax Rate Used</span>
              <span className="font-medium">{(data.effectiveTaxRate * 100).toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {comparison && !comparisonLoading && (
        <Card style={V2_CARD} data-testid="card-tax-alpha-comparison">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Tax Alpha Quantification — Traditional vs. Direct Indexing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-md border">
                <div className="text-xs font-medium text-[#C7D0DD] mb-2">Traditional Fund</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Dividend Tax Drag</span>
                    <span className="text-red-600">{ffc(comparison.traditional.dividendTaxDrag)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Internal Cap Gains</span>
                    <span className="text-red-600">{ffc(comparison.traditional.internalCapGains)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-medium">Total Cost</span>
                    <span className="font-bold text-red-600">{ffc(comparison.traditional.totalCost)}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-md border border-green-200 dark:border-green-800">
                <div className="text-xs font-medium text-[#C7D0DD] mb-2">Direct Indexing</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Harvesting Benefit</span>
                    <span className="text-green-600">+{ffc(comparison.directIndexing.harvestingBenefit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Dividend Tax Drag</span>
                    <span className="text-red-600">{ffc(comparison.directIndexing.dividendTaxDrag)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-medium">Net Benefit</span>
                    <span className="font-bold text-green-600">+{ffc(comparison.directIndexing.totalBenefit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tax Alpha</span>
                <span className="text-xl font-bold text-green-600" data-testid="text-tax-alpha-value">{ffc(comparison.taxAlpha)}</span>
              </div>
            </div>

            {comparison.sensitivityAnalysis?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[#C7D0DD] mb-2">Sensitivity Analysis</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-2 text-xs font-medium text-[#C7D0DD]">Scenario</th>
                        <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Harvest Rate</th>
                        <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Tax Alpha (bps)</th>
                        <th className="text-right p-2 text-xs font-medium text-[#C7D0DD]">Annual Benefit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.sensitivityAnalysis.map((s: any, i: number) => (
                        <tr key={i} className="border-b last:border-0" data-testid={`sensitivity-row-${i}`}>
                          <td className="p-2 font-medium">{s.scenario}</td>
                          <td className="p-2 text-right">{(s.harvestRate * 100).toFixed(1)}%</td>
                          <td className="p-2 text-right">{(s.taxAlpha * 100).toFixed(0)} bps</td>
                          <td className="p-2 text-right font-medium" style={{ color: s.annualBenefit >= 0 ? P.grn : P.red }}>
                            {s.annualBenefit >= 0 ? "+" : ""}{ffc(s.annualBenefit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {comparison.trackingError && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-[#C7D0DD]">Tracking Error</div>
                  <div className="text-lg font-bold">{comparison.trackingError.value.toFixed(2)}%</div>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-[#C7D0DD]">Classification</div>
                  <div className="text-sm font-bold">{comparison.trackingError.band}</div>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-[#C7D0DD]">Information Ratio</div>
                  <div className="text-lg font-bold">{comparison.trackingError.informationRatio.toFixed(2)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {feeComparison && !feeLoading && (
        <Card style={V2_CARD} data-testid="card-fee-comparison">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Fee Comparison & Break-Even Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-md border">
                <div className="text-xs font-medium text-[#C7D0DD] mb-2">Direct Indexing Costs</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Advisory Fee</span>
                    <span>{ffc(feeComparison.directIndexing.advisoryFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Trading Costs</span>
                    <span>{ffc(feeComparison.directIndexing.tradingCosts)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-medium">Total ({feeComparison.directIndexing.costBps} bps)</span>
                    <span className="font-bold">{ffc(feeComparison.directIndexing.totalCost)}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-xs font-medium text-[#C7D0DD] mb-2">ETF Costs</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Expense Ratio</span>
                    <span>{ffc(feeComparison.etf.expenseRatio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C7D0DD]">Advisory Fee</span>
                    <span>{ffc(feeComparison.etf.advisoryFee)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-medium">Total ({feeComparison.etf.costBps} bps)</span>
                    <span className="font-bold">{ffc(feeComparison.etf.totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-[#C7D0DD]">Break-Even AUM</div>
                <div className="text-lg font-bold" data-testid="text-breakeven-aum">{ffc(feeComparison.breakEvenAum)}</div>
              </div>
              <div className={`p-3 rounded-md ${feeComparison.annualSavings >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                <div className="text-xs text-[#C7D0DD]">Net Annual Savings</div>
                <div className={`text-lg font-bold ${feeComparison.annualSavings >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-fee-savings">
                  {feeComparison.annualSavings >= 0 ? "+" : ""}{ffc(feeComparison.annualSavings)}
                </div>
              </div>
            </div>

            <div className="text-sm text-[#C7D0DD] p-3 rounded-md bg-muted/20 border">
              {feeComparison.recommendation}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClientTaxContextTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <Skeleton className="h-64" />;

  if (!data) {
    return (
      <Card style={V2_CARD}>
        <CardContent>
          <EmptyState
            icon={Scale}
            title="No tax context data"
            description="Tax context assessment will provide bracket analysis, LTCG rates, and harvesting timing recommendations."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card style={V2_CARD} data-testid="card-current-bracket">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Current Tax Bracket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Federal Rate</span>
              <span className="text-xl font-bold" data-testid="text-current-rate">{(data.currentBracket.rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Bracket Range</span>
              <span className="font-medium">{data.currentBracket.bracketRange}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Filing Status</span>
              <span className="font-medium capitalize">{data.currentBracket.filingStatus}</span>
            </div>
          </CardContent>
        </Card>

        <Card style={V2_CARD} data-testid="card-bracket-projection">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Projected Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Direction</span>
              <Badge variant={data.projectedBracketChange.direction === "up" ? "destructive" : data.projectedBracketChange.direction === "down" ? "default" : "secondary"}>
                {data.projectedBracketChange.direction.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#C7D0DD]">Projected Rate</span>
              <span className="font-medium">{(data.projectedBracketChange.projectedRate * 100).toFixed(0)}%</span>
            </div>
            <div className="text-xs text-[#C7D0DD]">{data.projectedBracketChange.reason}</div>
          </CardContent>
        </Card>
      </div>

      <Card style={V2_CARD} data-testid="card-ltcg-rates">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Long-Term Capital Gains Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-[#C7D0DD]">Base LTCG Rate</div>
              <div className="text-lg font-bold" data-testid="text-ltcg-rate">{(data.ltcgRate * 100).toFixed(0)}%</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-[#C7D0DD]">NIIT (3.8%)</div>
              <div className="text-lg font-bold">{data.niitApplicable ? "Applicable" : "N/A"}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-[#C7D0DD]">Effective LTCG Rate</div>
              <div className="text-lg font-bold" data-testid="text-effective-ltcg">{(data.effectiveLtcgRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={V2_CARD} data-testid="card-carryforward-balance">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Carryforward Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-[#C7D0DD]">Short-Term</div>
              <div className="text-lg font-bold">{ffc(data.carryforwardBalance.shortTerm)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-[#C7D0DD]">Long-Term</div>
              <div className="text-lg font-bold">{ffc(data.carryforwardBalance.longTerm)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-[#C7D0DD]">Total</div>
              <div className="text-lg font-bold" style={{ color: P.amb }}>{ffc(data.carryforwardBalance.total)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SignalCard
        level={data.harvestingTimingRecommendation.urgency === "high" ? "action-needed" : data.harvestingTimingRecommendation.urgency === "medium" ? "review" : "info"}
        title="Harvesting Timing Recommendation"
      >
        <div className="space-y-1" data-testid="card-timing-recommendation">
          <div className="flex items-center gap-2">
            <Badge variant={data.harvestingTimingRecommendation.urgency === "high" ? "destructive" : data.harvestingTimingRecommendation.urgency === "medium" ? "secondary" : "outline"}>
              {data.harvestingTimingRecommendation.urgency.toUpperCase()} URGENCY
            </Badge>
          </div>
          <div className="text-sm font-medium">{data.harvestingTimingRecommendation.recommendation}</div>
          <div className="text-xs text-[#C7D0DD]">{data.harvestingTimingRecommendation.reasoning}</div>
        </div>
      </SignalCard>
    </div>
  );
}

function RebalanceTab({ portfolios, loading, clientId }: { portfolios: any[]; loading: boolean; clientId: string }) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [driftTolerance, setDriftTolerance] = useState("1.0");
  const [approvedTrades, setApprovedTrades] = useState<Set<number>>(new Set());

  const { data: proposal, isLoading: proposalLoading, refetch } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "direct-index-portfolios", selectedPortfolioId, `rebalance-proposal?driftTolerance=${driftTolerance}`],
    enabled: !!selectedPortfolioId,
  });

  if (loading) return <Skeleton className="h-64" />;

  if (portfolios.length === 0) {
    return (
      <Card style={V2_CARD}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No direct index portfolios to rebalance. Create one first.</p>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = (index: number) => {
    setApprovedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleApproveAll = () => {
    if (proposal?.trades) {
      setApprovedTrades(new Set(proposal.trades.map((_: any, i: number) => i)));
    }
  };

  const handleRejectAll = () => {
    setApprovedTrades(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="space-y-1 flex-1">
          <label className="text-xs font-medium text-[#C7D0DD]">Select Portfolio</label>
          <Select value={selectedPortfolioId || ""} onValueChange={(v) => { setSelectedPortfolioId(v); setApprovedTrades(new Set()); }}>
            <SelectTrigger data-testid="select-rebalance-portfolio">
              <SelectValue placeholder="Choose a portfolio..." />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {ffc(parseFloat(p.totalValue || "0"))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-32">
          <label className="text-xs font-medium text-[#C7D0DD]">Drift Tolerance %</label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            max="10"
            value={driftTolerance}
            onChange={(e) => setDriftTolerance(e.target.value)}
            data-testid="input-drift-tolerance"
          />
        </div>
        <div className="pt-5">
          <Button
            size="sm"
            onClick={() => { refetch(); setApprovedTrades(new Set()); }}
            disabled={!selectedPortfolioId || proposalLoading}
            data-testid="button-generate-proposal"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${proposalLoading ? "animate-spin" : ""}`} />
            Generate Proposal
          </Button>
        </div>
      </div>

      {proposalLoading && <Skeleton className="h-64" />}

      {proposal && !proposalLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card style={V2_CARD} data-testid="card-total-trades">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-[#C7D0DD]">Total Trades</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-total-trades">{proposal.summary.positionsAdjusted}</div>
                <div className="text-xs text-[#C7D0DD] mt-0.5">
                  {proposal.summary.totalBuys} buys / {proposal.summary.totalSells} sells
                </div>
              </CardContent>
            </Card>
            <Card style={V2_CARD} data-testid="card-net-cash-flow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-[#C7D0DD]">Net Cash Flow</span>
                </div>
                <div className={`text-xl font-bold ${proposal.summary.netCashFlow >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-net-cash">
                  {proposal.summary.netCashFlow >= 0 ? "+" : ""}{ffc(proposal.summary.netCashFlow)}
                </div>
              </CardContent>
            </Card>
            <Card style={V2_CARD} data-testid="card-tax-impact">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-[#C7D0DD]">Est. Tax Impact</span>
                </div>
                <div className={`text-xl font-bold ${proposal.summary.estimatedTaxImpact >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} data-testid="text-tax-impact">
                  {ffc(proposal.summary.estimatedTaxImpact)}
                </div>
              </CardContent>
            </Card>
            <Card style={V2_CARD} data-testid="card-wash-avoidances">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-[#C7D0DD]">Wash Sale Avoidances</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-wash-avoidances">{proposal.summary.washSaleAvoidances}</div>
              </CardContent>
            </Card>
          </div>

          <Card style={V2_CARD} data-testid="card-post-rebalance-metrics">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Post-Rebalance Projected Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-[#C7D0DD]">Projected Active Share</div>
                  <div className="text-lg font-bold" data-testid="text-projected-active-share">{proposal.postRebalanceMetrics.projectedActiveShare.toFixed(1)}%</div>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-[#C7D0DD]">Projected Tracking Difference</div>
                  <div className="text-lg font-bold" data-testid="text-projected-tracking">{proposal.postRebalanceMetrics.projectedTrackingDifference.toFixed(4)}%</div>
                </div>
              </div>
              {proposal.postRebalanceMetrics.sectorDeviations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[#C7D0DD] mb-2">Projected Sector Deviations</h4>
                  <div className="space-y-1.5">
                    {proposal.postRebalanceMetrics.sectorDeviations.map((sd: any) => (
                      <div key={sd.sector} className="flex items-center justify-between text-sm">
                        <span className="text-[#C7D0DD]">{sd.sector}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs">{sd.target.toFixed(1)}% → {sd.projected.toFixed(1)}%</span>
                          <span className={`font-medium text-xs ${sd.deviation >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {sd.deviation >= 0 ? "+" : ""}{sd.deviation.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {proposal.trades?.length > 0 && (
            <Card style={V2_CARD} data-testid="card-trade-proposals">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Proposed Trades</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleApproveAll} data-testid="button-approve-all">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Approve All
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRejectAll} data-testid="button-reject-all">
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD] w-8"></th>
                        <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Action</th>
                        <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Ticker</th>
                        <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Sector</th>
                        <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Shares</th>
                        <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Est. Value</th>
                        <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Current %</th>
                        <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Target %</th>
                        <th className="text-right p-2.5 text-xs font-medium text-[#C7D0DD]">Tax Impact</th>
                        <th className="text-left p-2.5 text-xs font-medium text-[#C7D0DD]">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.trades.map((trade: any, i: number) => (
                        <tr
                          key={i}
                          className={`border-b last:border-0 cursor-pointer transition-colors ${approvedTrades.has(i) ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                          onClick={() => handleApprove(i)}
                          data-testid={`trade-row-${i}`}
                        >
                          <td className="p-2.5">
                            {approvedTrades.has(i) ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </td>
                          <td className="p-2.5">
                            <Badge variant={trade.action === "buy" ? "default" : "destructive"} className="text-[10px]">
                              {trade.action.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-medium">
                            {trade.ticker}
                            {trade.replacementFor && (
                              <span className="text-xs text-[#C7D0DD] ml-1">(for {trade.replacementFor})</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[#C7D0DD] text-xs">{trade.sector}</td>
                          <td className="p-2.5 text-right">{trade.shares}</td>
                          <td className="p-2.5 text-right font-medium">{ffc(trade.estimatedValue)}</td>
                          <td className="p-2.5 text-right">{trade.currentWeight.toFixed(2)}%</td>
                          <td className="p-2.5 text-right">{trade.targetWeight.toFixed(2)}%</td>
                          <td className={`p-2.5 text-right ${(trade.taxImpact?.taxCost || 0) >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                            {trade.taxImpact ? ffc(trade.taxImpact.taxCost) : "—"}
                          </td>
                          <td className="p-2.5 text-xs text-[#C7D0DD] max-w-[200px] truncate">{trade.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {approvedTrades.size > 0 && (
                  <div className="mt-4 p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 flex items-center justify-between">
                    <div className="text-sm text-green-800 dark:text-green-300">
                      <span className="font-medium">{approvedTrades.size} of {proposal.trades.length}</span> trades approved for execution
                    </div>
                    <Button size="sm" data-testid="button-submit-approved">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Submit Approved Trades
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {proposal.trades?.length === 0 && (
            <Card style={V2_CARD}>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                <p>Portfolio is within drift tolerance. No rebalancing trades needed.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
