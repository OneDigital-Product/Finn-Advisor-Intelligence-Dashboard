import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronUp,
  Save,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { formatCurrency } from "@/pages/client-detail/shared";
import type {
  V33FinancialAssessmentResult,
  V33DirectIndexingResult,
} from "@server/prompts/types";

// ── Score ring (0-100) ──
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? P.status.success : score >= 50 ? P.status.warning : P.status.danger;

  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.28}
        fontWeight={700}
        fill={color}
      >
        {score}
      </text>
    </svg>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

const STATUS_COLORS: Record<string, string> = {
  strong: "bg-green-100 text-green-700",
  adequate: "bg-blue-100 text-blue-700",
  needs_attention: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const WASH_SALE_COLORS: Record<string, string> = {
  SAFE: "bg-green-100 text-green-800",
  LIKELY_SAFE: "bg-yellow-100 text-yellow-800",
  SUBSTANTIALLY_IDENTICAL: "bg-red-100 text-red-800",
  SAME_SECURITY: "bg-red-200 text-red-900",
};

// ── Agent 15: Financial Assessment Results ──
function FullAnalysisResults({ result }: { result: V33FinancialAssessmentResult }) {
  const [narrativeOpen, setNarrativeOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Score + Net Worth Summary */}
      <div className="flex items-center gap-6">
        <ScoreRing score={result.overallScore} size={96} />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Financial Health Score
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Net Worth: {formatCurrency(result.netWorthSummary.netWorth)} &nbsp;|&nbsp;
            Assets: {formatCurrency(result.netWorthSummary.totalAssets)} &nbsp;|&nbsp;
            Liabilities: {formatCurrency(result.netWorthSummary.totalLiabilities)}
          </p>
        </div>
      </div>

      {/* Domain Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Domain Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.domainScores.map((d) => (
            <div key={d.domain} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-32 truncate">{d.domain}</span>
              <Progress value={d.score} className="flex-1 h-2" />
              <span className="text-xs font-mono w-8 text-right">{d.score}</span>
              <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[d.status] || ""}`}>
                {d.status.replace(/_/g, " ")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Identified Gaps ({result.gaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.gaps.map((gap) => (
                <div
                  key={gap.gapId}
                  className={`rounded-md border p-3 ${SEVERITY_COLORS[gap.severity] || "bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{gap.title}</span>
                    <div className="flex items-center gap-2">
                      {gap.estimatedImpact != null && (
                        <span className="text-xs font-mono">
                          {formatCurrency(gap.estimatedImpact)} impact
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {gap.severity}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{gap.description}</p>
                  <p className="text-xs mt-1 font-medium">→ {gap.recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {result.keyMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.keyMetrics.map((m, i) => (
            <div key={i} className="rounded-lg border p-3 bg-white">
              <p className="text-[10px] text-gray-500 uppercase">{m.label}</p>
              <p className="text-sm font-semibold mt-0.5">{m.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{m.context}</p>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible Advisor Narrative */}
      <div className="border rounded-lg">
        <button
          onClick={() => setNarrativeOpen(!narrativeOpen)}
          className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Advisor Narrative
          {narrativeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {narrativeOpen && (
          <div className="px-3 pb-3 text-xs text-gray-600 whitespace-pre-wrap border-t">
            {result.advisorNarrative}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agent 21: Direct Indexing Results ──
function DirectIndexingResults({ result }: { result: V33DirectIndexingResult }) {
  return (
    <div className="space-y-4">
      {/* Tax Alpha Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 bg-white">
          <p className="text-[10px] text-gray-500 uppercase">Tax Alpha</p>
          <p className="text-sm font-semibold text-green-700">
            {result.taxAlphaAnalysis.annualTaxAlphaPercent.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-400">
            {formatCurrency(result.taxAlphaAnalysis.annualTaxAlphaDollars)}/yr
          </p>
        </div>
        <div className="rounded-lg border p-3 bg-white">
          <p className="text-[10px] text-gray-500 uppercase">Tracking Error</p>
          <p className="text-sm font-semibold">
            {result.taxAlphaAnalysis.trackingErrorPercent.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-400">
            {result.taxAlphaAnalysis.trackingErrorAssessment}
          </p>
        </div>
        <div className="rounded-lg border p-3 bg-white">
          <p className="text-[10px] text-gray-500 uppercase">Net Benefit</p>
          <p className="text-sm font-semibold text-green-700">
            {formatCurrency(result.taxAlphaAnalysis.netBenefitAfterCosts)}
          </p>
          <p className="text-[10px] text-gray-400">after costs</p>
        </div>
        <div className="rounded-lg border p-3 bg-white">
          <p className="text-[10px] text-gray-500 uppercase">Year-End Urgency</p>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              result.yearEndPlanning.urgency === "HIGH"
                ? "bg-red-100 text-red-700"
                : result.yearEndPlanning.urgency === "MEDIUM"
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {result.yearEndPlanning.urgency}
          </Badge>
        </div>
      </div>

      {/* Harvesting Opportunities Table */}
      {result.harvestingOpportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Harvesting Opportunities ({result.harvestingOpportunities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 pr-3">Ticker</th>
                    <th className="text-right py-2 pr-3">Loss</th>
                    <th className="text-right py-2 pr-3">Tax Savings</th>
                    <th className="text-center py-2 pr-3">Type</th>
                    <th className="text-center py-2 pr-3">Wash Sale</th>
                    <th className="text-left py-2 pr-3">Replacement</th>
                    <th className="text-center py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.harvestingOpportunities.map((h, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono font-semibold">{h.ticker}</td>
                      <td className="py-2 pr-3 text-right text-red-600">
                        {formatCurrency(h.lossMagnitude)}
                      </td>
                      <td className="py-2 pr-3 text-right text-green-600">
                        {formatCurrency(h.annualTaxSavings)}
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {h.capitalLossType === "SHORT_TERM" ? "ST" : "LT"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${WASH_SALE_COLORS[h.washSaleRisk] || ""}`}
                        >
                          {h.washSaleRisk.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 font-mono">{h.replacementTicker || "—"}</td>
                      <td className="py-2 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {h.actionRecommendation.replace(/_/g, " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wash Sale Alerts */}
      {result.washSaleAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Wash Sale Alerts ({result.washSaleAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.washSaleAlerts.map((alert, i) => (
              <div
                key={i}
                className="rounded-md border border-red-200 bg-red-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-semibold">{alert.ticker}</span>
                  <Badge variant="outline" className="text-[10px] bg-red-100 text-red-800">
                    {alert.riskLevel}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Window: {alert.restrictedWindowStart} → {alert.restrictedWindowEnd}
                </p>
                <p className="text-xs mt-1">{alert.recommendation}</p>
                <p className="text-[10px] text-gray-400 mt-1">{alert.regulatoryReference}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {result.keyMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.keyMetrics.map((m, i) => (
            <div key={i} className="rounded-lg border p-3 bg-white">
              <p className="text-[10px] text-gray-500 uppercase">{m.label}</p>
              <p className="text-sm font-semibold mt-0.5">{m.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{m.context}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──
export function AnalysisResultsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

// ── Main export ──
interface AnalysisResultsProps {
  analysisType: "full" | "concentration" | "tax-optimization";
  result: V33FinancialAssessmentResult | V33DirectIndexingResult;
  clientId?: string;
  onCreateTask?: (subject: string) => void;
  onShareWithFinn?: (context: string) => void;
}

export function AnalysisResults({
  analysisType,
  result,
  clientId,
  onCreateTask,
  onShareWithFinn,
}: AnalysisResultsProps) {
  const [saving, setSaving] = useState(false);

  const handleSaveToSalesforce = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const summary = analysisType === "full"
        ? (result as V33FinancialAssessmentResult).clientSummary
        : (result as V33DirectIndexingResult).clientSummary;
      await fetch(`/api/clients/${clientId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: `Portfolio Analysis — ${analysisType}`,
          description: summary.slice(0, 2000),
          type: "note",
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg bg-gray-50/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {analysisType === "full" ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              Financial Assessment
            </>
          ) : (
            <>
              <Info className="h-4 w-4 text-blue-500" />
              {analysisType === "concentration" ? "Concentration Analysis" : "Tax Optimization"}
            </>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={handleSaveToSalesforce}
            disabled={saving}
          >
            <Save className="h-3 w-3 mr-1" />
            {saving ? "Saving..." : "Save to SF"}
          </Button>
          {onCreateTask && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => {
                const subject = analysisType === "full"
                  ? "Review financial assessment findings"
                  : "Review tax optimization opportunities";
                onCreateTask(subject);
              }}
            >
              <ClipboardList className="h-3 w-3 mr-1" />
              Create Task
            </Button>
          )}
          {onShareWithFinn && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => {
                const summary = analysisType === "full"
                  ? (result as V33FinancialAssessmentResult).advisorNarrative
                  : (result as V33DirectIndexingResult).advisorNarrative;
                onShareWithFinn(summary.slice(0, 3000));
              }}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Share with Finn
            </Button>
          )}
        </div>
      </div>

      {analysisType === "full" ? (
        <FullAnalysisResults result={result as V33FinancialAssessmentResult} />
      ) : (
        <DirectIndexingResults result={result as V33DirectIndexingResult} />
      )}
    </div>
  );
}
