import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { P } from "@/styles/tokens";
import {
  Loader2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Building2,
  Heart,
  BarChart3,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";

interface PlanningIntelligenceSectionProps {
  clientId: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  succession_estate: { label: "Succession & Estate", icon: Building2, color: P.amb, bg: P.aL },
  charitable_tax: { label: "Charitable & Tax", icon: Heart, color: P.grn, bg: P.gL },
  direct_indexing_tax: { label: "Direct Indexing & Tax", icon: BarChart3, color: P.blue, bg: P.bIce },
  estate_insurance: { label: "Estate & Insurance", icon: Shield, color: P.red, bg: P.rL },
  holistic: { label: "Holistic Planning", icon: Layers, color: P.gold, bg: P.goldLt },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  action_needed: { label: "Action Needed", color: P.red, bg: P.rL },
  opportunity: { label: "Opportunity", color: P.amb, bg: P.aL },
  info: { label: "Insight", color: P.blue, bg: P.bIce },
};

import { formatCurrency } from "@/lib/format";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

export function PlanningIntelligenceSection({ clientId }: PlanningIntelligenceSectionProps) {
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "planning-intelligence"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/planning-intelligence`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load planning intelligence");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="planning-intelligence-loading">
        <Loader2 className="h-6 w-6 animate-spin mr-3" style={{ color: P.blue }} />
        <span style={{ color: P.mid }}>Analyzing cross-module planning data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-0" style={{ ...V2_CARD, background: P.odBg }}>
        <CardContent className="py-10 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-3" style={{ color: P.amb }} />
          <p style={{ color: P.nText }}>Unable to load planning intelligence</p>
        </CardContent>
      </Card>
    );
  }

  const insights = data?.insights || [];
  const summary = data?.moduleSummary;

  const actionNeeded = insights.filter((i: any) => i.severity === "action_needed");
  const opportunities = insights.filter((i: any) => i.severity === "opportunity");
  const informational = insights.filter((i: any) => i.severity === "info");

  return (
    <div className="space-y-6" data-testid="planning-intelligence-section">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ background: P.bIce }}>
          <Lightbulb className="h-5 w-5" style={{ color: P.blue }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: P.ink }}>Planning Intelligence</h2>
          <p className="text-sm" style={{ color: P.mid }}>Cross-module insights connecting succession, estate, charitable, and tax strategies</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="module-summary-grid">
          <SummaryCard
            title="Business Succession"
            icon={Building2}
            items={[
              { label: "Business Value", value: formatCurrency(summary.succession.totalBusinessValue) },
              { label: "FLP Structures", value: String(summary.succession.flpCount) },
            ]}
            color={P.amb}
            bg={P.aL}
          />
          <SummaryCard
            title="Estate Planning"
            icon={Shield}
            items={[
              { label: "Trust Value", value: formatCurrency(summary.estate.totalTrustValue) },
              { label: "Exemption Left", value: formatCurrency(summary.estate.exemptionRemaining) },
            ]}
            color={P.blue}
            bg={P.bIce}
          />
          <SummaryCard
            title="Charitable"
            icon={Heart}
            items={[
              { label: "DAF Balance", value: formatCurrency(summary.charitable.totalDafBalance) },
              { label: "Tax Deductions", value: formatCurrency(summary.charitable.estimatedDeductions) },
            ]}
            color={P.grn}
            bg={P.gL}
          />
          <SummaryCard
            title="Direct Indexing"
            icon={BarChart3}
            items={[
              { label: "Harvested Losses", value: formatCurrency(summary.directIndexing.totalHarvestedLosses) },
              { label: "Tax Savings", value: formatCurrency(summary.directIndexing.estimatedTaxSavings) },
            ]}
            color={P.gold}
            bg={P.goldLt}
          />
        </div>
      )}

      {insights.length === 0 ? (
        <Card className="border-0" style={{ ...V2_CARD, background: P.odBg }}>
          <CardContent className="py-10 text-center">
            <Lightbulb className="h-8 w-8 mx-auto mb-3" style={{ color: P.nMid }} />
            <p style={{ color: P.nText }}>No cross-module insights available yet.</p>
            <p className="text-sm mt-1" style={{ color: P.nMid }}>
              As planning data is added across modules, insights will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {actionNeeded.length > 0 && (
            <InsightGroup title="Action Needed" insights={actionNeeded} />
          )}
          {opportunities.length > 0 && (
            <InsightGroup title="Opportunities" insights={opportunities} />
          )}
          {informational.length > 0 && (
            <InsightGroup title="Insights" insights={informational} />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title, icon: Icon, items, color, bg,
}: {
  title: string;
  icon: any;
  items: { label: string; value: string }[];
  color: string;
  bg: string;
}) {
  return (
    <Card className="border-0 shadow-sm" style={{ ...V2_CARD, background: bg }}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color }}>{title}</span>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i}>
              <p className="text-xs" style={{ color: P.mid }}>{item.label}</p>
              <p className="text-sm font-semibold" style={{ color: P.ink }}>{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightGroup({ title, insights }: { title: string; insights: any[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2 uppercase tracking-wide" style={{ color: P.mid }}>{title}</h3>
      <div className="space-y-3">
        {insights.map((insight: any) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const catConfig = CATEGORY_CONFIG[insight.category] || CATEGORY_CONFIG.holistic;
  const sevConfig = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;
  const CatIcon = catConfig.icon;

  return (
    <Card className="border-0 shadow-sm" style={{ ...V2_CARD, background: P.odSurf }} data-testid={`insight-card-${insight.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: catConfig.bg }}>
            <CatIcon className="h-4 w-4" style={{ color: catConfig.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-semibold" style={{ color: P.ink }}>{insight.title}</h4>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 border-0"
                style={{ background: sevConfig.bg, color: sevConfig.color }}
                data-testid={`severity-badge-${insight.id}`}
              >
                {sevConfig.label}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: P.dark }}>{insight.description}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {insight.metric && (
                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: P.bIce, color: P.bLo }}>
                  {insight.metric}
                </span>
              )}
              <div className="flex items-center gap-1 flex-wrap">
                {(insight.modules || []).map((mod: string, i: number) => (
                  <span key={i} className="flex items-center gap-0.5">
                    {i > 0 && <ArrowRight className="h-3 w-3" style={{ color: P.fnt }} />}
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: P.odSurf2, color: P.mid }}>
                      {mod}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
