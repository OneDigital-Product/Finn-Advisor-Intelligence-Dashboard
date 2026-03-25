import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/styles/tokens";

import {
  ArrowRightLeft, MapPin, Receipt, Building2, ExternalLink, Clock, Heart, BarChart3, TrendingDown, ArrowDown, Brain,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { InfoTip } from "@/components/info-tip";
import { formatCurrency } from "@/lib/format";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";
const fmt = (v: number) => formatCurrency(v, { abbreviated: false });

// TODO: Tax brackets should be updated annually or sourced from an API.
// Current brackets: 2024 (Single filer). Update TAX_BRACKET_YEAR when changing.
const TAX_BRACKET_YEAR = 2024;
const BRACKETS_2024 = [
  { min: 0, max: 11_600, rate: 0.10 },
  { min: 11_600, max: 47_150, rate: 0.12 },
  { min: 47_150, max: 100_525, rate: 0.22 },
  { min: 100_525, max: 191_950, rate: 0.24 },
  { min: 191_950, max: 243_725, rate: 0.32 },
  { min: 243_725, max: 609_350, rate: 0.35 },
  { min: 609_350, max: Infinity, rate: 0.37 },
];

function computeFederalTax(taxableIncome: number): number {
  let tax = 0;
  for (const bracket of BRACKETS_2024) {
    if (taxableIncome <= bracket.min) break;
    const taxable = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

function computeEffectiveRate(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  return (computeFederalTax(taxableIncome) / taxableIncome) * 100;
}

const TAX_TOOLS = [
  {
    id: "roth-conversion",
    name: "Roth Conversion Optimizer",
    description: "Model multi-year conversions, bracket impact, and breakeven analysis",
    icon: ArrowRightLeft,
    route: "/calculators/roth-conversion",
    calcType: "roth_conversion",
  },
  {
    id: "asset-location",
    name: "Asset Location Optimizer",
    description: "Optimize asset placement across account types for maximum after-tax return",
    icon: MapPin,
    route: "/calculators/asset-location",
    calcType: "asset_location",
  },
  {
    id: "tax-bracket",
    name: "Tax Bracket Projection",
    description: "Visualize brackets with income scenario sliders and marginal/effective rates",
    icon: Receipt,
    route: "/calculators/tax-bracket",
    calcType: "tax_bracket",
  },
  {
    id: "qsbs",
    name: "QSBS Tracker",
    description: "Track qualified small business stock positions and Section 1202 exclusion eligibility",
    icon: Building2,
    route: "/calculators/qsbs",
    calcType: "qsbs",
  },
];

interface TaxStrategySectionProps {
  clientId: string;
  clientName: string;
  totalAum: number;
}

export function TaxStrategySection({ clientId, clientName, totalAum }: TaxStrategySectionProps) {
  const router = useRouter();

  const { data: runs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/calculators/runs", { clientId }],
    queryFn: async () => {
      const res = await fetch(`/api/calculators/runs?clientId=${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: planningIntel } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "planning-intelligence"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/planning-intelligence`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const taxRuns = runs.filter(r =>
    ["roth_conversion", "asset_location", "tax_bracket", "qsbs"].includes(r.calculatorType)
  );

  const charitableDeductions = planningIntel?.moduleSummary?.charitable?.estimatedDeductions || 0;
  const harvestedLosses = planningIntel?.moduleSummary?.directIndexing?.totalHarvestedLosses || 0;
  const diTaxSavings = planningIntel?.moduleSummary?.directIndexing?.estimatedTaxSavings || 0;
  const hasTaxImpactData = charitableDeductions > 0 || harvestedLosses > 0;

  const estimatedIncome = totalAum > 0 ? totalAum * 0.04 : 0;
  const totalDeductions = charitableDeductions + Math.min(harvestedLosses, 3_000 + (estimatedIncome > 0 ? estimatedIncome * 0.1 : 0));
  const baselineRate = computeEffectiveRate(estimatedIncome);
  const reducedRate = computeEffectiveRate(Math.max(0, estimatedIncome - totalDeductions));
  const rateReduction = baselineRate - reducedRate;
  const taxSavingsFromDeductions = computeFederalTax(estimatedIncome) - computeFederalTax(Math.max(0, estimatedIncome - totalDeductions));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-1.5" data-testid="text-tax-strategy-title">Tax Strategy <InfoTip term="tax_alpha" /></h2>
          <p className="text-sm text-muted-foreground">Advanced tax optimization tools for {clientName}</p>
        </div>
        <CassidyAnalysisButton
          taskType="analysis"
          clientId={clientId}
          context={{
            section: "tax_strategy",
            clientName,
            totalAum,
            estimatedIncome,
            baselineEffectiveRate: baselineRate,
            reducedEffectiveRate: reducedRate,
            rateReduction,
            charitableDeductions,
            harvestedLosses,
            diTaxSavings,
            taxSavingsFromDeductions: Math.round(taxSavingsFromDeductions),
            recentTaxRuns: taxRuns.slice(0, 5).map((r: any) => ({
              type: r.calculatorType,
              date: r.createdAt,
            })),
          }}
          label="AI Tax Analysis"
          icon={<Brain className="h-4 w-4" />}
          size="sm"
        />
      </div>

      {hasTaxImpactData && (
        <Card className="border-0 shadow-sm" style={{ ...V2_CARD, background: P.bFr }} data-testid="tax-impact-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: P.bLo }}>Cross-Module Tax Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {charitableDeductions > 0 && (
                <div className="flex items-start gap-2" data-testid="charitable-deductions-metric">
                  <Heart className="h-4 w-4 mt-0.5 shrink-0" style={{ color: P.grn }} />
                  <div>
                    <p className="text-xs" style={{ color: P.mid }}>Charitable Deductions</p>
                    <p className="text-sm font-semibold" style={{ color: P.ink }}>{fmt(charitableDeductions)}</p>
                    <p className="text-[10px]" style={{ color: P.lt }}>DAF, CRT, QCD combined</p>
                  </div>
                </div>
              )}
              {harvestedLosses > 0 && (
                <div className="flex items-start gap-2" data-testid="harvested-losses-metric">
                  <TrendingDown className="h-4 w-4 mt-0.5 shrink-0" style={{ color: P.blue }} />
                  <div>
                    <p className="text-xs" style={{ color: P.mid }}>Harvested Losses</p>
                    <p className="text-sm font-semibold" style={{ color: P.ink }}>{fmt(harvestedLosses)}</p>
                    <p className="text-[10px]" style={{ color: P.lt }}>Direct indexing tax alpha</p>
                  </div>
                </div>
              )}
              {diTaxSavings > 0 && (
                <div className="flex items-start gap-2" data-testid="di-tax-savings-metric">
                  <BarChart3 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: P.grn }} />
                  <div>
                    <p className="text-xs" style={{ color: P.mid }}>Est. Tax Savings</p>
                    <p className="text-sm font-semibold" style={{ color: P.ink }}>{fmt(diTaxSavings)}</p>
                    <p className="text-[10px]" style={{ color: P.lt }}>From loss harvesting at 37%</p>
                  </div>
                </div>
              )}
            </div>
            {rateReduction > 0.01 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: P.odBorder }} data-testid="effective-rate-impact">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-3.5 w-3.5" style={{ color: P.grn }} />
                  <p className="text-xs font-medium" style={{ color: P.bLo }}>Effective Tax Rate Impact ({TAX_BRACKET_YEAR} brackets)</p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px]" style={{ color: P.lt }}>Baseline Rate</p>
                    <p className="text-sm font-semibold" style={{ color: P.mid }}>{baselineRate.toFixed(1)}%</p>
                  </div>
                  <ArrowDown className="h-3 w-3" style={{ color: P.grn }} />
                  <div>
                    <p className="text-[10px]" style={{ color: P.lt }}>After Deductions</p>
                    <p className="text-sm font-semibold" style={{ color: P.grn }}>{reducedRate.toFixed(1)}%</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px]" style={{ color: P.lt }}>Rate Reduction</p>
                    <p className="text-sm font-bold" style={{ color: P.grn }}>-{rateReduction.toFixed(1)}pp</p>
                  </div>
                  {taxSavingsFromDeductions > 0 && (
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: P.lt }}>Projected Savings</p>
                      <p className="text-sm font-bold" style={{ color: P.grn }}>{fmt(Math.round(taxSavingsFromDeductions))}</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] mt-1" style={{ color: P.lt }}>Based on estimated income from 4% withdrawal rate and combined charitable/harvesting deductions</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TAX_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const recentRun = taxRuns.find(r => r.calculatorType === tool.calcType);
          return (
            <Card key={tool.id} style={V2_CARD} className="hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(tool.route)} data-testid={`card-tax-tool-${tool.id}`}>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold mb-0.5">{tool.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                    {recentRun && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Last run: {new Date(recentRun.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {taxRuns.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="" style={V2_TITLE}>Recent Tax Analysis Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {taxRuns.slice(0, 5).map((run: any) => {
                const tool = TAX_TOOLS.find(t => t.calcType === run.calculatorType);
                return (
                  <div key={run.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border" data-testid={`run-${run.id}`}>
                    <div className="flex items-center gap-3">
                      {tool && <tool.icon className="w-4 h-4 text-primary" />}
                      <div>
                        <p className="text-sm font-medium">{tool?.name || run.calculatorType}</p>
                        <p className="text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{run.calculatorType.replace(/_/g, " ")}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
