import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import {
  generateClientInsightsDashboard,
  type PerformanceData,
} from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const session = await getSession();
    const advisor = session.userId ? await getSessionAdvisor(session as any) : null;
    if (!advisor)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const allClients = await storage.getClients(advisor.id);
    if (allClients.length === 0) {
      return NextResponse.json({
        executiveSummary: "No clients assigned to this advisor.",
        healthScore: 0,
        healthScoreLabel: "N/A",
        portfolioInsights: [],
        marketTrends: [],
        recommendations: [],
        riskIndicators: [],
        keyMetrics: [],
        nextSteps: [],
        v33BookAnalysis: {
          concentrationRisk: {
            totalAum: 0, totalClients: 0, hhi: 0, concentrationLevel: "LOW",
            top5AumPercent: 0, top10AumPercent: 0, top20AumPercent: 0,
            singleClientMaxPercent: 0, keyPersonRiskClients: [],
            tierBreakdown: [], mitigationRecommendations: [],
          },
          segmentAnalysis: {
            byLifeStage: [], byGrowth: [],
            retentionRisk: { atRiskCount: 0, atRiskAum: 0, retentionActions: [] },
          },
          complianceDocumentation: {
            fiduciaryStatement: "N/A", dataPrivacyNote: "N/A",
            riskDisclosures: [], reviewTimestamp: new Date().toISOString(),
          },
          evidenceCitations: [],
          advisorNarrative: "No clients found in book.",
          clientSummary: "No clients found in book.",
        },
        complianceStatus: { outcome: "passed", warnings: 0, blocks: 0 },
      });
    }

    const clientSummaries = await Promise.all(
      allClients.map(async (client) => {
        const clientName = sanitizePromptInput(`${client.firstName} ${client.lastName}`);
        const [hlds, acts, tsks, accts, docs] = await Promise.all([
          storage.getHoldingsByClient(client.id),
          storage.getActivitiesByClient(client.id),
          storage.getTasksByClient(client.id),
          storage.getAccountsByClient(client.id),
          storage.getDocumentsByClient(client.id),
        ]);

        const totalAum = accts.reduce(
          (sum, a) => sum + parseFloat(String(a.balance || "0")),
          0
        );
        const topHoldings = hlds.slice(0, 10).map((h) => ({
          ticker: h.ticker,
          name: h.name,
          marketValue:
            typeof h.marketValue === "number"
              ? h.marketValue
              : parseFloat(String(h.marketValue || "0")),
          weight:
            typeof h.weight === "number"
              ? h.weight
              : parseFloat(String(h.weight || "0")),
          sector: h.sector || "",
          unrealizedGainLoss:
            typeof h.unrealizedGainLoss === "number"
              ? h.unrealizedGainLoss
              : parseFloat(String(h.unrealizedGainLoss || "0")),
        }));

        let perf: PerformanceData[] = [];
        if (accts.length > 0 && accts[0].householdId) {
          perf = await storage.getPerformanceByHousehold(accts[0].householdId);
        }

        return {
          clientId: client.id,
          clientName,
          totalAum,
          accountCount: accts.length,
          accountTypes: accts.map((a) => a.accountType),
          riskTolerance: client.riskTolerance || undefined,
          segment: client.segment || undefined,
          topHoldings,
          performance: perf.map((p) => ({
            period: p.period || "unknown",
            returnPercent: p.returnPct ? parseFloat(p.returnPct) : null,
            benchmarkPercent: p.benchmarkPct ? parseFloat(p.benchmarkPct) : null,
          })),
          recentActivities: acts.slice(0, 5).map((a) => `${a.type}: ${a.subject}`),
          pendingTasks: tsks.filter((t) => t.status !== "completed").length,
          documentsCount: docs.length,
          lastContact: client.lastContactDate || undefined,
        };
      })
    );

    const totalBookAum = clientSummaries.reduce((sum, c) => sum + c.totalAum, 0);

    const result = await generateClientInsightsDashboard({
      advisorId: advisor.id,
      advisorName: advisor.name || undefined,
      clients: clientSummaries,
      totalBookAum,
      totalClientCount: clientSummaries.length,
    });

    const complianceContent = [
      result.executiveSummary,
      ...(result.proactiveAlerts || []).map(
        (a: any) => `${a.title}: ${a.description}`
      ),
    ].join("\n");
    const { result: guardedContent, complianceStatus } =
      await applyComplianceGuardrail(
        complianceContent,
        "ai_insights_dashboard",
        advisor.id
      );
    if (complianceStatus.outcome === "blocked") {
      result.executiveSummary = guardedContent;
      result.advisorNarrative = guardedContent;
      result.clientSummary = "Content held for compliance review.";
    } else if (complianceStatus.outcome === "flagged") {
      result.advisorNarrative = guardedContent;
    }

    const statusToTrend = (s: string) =>
      s === "positive" ? "up" : s === "negative" ? "down" : "stable";

    const legacyResponse = {
      executiveSummary: result.executiveSummary,
      healthScore: result.bookHealthScore,
      healthScoreLabel: result.bookHealthLabel,
      portfolioInsights: (result.performanceMetrics || []).map((m: any) => ({
        title: m.metricName,
        description: m.assessment,
        type: m.trend === "UP" ? "positive" : m.trend === "DOWN" ? "warning" : "info",
        metric: m.currentValue,
      })),
      marketTrends: (result.proactiveAlerts || [])
        .filter((a: any) => a.category === "PORTFOLIO_DRIFT")
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          impact:
            a.priority === "HIGH"
              ? "negative"
              : a.priority === "MEDIUM"
                ? "neutral"
                : "positive",
          relevantHoldings: [] as string[],
        })),
      recommendations: (result.opportunityPipeline || []).map((o: any) => ({
        title: o.title,
        description: o.description,
        priority: o.priority <= 1 ? "high" : o.priority <= 3 ? "medium" : "low",
        category: o.opportunityType.replace(/_/g, " ").toLowerCase(),
        estimatedValue:
          o.estimatedRevenue > 0
            ? `$${o.estimatedRevenue.toLocaleString()}`
            : undefined,
      })),
      riskIndicators: (result.proactiveAlerts || [])
        .filter(
          (a: any) => a.priority === "HIGH" || a.priority === "MEDIUM"
        )
        .slice(0, 5)
        .map((a: any) => ({
          title: a.title,
          severity: a.priority.toLowerCase(),
          description: a.description,
          action: a.actionRequired,
        })),
      keyMetrics: (result.keyMetrics || []).map((m: any) => ({
        label: m.label,
        value: m.value,
        trend: statusToTrend(m.status),
        context: m.context,
      })),
      nextSteps: (result.proactiveAlerts || [])
        .filter((a: any) => a.priority === "HIGH")
        .slice(0, 5)
        .map((a: any) => a.actionRequired),
      v33BookAnalysis: {
        concentrationRisk: result.concentrationRisk,
        segmentAnalysis: result.segmentAnalysis,
        complianceDocumentation: result.complianceDocumentation,
        evidenceCitations: result.evidenceCitations,
        advisorNarrative: result.advisorNarrative,
        clientSummary: result.clientSummary,
      },
      complianceStatus,
    };

    return NextResponse.json(legacyResponse);
  } catch (err) {
    logger.error({ err }, "AI insights dashboard generation failed");
    return NextResponse.json(
      { error: "Failed to generate insights dashboard" },
      { status: 500 }
    );
  }
}
