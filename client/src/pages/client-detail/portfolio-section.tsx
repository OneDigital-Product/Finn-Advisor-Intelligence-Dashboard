import { useMemo, useState, useCallback, useEffect, useRef, type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Building,
  Newspaper,
  RefreshCw,
  ExternalLink,
  Info,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import { SourcePill, formatCurrency, COLORS_THEMED } from "./shared";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";
import { ChartSwitcher } from "@/components/charts/chart-switcher";
import { useWidgetConfig, CLIENT_PORTFOLIO_WIDGETS } from "@/hooks/use-widget-config";
import { WidgetCustomizePanel } from "@/components/widget-customize-panel";
import { WidgetGrid } from "@/components/widget-grid";
import { PortfolioDataPanels } from "@/components/charts/portfolio-data-panels";

// ── Lazy-loaded chart components ──────────────────────────────────────
// Each chart pulls in Recharts + SVG rendering code. Loading them via
// dynamic() with ssr:false keeps them out of the initial bundle — only
// the active ChartSwitcher tab triggers a chunk download.
const ChartSkeleton = () => <Skeleton className="h-[300px] w-full rounded-lg" />;

const AllocationSunburst = dynamic(
  () => import("@/components/charts/allocation-sunburst").then(m => ({ default: m.AllocationSunburst })),
  { loading: ChartSkeleton, ssr: false },
);
const HoldingsTreemap = dynamic(
  () => import("@/components/charts/holdings-treemap").then(m => ({ default: m.HoldingsTreemap })),
  { loading: ChartSkeleton, ssr: false },
);
const GainLossHeatmap = dynamic(
  () => import("@/components/charts/gain-loss-heatmap").then(m => ({ default: m.GainLossHeatmap })),
  { loading: ChartSkeleton, ssr: false },
);
const SectorHeatmap = dynamic(
  () => import("@/components/charts/sector-heatmap").then(m => ({ default: m.SectorHeatmap })),
  { loading: ChartSkeleton, ssr: false },
);
const RiskRadar = dynamic(
  () => import("@/components/charts/risk-radar").then(m => ({ default: m.RiskRadar })),
  { loading: ChartSkeleton, ssr: false },
);
const RiskGauge = dynamic(
  () => import("@/components/charts/risk-gauge").then(m => ({ default: m.RiskGauge })),
  { loading: ChartSkeleton, ssr: false },
);
const HoldingsTable = dynamic(
  () => import("@/components/charts/holdings-table").then(m => ({ default: m.HoldingsTable })),
  { loading: ChartSkeleton, ssr: false },
);
import { ChevronDown } from "lucide-react";
const ffc = (v: number) => formatCurrency(v, { abbreviated: false });

interface PortfolioSectionProps {
  clientId?: string;
  pieData: { name: string; value: number }[];
  perf: any[];
  holdings: any[];
  accounts: any[];
  alternativeAssets: any[];
  transactions?: any[];
  marketData: any;
  marketLoading: boolean;
  refetchMarket: () => void;
  onAccountSelect: (id: string) => void;
  riskDistribution?: { name: string; count: number; value: number; pct: number }[];
  topHoldingsByValue?: { ticker: string; name: string; marketValue: number; weight: number; sector: string }[];
  sectorExposure?: { name: string; count: number; value: number; pct: number }[];
  portfolioPerformance?: any;
  portfolioContributions?: any;
}

export function PortfolioSection({ clientId, pieData, perf, holdings, accounts, alternativeAssets, transactions, marketData, marketLoading, refetchMarket, onAccountSelect, riskDistribution, topHoldingsByValue, sectorExposure, portfolioPerformance, portfolioContributions }: PortfolioSectionProps) {
  // O(1) account lookup — replaces O(n) accounts.find() per holding row.
  // Built once when accounts change; used 150+ times per render.
  const accountMap = useMemo(
    () => new Map((accounts || []).map((a: any) => [a.id, a])),
    [accounts]
  );

  // Fetch transactions from the dedicated endpoint (may have data the monolithic endpoint lacks)
  const { data: txData } = useQuery({
    queryKey: [`/api/clients/${clientId}/transactions`],
    queryFn: () => fetch(`/api/clients/${clientId}/transactions`, { credentials: "include" }).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId,
  });
  const allTransactions = txData?.transactions?.length > 0 ? txData.transactions : (transactions || []);

  // Holdings search — client-side filter, debounced 300ms
  const [holdingsSearch, setHoldingsSearch] = useState("");
  const [debouncedHoldingsSearch, setDebouncedHoldingsSearch] = useState("");
  const holdingsSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleHoldingsSearch = useCallback((value: string) => {
    setHoldingsSearch(value);
    if (holdingsSearchTimer.current) clearTimeout(holdingsSearchTimer.current);
    holdingsSearchTimer.current = setTimeout(() => setDebouncedHoldingsSearch(value), 300);
  }, []);

  const visibleHoldings = useMemo(() => {
    const base = holdings.filter((h: any) => parseFloat(h.marketValue) > 0 || parseFloat(h.shares) > 0);
    if (!debouncedHoldingsSearch) return base;
    const q = debouncedHoldingsSearch.toLowerCase();
    return base.filter((h: any) =>
      (h.ticker || "").toLowerCase().includes(q) ||
      (h.description || h.name || "").toLowerCase().includes(q)
    );
  }, [holdings, debouncedHoldingsSearch]);

  // "Show all" toggle for inline transaction table
  const [showAllTxns, setShowAllTxns] = useState(false);
  const sortedTransactions = useMemo(() => {
    return [...allTransactions].sort((a: any, b: any) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [allTransactions]);
  const visibleTransactions = showAllTxns ? sortedTransactions : sortedTransactions.slice(0, 50);

  const { compositeRiskScore, riskBreakdown } = useMemo(() => {
    const top5 = (topHoldingsByValue || []).slice(0, 5).reduce((s, h) => s + (h.weight || 0), 0);
    const div = Math.max(0, Math.min(100, 100 - top5));
    const sec = Math.min(100, ((sectorExposure || []).length / 11) * 100);
    const sharpe = Math.min(100, Math.abs(portfolioPerformance?.sharpeRatio ?? 0) * 33);
    const dd = Math.max(0, Math.min(100, 100 + (portfolioPerformance?.maxDrawdown ?? 0)));
    const score = Math.round((div + sec + sharpe + dd) / 4);
    const breakdown = [
      { label: "Diversification", value: Math.round(div), description: "" },
      { label: "Sectors", value: Math.round(sec), description: "" },
      { label: "Sharpe", value: Math.round(sharpe), description: "" },
      { label: "Drawdown", value: Math.round(dd), description: "" },
    ];
    return { compositeRiskScore: score, riskBreakdown: breakdown };
  }, [topHoldingsByValue, sectorExposure, portfolioPerformance]);

  const orionBadge = <SourcePill source="orion" />;

  const widgetConfig = useWidgetConfig("client-portfolio", CLIENT_PORTFOLIO_WIDGETS);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [editingWidgets, setEditingWidgets] = useState(false);

  // Pre-compute perfRisk widget content (avoids IIFE inside JSX map)
  const perfRiskContent = useMemo(() => {
    const perfItems = Array.isArray(portfolioPerformance) ? portfolioPerformance : portfolioPerformance ? [portfolioPerformance] : [];
    const firstPerf = perfItems[0];
    if (!firstPerf || (firstPerf.returnPct === undefined && firstPerf.netReturn === undefined)) return null;

    const returnPct = parseFloat(firstPerf.returnPct ?? firstPerf.netReturn ?? 0);
    const benchmarkPct = parseFloat(firstPerf.benchmarkPct ?? firstPerf.benchmarkReturn ?? 0);
    const alpha = parseFloat(firstPerf.alpha ?? (returnPct - benchmarkPct).toFixed(2));
    const sharpeRatio = parseFloat(firstPerf.sharpeRatio ?? firstPerf.sharpe ?? 0);
    const maxDrawdown = parseFloat(firstPerf.maxDrawdown ?? firstPerf.maximumDrawdown ?? 0);

    const fmtPct = (v: number, showPlus = true) => `${showPlus && v > 0 ? "+" : ""}${v.toFixed(2)}%`;
    const colorClass = (v: number) => v >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive";

    const contribItems = Array.isArray(portfolioContributions) ? portfolioContributions : portfolioContributions ? [portfolioContributions] : [];
    const firstContrib = contribItems[0];
    const contributionsYTD = firstContrib ? parseFloat(firstContrib.contributions ?? firstContrib.totalContributions ?? 0) : 0;
    const withdrawalsYTD = firstContrib ? parseFloat(firstContrib.withdrawals ?? firstContrib.totalWithdrawals ?? 0) : 0;
    const netFlow = contributionsYTD - Math.abs(withdrawalsYTD);
    const hasContrib = firstContrib && (contributionsYTD !== 0 || withdrawalsYTD !== 0);

    return (
      <>
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
              Performance & Risk <SourcePill source="orion" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Return", value: fmtPct(returnPct), cls: colorClass(returnPct) },
                { label: "Benchmark", value: fmtPct(benchmarkPct), cls: "" },
                { label: "Alpha", value: fmtPct(alpha), cls: colorClass(alpha) },
                { label: "Sharpe Ratio", value: sharpeRatio.toFixed(2), cls: "" },
                { label: "Max Drawdown", value: fmtPct(maxDrawdown, false), cls: "text-destructive" },
                { label: "Period", value: "Since Inception", cls: "", isText: true },
              ].map((m: any) => (
                <div key={m.label} className="rounded-lg border border-white/[0.06] p-4 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B95AA] mb-2">{m.label}</div>
                  <div className={`${m.isText ? "text-sm font-medium" : "text-base font-semibold tabular-nums"} ${m.cls}`} style={{ fontFamily: m.isText ? undefined : "var(--font-data)" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {hasContrib && (
          <Card style={V2_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
                Cash Flow YTD <SourcePill source="orion" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-white/[0.06] p-4 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B95AA] mb-2">Contributions YTD</div>
                  <div className="text-base font-semibold text-green-600 dark:text-green-400 tabular-nums" style={{ fontFamily: "var(--font-data)" }}>{formatCurrency(Math.abs(contributionsYTD))}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] p-4 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B95AA] mb-2">Withdrawals YTD</div>
                  <div className="text-base font-semibold text-destructive tabular-nums" style={{ fontFamily: "var(--font-data)" }}>{formatCurrency(Math.abs(withdrawalsYTD))}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] p-4 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B95AA] mb-2">Net Flow</div>
                  <div className={`text-base font-semibold tabular-nums ${colorClass(netFlow)}`} style={{ fontFamily: "var(--font-data)" }}>{netFlow >= 0 ? "+" : ""}{formatCurrency(Math.abs(netFlow))}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  }, [portfolioPerformance, portfolioContributions]);

  return (
    <div className="space-y-5">
      {/* ── Toolbar: Customize + Edit Layout ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <WidgetCustomizePanel
          title="Portfolio Widgets"
          widgetConfig={widgetConfig}
          open={customizeOpen}
          onOpenChange={setCustomizeOpen}
        />
      </div>

      {/* ── Drag-and-drop widget grid ── */}
      <WidgetGrid
        widgetConfig={widgetConfig}
        editing={editingWidgets}
        onEditingChange={setEditingWidgets}
      >
      {{
      /* Performance Summary */
      perfSummary: perf.length > 0 ? (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2" style={V2_TITLE}>Performance Summary {orionBadge}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {perf.map((p: any) => {
                const ret = parseFloat(p.returnPct);
                const bench = parseFloat(p.benchmarkPct || "0");
                const diff = ret - bench;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4">
                    <div className="w-14 shrink-0">
                      <span className="text-sm font-medium">{p.period}</span>
                      {p.calculationMethod && <div className="text-[10px] text-[#C7D0DD]">{p.calculationMethod}</div>}
                    </div>
                    <div className="flex-1">
                      <Progress value={Math.min(Math.abs(ret), 100)} className="h-2" />
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`font-semibold ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                        {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
                      </span>
                      <span className={`text-xs ${diff >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                        {diff >= 0 ? "+" : ""}{diff.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null,

      /* Chart Switcher */
      charts: <ChartSwitcher>
        {{
          allocation: (
            <AllocationSunburst
              allocationBreakdown={pieData}
              sectorExposure={sectorExposure || []}
              topHoldingsByValue={topHoldingsByValue || []}
              sourceBadge={orionBadge}
            />
          ),
          holdings: (
            <HoldingsTreemap topHoldingsByValue={topHoldingsByValue || []} isLiveData={true} sourceBadge={orionBadge} />
          ),
          risk: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4">
              <RiskRadar
                topHoldingsByValue={topHoldingsByValue}
                sectorExposure={sectorExposure}
                riskDistribution={riskDistribution}
                portfolioPerformance={portfolioPerformance}
                sourceBadge={orionBadge}
              />
              <RiskGauge
                score={compositeRiskScore}
                breakdown={riskBreakdown}
                sourceBadge={orionBadge}
              />
            </div>
          ),
          gainloss: (
            <GainLossHeatmap holdings={holdings || []} sourceBadge={orionBadge} />
          ),
          concentration: (
            <SectorHeatmap holdings={holdings || []} sourceBadge={orionBadge} />
          ),
        }}
      </ChartSwitcher>,

      /* Model Drift */
      modelDrift: clientId ? <ModelDriftCard clientId={clientId} /> : null,

      /* Stress Test */
      stressTest: clientId ? <StressTestCard clientId={clientId} /> : null,

      /* Risk Distribution + Top Holdings + Product Type — brand-compliant panels */
      riskGrid: <PortfolioDataPanels
        riskDistribution={riskDistribution}
        topHoldingsByValue={topHoldingsByValue}
        sectorExposure={sectorExposure}
        sourceBadge={orionBadge}
      />,

      /* Performance & Risk Metrics (pre-computed above) */
      perfRisk: perfRiskContent,

      /* Holdings Table */
      holdingsTable: <HoldingsTable
        holdings={holdings}
        marketData={marketData}
        marketLoading={marketLoading}
        refetchMarket={refetchMarket}
        onAccountSelect={onAccountSelect}
        accounts={accounts}
      />,

      /* Transaction History */
      transactions: allTransactions.length > 0 ? (
        <CollapsibleSection title="Transaction History" count={allTransactions.length} defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-[#C7D0DD]">Date</th>
                  <th className="pb-2 font-medium text-[#C7D0DD]">Type</th>
                  <th className="pb-2 font-medium text-[#C7D0DD]">Ticker</th>
                  <th className="pb-2 font-medium text-[#C7D0DD]">Description</th>
                  <th className="pb-2 font-medium text-[#C7D0DD] text-right">Qty</th>
                  <th className="pb-2 font-medium text-[#C7D0DD] text-right">Price</th>
                  <th className="pb-2 font-medium text-[#C7D0DD] text-right">Amount</th>
                  <th className="pb-2 font-medium text-[#C7D0DD]">Account</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((txn: any, idx: number) => {
                  const txnType = (txn.type || "").toLowerCase();
                  const typeBadgeStyle = txnType.includes("buy") || txnType.includes("purchase")
                    ? { backgroundColor: "rgba(34,197,94,0.15)", color: P.grn, borderColor: "rgba(34,197,94,0.3)" }
                    : txnType.includes("sell") || txnType.includes("redemption")
                    ? { backgroundColor: "rgba(239,68,68,0.15)", color: P.red, borderColor: "rgba(239,68,68,0.3)" }
                    : txnType.includes("dividend") || txnType.includes("income")
                    ? { backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.3)" }
                    : txnType.includes("transfer")
                    ? { backgroundColor: "rgba(249,115,22,0.15)", color: "#fb923c", borderColor: "rgba(249,115,22,0.3)" }
                    : { backgroundColor: "rgba(156,163,175,0.15)", color: "#9ca3af", borderColor: "rgba(156,163,175,0.3)" };
                  const amt = parseFloat(txn.amount || "0");
                  const amtColor = amt >= 0 ? P.grn : P.red;
                  return (
                    <tr key={txn.id || idx} className="border-b last:border-0" data-testid={`txn-${txn.id || idx}`}>
                      <td className="py-2.5 whitespace-nowrap">
                        {txn.date ? new Date(txn.date).toLocaleDateString() : "\u2014"}
                      </td>
                      <td className="py-2.5">
                        <span
                          style={{
                            ...typeBadgeStyle,
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            borderWidth: "1px",
                            borderStyle: "solid",
                          }}
                        >
                          {txn.type || "\u2014"}
                        </span>
                      </td>
                      <td className="py-2.5 font-semibold">{txn.ticker || "\u2014"}</td>
                      <td className="py-2.5 text-[#C7D0DD] max-w-[200px] truncate" title={txn.description}>
                        {txn.description || "\u2014"}
                      </td>
                      <td className="py-2.5 text-right">
                        {txn.shares != null ? Number(txn.shares).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "\u2014"}
                      </td>
                      <td className="py-2.5 text-right">
                        {txn.price != null ? `$${Number(txn.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "\u2014"}
                      </td>
                      <td className="py-2.5 text-right font-medium" style={{ color: amtColor }}>
                        {txn.amount != null
                          ? `${amt < 0 ? "-" : ""}$${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "\u2014"}
                      </td>
                      <td className="py-2.5 text-[#C7D0DD] text-xs truncate max-w-[120px]" title={txn.accountName}>
                        {txn.accountName || "\u2014"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!showAllTxns && sortedTransactions.length > 50 && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Showing 50 of {sortedTransactions.length} transactions
            </p>
          )}
        </CollapsibleSection>
      ) : null,

      /* Alternative Assets */
      alternatives: (alternativeAssets || []).length > 0 ? (
        <CollapsibleSection title="Properties & Alternative Assets" count={(alternativeAssets || []).length} defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-[#C7D0DD]">Asset</th>
                  <th className="pb-2 font-medium text-[#C7D0DD]">Type</th>
                  <th className="pb-2 font-medium text-[#C7D0DD]">Location</th>
                  <th className="pb-2 font-medium text-[#C7D0DD] text-right">Cost Basis</th>
                  <th className="pb-2 font-medium text-[#C7D0DD] text-right">Est. Value</th>
                  <th className="pb-2 font-medium text-[#C7D0DD] text-right">Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {(alternativeAssets || []).map((asset: any) => {
                  const estVal = parseFloat(asset.estimatedValue || "0");
                  const basis = parseFloat(asset.costBasis || "0");
                  const gl = basis > 0 ? estVal - basis : 0;
                  const glColor = gl > 0 ? P.grn : gl < 0 ? P.red : undefined;
                  return (
                    <tr key={asset.id} className="border-b last:border-0" data-testid={`alt-asset-${asset.id}`}>
                      <td className="py-2.5">
                        <div className="font-semibold">{asset.name}</div>
                        {asset.description && <div className="text-xs text-muted-foreground">{asset.description}</div>}
                        {asset.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{asset.notes}</div>}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px]">{asset.assetType}</Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">{asset.location || "—"}</td>
                      <td className="py-2.5 text-right text-[#C7D0DD]">{basis > 0 ? ffc(basis) : "—"}</td>
                      <td className="py-2.5 text-right font-medium">{ffc(estVal)}</td>
                      <td className="py-2.5 text-right font-medium" style={glColor ? { color: glColor } : undefined}>
                        {basis > 0 ? `${gl >= 0 ? "+" : ""}${ffc(gl)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const assets = alternativeAssets || [];
                  const totalBasis = assets.reduce((sum: number, a: any) => {
                    const b = parseFloat(a.costBasis || "0");
                    return b > 0 ? sum + b : sum;
                  }, 0);
                  const totalValue = assets.reduce((sum: number, a: any) => sum + parseFloat(a.estimatedValue || "0"), 0);
                  const totalGL = assets.reduce((sum: number, a: any) => {
                    const b = parseFloat(a.costBasis || "0");
                    const v = parseFloat(a.estimatedValue || "0");
                    return b > 0 ? sum + (v - b) : sum;
                  }, 0);
                  const hasBasis = totalBasis > 0;
                  const glColor = totalGL > 0 ? P.grn : totalGL < 0 ? P.red : undefined;
                  return (
                    <tr className="border-t">
                      <td className="py-2.5 font-semibold" colSpan={3}>Total Alternative Assets</td>
                      <td className="py-2.5 text-right font-semibold text-[#C7D0DD]">
                        {hasBasis ? ffc(totalBasis) : "—"}
                      </td>
                      <td className="py-2.5 text-right font-semibold">{ffc(totalValue)}</td>
                      <td className="py-2.5 text-right font-semibold" style={glColor ? { color: glColor } : undefined}>
                        {hasBasis ? `${totalGL >= 0 ? "+" : ""}${ffc(totalGL)}` : "—"}
                      </td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </CollapsibleSection>
      ) : null,

      /* Portfolio News */
      news: <CollapsibleSection title="Portfolio News" count={marketData?.news?.length || 0} defaultOpen={false}>
        {marketLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : !marketData?.news || marketData.news.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent news for portfolio holdings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(marketData.news as any[]).map((item: any, idx: number) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                data-testid={`news-item-${idx}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-2">{item.title}</div>
                    {item.source && (
                      <div className="text-[10px] text-muted-foreground mt-1">{item.source}</div>
                    )}
                    {item.pubDate && (
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(item.pubDate).toLocaleDateString()} {new Date(item.pubDate).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </a>
            ))}
          </div>
        )}
      </CollapsibleSection>,
      }}
      </WidgetGrid>
    </div>
  );
}

function CollapsibleSection({ title, count, defaultOpen, children }: {
  title: string; count: number; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={V2_CARD}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <span style={V2_TITLE}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {count > 0 && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
          <ChevronDown style={{
            width: 16, height: 16, color: "var(--color-text-tertiary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }} />
        </div>
      </button>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ModelDriftCard — Shows target vs actual allocation and tolerance bands.
 * Uses react-query for caching (10 min stale time). Renders only when data exists.
 * ────────────────────────────────────────────────────────────────────────── */

function ModelDriftCard({ clientId }: { clientId: string }) {
  const { data: driftData } = useQuery({
    queryKey: [`/api/clients/${clientId}/model-drift`],
    queryFn: () => fetch(`/api/clients/${clientId}/model-drift`, { credentials: "include" }).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
    enabled: !!clientId,
  });

  const drift = driftData?.modelDrift;
  if (!drift) return null;

  const allocations: any[] = drift.allocations || [];
  const outOfTolerance = allocations.filter((a: any) => !a.inTolerance);

  // Color helper — green in tolerance, orange > 3%, red > 5% or out of tolerance
  const driftColor = (alloc: any) => {
    const abs = Math.abs(alloc.driftPct || 0);
    if (!alloc.inTolerance || abs > 5) return P.red;
    if (abs > 3) return P.odOrange;
    return P.odGreen;
  };

  return (
    <Card style={V2_CARD}>
      <CardHeader style={{ paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <CardTitle style={{ ...V2_TITLE, display: "flex", alignItems: "center", gap: 8 }}>
            <Activity style={{ width: 16, height: 16 }} />
            Model Drift — {drift.modelName}
            <SourcePill source="orion" />
          </CardTitle>
          <Badge
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: ".03em",
              padding: "2px 8px",
              borderRadius: 4,
              background: drift.inTolerance ? "rgba(142,185,53,0.12)" : "rgba(196,75,75,0.12)",
              color: drift.inTolerance ? P.odGreen : P.red,
              border: `1px solid ${drift.inTolerance ? "rgba(142,185,53,0.25)" : "rgba(196,75,75,0.25)"}`,
            }}
          >
            {drift.inTolerance ? "IN TOLERANCE" : `OUT OF TOLERANCE (${outOfTolerance.length})`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Column headers */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, color: P.odT2, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase" as const }}>
            <div style={{ width: 100 }}>Asset Class</div>
            <div style={{ flex: 1 }}>Allocation</div>
            <div style={{ width: 56, textAlign: "right" }}>Current</div>
            <div style={{ width: 56, textAlign: "right" }}>Target</div>
            <div style={{ width: 60, textAlign: "right" }}>Drift</div>
          </div>

          {allocations.map((alloc: any, idx: number) => {
            const barColor = driftColor(alloc);
            // Scale bars so the largest value fills most of the bar area
            const scale = Math.max(Math.max(alloc.targetPct, alloc.currentPct) * 1.2, 10);

            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                {/* Asset class name */}
                <div style={{ width: 100, fontWeight: 500, color: P.odT1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {alloc.assetClass}
                </div>

                {/* Bar visualization */}
                <div style={{ flex: 1, position: "relative", height: 20, borderRadius: 3, background: "rgba(45,55,72,0.35)" }}>
                  {/* Current % filled bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: `${Math.min((alloc.currentPct / scale) * 100, 100)}%`,
                      borderRadius: 3,
                      background: barColor,
                      opacity: 0.35,
                      transition: "width 0.3s ease",
                    }}
                  />
                  {/* Target % thin marker line */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: `${Math.min((alloc.targetPct / scale) * 100, 100)}%`,
                      width: 2,
                      height: "100%",
                      background: P.odLBlue,
                      borderRadius: 1,
                      opacity: 0.8,
                    }}
                  />
                </div>

                {/* Current % */}
                <div style={{ width: 56, textAlign: "right", fontFamily: "monospace", fontWeight: 500, color: P.odT1 }}>
                  {alloc.currentPct?.toFixed(1)}%
                </div>

                {/* Target % */}
                <div style={{ width: 56, textAlign: "right", fontFamily: "monospace", color: P.odT2 }}>
                  ({alloc.targetPct?.toFixed(1)}%)
                </div>

                {/* Drift value */}
                <div style={{ width: 60, textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: driftColor(alloc) }}>
                  {alloc.driftPct > 0 ? "+" : ""}{alloc.driftPct?.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall drift footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${P.odBorder2}`,
            fontSize: 12,
            color: P.odT2,
          }}
        >
          <span>
            Overall drift:{" "}
            <span style={{ fontWeight: 600, fontFamily: "monospace", color: drift.inTolerance ? P.odGreen : P.red }}>
              {drift.overallDrift?.toFixed(2)}%
            </span>
          </span>
          <span style={{ fontSize: 10, color: P.nMid }}>Source: {driftData.source || "orion"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * StressTestCard — Hidden Levers stress test scenarios from Orion.
 * Loads on mount; shows impact of various market scenarios on portfolio.
 * ────────────────────────────────────────────────────────────────────────── */

function StressTestCard({ clientId }: { clientId: string }) {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("unknown");

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/clients/${clientId}/stress-test`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        setScenarios(json.scenarios || []);
        setRiskProfile(json.riskProfile || null);
        setSource(json.source || "unavailable");
      })
      .catch(() => setSource("error"))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return null;
  if (source === "unavailable" && scenarios.length === 0 && !riskProfile) return null;

  return (
    <Card style={V2_CARD}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle style={V2_TITLE} className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Stress Test Scenarios
            <SourcePill source="orion" />
          </CardTitle>
          {riskProfile && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px]">
                Risk Score: {riskProfile.riskScore}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {riskProfile.riskCategory}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {scenarios.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No stress test scenarios available for this portfolio.
          </p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((s, idx) => {
              const isNegative = (s.portfolioImpactPct || 0) < 0;
              const barWidth = Math.min(Math.abs(s.portfolioImpactPct || 0) * 3, 100);
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div className="w-40 truncate font-medium" title={s.scenarioName}>
                    {s.scenarioName}
                  </div>
                  <div className="flex-1 h-4 rounded-sm bg-muted/30 overflow-hidden relative">
                    <div
                      className={`absolute h-full ${isNegative ? "bg-red-500/40" : "bg-green-500/40"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className={`w-16 text-right font-mono font-medium ${
                    isNegative ? "text-red-400" : "text-green-400"
                  }`}>
                    {s.portfolioImpactPct > 0 ? "+" : ""}{s.portfolioImpactPct?.toFixed(1)}%
                  </div>
                  <div className={`w-20 text-right font-mono text-[10px] ${
                    isNegative ? "text-red-400/70" : "text-green-400/70"
                  }`}>
                    {s.portfolioImpactDollar !== 0
                      ? `${s.portfolioImpactDollar < 0 ? "-" : "+"}$${Math.abs(s.portfolioImpactDollar).toLocaleString()}`
                      : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {riskProfile && (
          <div className="flex gap-4 mt-3 pt-2 border-t text-[10px] text-muted-foreground">
            {riskProfile.maxDrawdown != null && <span>Max Drawdown: <span className="text-red-400 font-mono">{riskProfile.maxDrawdown.toFixed(1)}%</span></span>}
            {riskProfile.volatility != null && <span>Volatility: <span className="font-mono">{riskProfile.volatility.toFixed(1)}%</span></span>}
            {riskProfile.sharpeRatio != null && <span>Sharpe: <span className="font-mono">{riskProfile.sharpeRatio.toFixed(2)}</span></span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * TransactionHistory — On-demand transaction table fetched from Orion.
 * Loads only when the user clicks "Show Transactions" to avoid unnecessary
 * API calls on every portfolio tab render.
 * ────────────────────────────────────────────────────────────────────────── */

interface Transaction {
  id: string;
  date: string;
  type: string;
  description: string;
  ticker?: string;
  shares?: number;
  price?: number;
  amount: number;
  accountName?: string;
  status?: string;
}

function TransactionHistory({ clientId }: { clientId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("unknown");
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/transactions?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTransactions(json.transactions || []);
      setSource(json.source || "unknown");
      setTotal(json.total || 0);
      setLoaded(true);
    } catch (err: any) {
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const filteredTxns = useMemo(() => {
    if (typeFilter === "all") return transactions;
    return transactions.filter(
      (t) => (t.type || "").toLowerCase() === typeFilter.toLowerCase()
    );
  }, [transactions, typeFilter]);

  const txnTypes = useMemo(() => {
    const types = new Set(transactions.map((t) => (t.type || "unknown").toLowerCase()));
    return Array.from(types).sort();
  }, [transactions]);

  // Color-code transaction types
  const typeColor = (type: string): string => {
    const t = (type || "").toLowerCase();
    if (t.includes("buy") || t.includes("purchase")) return "text-green-400";
    if (t.includes("sell") || t.includes("redemption")) return "text-red-400";
    if (t.includes("dividend") || t.includes("income")) return "text-blue-400";
    if (t.includes("transfer")) return "text-yellow-400";
    if (t.includes("fee") || t.includes("expense")) return "text-orange-400";
    return "text-muted-foreground";
  };

  if (!loaded) {
    return (
      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle style={V2_TITLE} className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Transaction History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load Transactions"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Click &quot;Load Transactions&quot; to fetch trade history from Orion (buys, sells, dividends, transfers).
          </p>
          {error && (
            <p className="text-xs text-red-400 mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={V2_CARD}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle
            style={{ ...V2_TITLE, cursor: "pointer" }}
            className="flex items-center gap-2"
            onClick={() => setExpanded(!expanded)}
          >
            <Activity className="w-4 h-4" />
            Transaction History
            <Badge variant="secondary" className="text-[10px] ml-1">
              {total} total
            </Badge>
            {source === "orion" && (
              <SourcePill source="orion" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {txnTypes.length > 1 && (
              <select
                className="text-xs bg-transparent border rounded px-2 py-1"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {txnTypes.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTransactions}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {filteredTxns.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              {source === "unavailable"
                ? "Transaction data unavailable — MuleSoft/Orion connection required."
                : "No transactions found for this client."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-3 font-medium">Date</th>
                    <th className="text-left py-2 pr-3 font-medium">Type</th>
                    <th className="text-left py-2 pr-3 font-medium">Description</th>
                    <th className="text-left py-2 pr-3 font-medium">Ticker</th>
                    <th className="text-right py-2 pr-3 font-medium">Shares</th>
                    <th className="text-right py-2 pr-3 font-medium">Price</th>
                    <th className="text-right py-2 pr-3 font-medium">Amount</th>
                    <th className="text-left py-2 font-medium">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((txn, idx) => (
                    <tr
                      key={txn.id || idx}
                      className="border-b border-border/40 hover:bg-accent/30 transition-colors"
                    >
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {txn.date ? new Date(txn.date).toLocaleDateString() : "—"}
                      </td>
                      <td className={`py-1.5 pr-3 font-medium whitespace-nowrap ${typeColor(txn.type)}`}>
                        {(txn.type || "—").toUpperCase()}
                      </td>
                      <td className="py-1.5 pr-3 max-w-[200px] truncate" title={txn.description}>
                        {txn.description || "—"}
                      </td>
                      <td className="py-1.5 pr-3 font-mono">
                        {txn.ticker || "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono">
                        {txn.shares != null ? txn.shares.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono">
                        {txn.price != null ? `$${txn.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className={`py-1.5 pr-3 text-right font-mono font-medium ${
                        (txn.amount || 0) >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {txn.amount != null
                          ? `${txn.amount < 0 ? "-" : ""}$${Math.abs(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="py-1.5 text-muted-foreground truncate max-w-[120px]" title={txn.accountName}>
                        {txn.accountName || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTxns.length < total && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Showing {filteredTxns.length} of {total} transactions
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
