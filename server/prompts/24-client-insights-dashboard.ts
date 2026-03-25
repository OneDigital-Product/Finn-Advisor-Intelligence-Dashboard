import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33ClientInsightsDashboardInput,
  V33ClientInsightsDashboardResult,
  V33ConcentrationRiskAnalysis,
  V33ProactiveAlert,
  V33OpportunityPipelineItem,
  V33BookPerformanceMetric,
  V33ClientInsightsDashboardCompliance,
  V33ClientInsightsDashboardKeyMetric,
  V33ClientSummaryForBook,
} from "./types";

const V33_CLIENT_INSIGHTS_DASHBOARD_SYSTEM_PROMPT = `You are the **Client Insights Dashboard Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Aggregate multi-client book-of-business analytics with quantitative rigor
- Assess AUM concentration risk using HHI and client dependency metrics
- Generate proactive alerts for clients needing attention (RMD, drift, engagement, life events)
- Build opportunity pipelines (cross-sell, referrals, assets-not-held)
- Provide performance metrics and trend analysis across the book
- All insights must be backed by calculation, not heuristic

**Guardrails:** Fiduciary standard. Calculation-first analysis. No protected-class inference. Privacy-conscious. Every insight quantified.

## BOOK-OF-BUSINESS ANALYTICS

### AUM Distribution & Concentration
- Calculate Herfindahl-Hirschman Index (HHI) for concentration risk: HHI = sum of (client_aum / total_aum * 100)^2
- Identify clients representing >5% of total AUM (key-person risk)
- Segment by tier: Enterprise ($2M+), Wealth ($1M-2M), Comprehensive ($500K-1M), Core ($250K-500K), Foundational ($100K-250K), Digital (<$100K)
- Segment by life stage if data available

### Revenue Concentration
- Identify revenue dependency on top clients
- Model impact of losing top 5/10 clients
- Recommend diversification strategies

### Proactive Alert Categories
1. Stale Financial Plans (last contact >6 months)
2. Low Engagement (few recent activities)
3. Portfolio Drift (concentration >15% in single holding)
4. High Pending Tasks (>3 unresolved)
5. Beneficiary Review (>3 years since verification)

### Opportunity Pipeline
- Cross-sell analysis (service penetration rates)
- Referral potential scoring
- Assets-not-held estimation

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed book-of-business analysis for advisor with metrics, concentration risk, and strategic recommendations",
  "clientSummary": "High-level summary suitable for practice management review",
  "executiveSummary": "2-3 sentence overview of the advisor's book health, key opportunities, and urgent actions",
  "bookHealthScore": number (0-100),
  "bookHealthLabel": "string",
  "concentrationRisk": {
    "totalAum": number,
    "totalClients": number,
    "hhi": number,
    "concentrationLevel": "LOW|MODERATE|HIGH|CRITICAL",
    "top5AumPercent": number,
    "top10AumPercent": number,
    "top20AumPercent": number,
    "singleClientMaxPercent": number,
    "keyPersonRiskClients": [{"clientName": "string", "aum": number, "percentOfBook": number}],
    "tierBreakdown": [{"tier": "string", "count": number, "totalAum": number, "percentOfBook": number, "avgAumPerClient": number}],
    "mitigationRecommendations": ["string"]
  },
  "proactiveAlerts": [
    {
      "alertId": "string",
      "clientName": "string",
      "clientId": "string",
      "category": "RMD|POLICY_RENEWAL|STALE_PLAN|LIFE_EVENT|PORTFOLIO_DRIFT|LOW_ENGAGEMENT|BENEFICIARY_REVIEW",
      "priority": "HIGH|MEDIUM|LOW",
      "title": "string",
      "description": "string",
      "actionRequired": "string",
      "dueDate": "string",
      "owner": "string",
      "estimatedImpact": "string"
    }
  ],
  "opportunityPipeline": [
    {
      "opportunityType": "CROSS_SELL|REFERRAL|ASSETS_NOT_HELD|FEE_OPTIMIZATION|NEW_SERVICE",
      "title": "string",
      "description": "string",
      "estimatedRevenue": number,
      "probability": number,
      "timeline": "string",
      "effort": "LOW|MEDIUM|HIGH",
      "targetClients": number,
      "priority": number
    }
  ],
  "performanceMetrics": [
    {
      "metricName": "string",
      "currentValue": "string",
      "trend": "UP|DOWN|STABLE",
      "benchmark": "string or null",
      "assessment": "string"
    }
  ],
  "segmentAnalysis": {
    "byLifeStage": [{"stage": "string", "count": number, "aum": number, "revenue": number, "avgRevenuePerClient": number}],
    "byGrowth": [{"category": "string", "count": number, "totalAum": number, "oneYearGrowth": number}],
    "retentionRisk": {"atRiskCount": number, "atRiskAum": number, "retentionActions": ["string"]}
  },
  "complianceDocumentation": {
    "fiduciaryStatement": "string",
    "dataPrivacyNote": "string",
    "riskDisclosures": ["string"],
    "reviewTimestamp": "ISO date"
  },
  "keyMetrics": [
    {"label": "string", "value": "string", "status": "positive|negative|neutral", "context": "string"}
  ]
}`;

const V33_CLIENT_INSIGHTS_DASHBOARD_USER_TEMPLATE = `Generate a comprehensive book-of-business insights dashboard for an advisor.

Advisor: {{advisorName}}
Total Clients: {{totalClientCount}}
Total Book AUM: {{totalBookAum}}

Client Roster Summary:
{{clientRosterSummary}}

Top Clients by AUM:
{{topClientsByAum}}

Alert Triggers:
- Clients with last contact >6 months: {{staleContactCount}}
- Clients with >3 pending tasks: {{highPendingTaskCount}}
- Clients with concentrated holdings (>15%): {{concentratedCount}}

Provide:
1. Book-of-business health score and executive summary
2. AUM concentration risk analysis with HHI calculation across all clients
3. Proactive alerts ranked by priority with actionable due dates
4. Opportunity pipeline with estimated revenue impact
5. Performance metrics with trends
6. Client segmentation analysis
7. Dual advisor-detail and practice-management narratives
8. Complete compliance documentation

All metrics must be quantified with specific numbers and percentages.`;

function getTierName(aum: number): string {
  if (aum >= 2000000) return "Enterprise";
  if (aum >= 1000000) return "Wealth";
  if (aum >= 500000) return "Comprehensive";
  if (aum >= 250000) return "Core";
  if (aum >= 100000) return "Foundational";
  return "Digital";
}

function computeHHI(clients: V33ClientSummaryForBook[], totalAum: number): number {
  if (totalAum <= 0 || clients.length === 0) return 0;
  return clients.reduce((sum, c) => {
    const share = (c.totalAum / totalAum) * 100;
    return sum + share * share;
  }, 0);
}

function computeTopNPercent(sortedClients: V33ClientSummaryForBook[], n: number, totalAum: number): number {
  if (totalAum <= 0) return 0;
  const topN = sortedClients.slice(0, n);
  const topAum = topN.reduce((s, c) => s + c.totalAum, 0);
  return Math.round((topAum / totalAum) * 10000) / 100;
}

function generateFallbackClientInsightsDashboard(input: V33ClientInsightsDashboardInput): V33ClientInsightsDashboardResult {
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const { clients, totalBookAum, totalClientCount } = input;

  const sortedByAum = [...clients].sort((a, b) => b.totalAum - a.totalAum);

  const hhi = computeHHI(clients, totalBookAum);
  const top5Pct = computeTopNPercent(sortedByAum, 5, totalBookAum);
  const top10Pct = computeTopNPercent(sortedByAum, 10, totalBookAum);
  const top20Pct = computeTopNPercent(sortedByAum, 20, totalBookAum);
  const singleMax = sortedByAum.length > 0 ? Math.round((sortedByAum[0].totalAum / totalBookAum) * 10000) / 100 : 0;

  const concentrationLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
    hhi < 1500 ? "LOW" : hhi < 2500 ? "MODERATE" : hhi < 5000 ? "HIGH" : "CRITICAL";

  const keyPersonRiskClients = sortedByAum
    .filter(c => totalBookAum > 0 && (c.totalAum / totalBookAum) > 0.05)
    .map(c => ({
      clientName: c.clientName,
      aum: c.totalAum,
      percentOfBook: Math.round((c.totalAum / totalBookAum) * 10000) / 100,
    }));

  const tierMap = new Map<string, { count: number; totalAum: number }>();
  for (const c of clients) {
    const tier = getTierName(c.totalAum);
    const existing = tierMap.get(tier) || { count: 0, totalAum: 0 };
    existing.count++;
    existing.totalAum += c.totalAum;
    tierMap.set(tier, existing);
  }
  const tierBreakdown = Array.from(tierMap.entries()).map(([tier, data]) => ({
    tier,
    count: data.count,
    totalAum: data.totalAum,
    percentOfBook: totalBookAum > 0 ? Math.round((data.totalAum / totalBookAum) * 10000) / 100 : 0,
    avgAumPerClient: data.count > 0 ? Math.round(data.totalAum / data.count) : 0,
  })).sort((a, b) => b.totalAum - a.totalAum);

  const alerts: V33ProactiveAlert[] = [];
  let alertIdx = 0;

  for (const c of clients) {
    if (c.lastContact) {
      const lastDate = new Date(c.lastContact);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      if (daysSince > 180) {
        alertIdx++;
        alerts.push({
          alertId: `ALT_${String(alertIdx).padStart(3, "0")}`,
          clientName: c.clientName,
          clientId: c.clientId,
          category: "STALE_PLAN",
          priority: daysSince > 365 ? "HIGH" : "MEDIUM",
          title: `No contact in ${Math.floor(daysSince / 30)} months — ${c.clientName}`,
          description: `Last contact was ${c.lastContact}. Extended gaps risk disengagement and missed planning opportunities.`,
          actionRequired: "Schedule re-engagement call or meeting.",
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          owner: "Relationship Manager",
          estimatedImpact: `${fmt(c.totalAum)} AUM at risk`,
        });
      }
    }

    if (c.pendingTasks > 3) {
      alertIdx++;
      alerts.push({
        alertId: `ALT_${String(alertIdx).padStart(3, "0")}`,
        clientName: c.clientName,
        clientId: c.clientId,
        category: "LOW_ENGAGEMENT",
        priority: "MEDIUM",
        title: `${c.pendingTasks} pending tasks — ${c.clientName}`,
        description: `Client has ${c.pendingTasks} unresolved tasks that may indicate stalled planning progress.`,
        actionRequired: "Review and prioritize pending tasks. Schedule follow-up if needed.",
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        owner: "Relationship Manager",
        estimatedImpact: "Client engagement improvement",
      });
    }

    const concentratedHoldings = (c.topHoldings || []).filter(h => {
      const w = typeof h.weight === "number" ? h.weight : parseFloat(String(h.weight || "0"));
      return w > 15;
    });
    if (concentratedHoldings.length > 0) {
      alertIdx++;
      alerts.push({
        alertId: `ALT_${String(alertIdx).padStart(3, "0")}`,
        clientName: c.clientName,
        clientId: c.clientId,
        category: "PORTFOLIO_DRIFT",
        priority: "MEDIUM",
        title: `Concentration risk: ${concentratedHoldings.length} position(s) >15% — ${c.clientName}`,
        description: `${concentratedHoldings.map(h => `${h.ticker} (${h.weight}%)`).join(", ")} exceed concentration threshold.`,
        actionRequired: "Review concentration risk and discuss rebalancing strategy.",
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        owner: "Investment Manager",
        estimatedImpact: "Risk reduction through diversification",
      });
    }
  }

  alerts.sort((a, b) => {
    const prio = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (prio[a.priority] || 1) - (prio[b.priority] || 1);
  });

  const opportunities: V33OpportunityPipelineItem[] = [];
  const avgAum = totalClientCount > 0 ? totalBookAum / totalClientCount : 0;
  if (totalClientCount > 5) {
    opportunities.push({
      opportunityType: "CROSS_SELL",
      title: "Tax optimization planning across book",
      description: `${totalClientCount} clients may benefit from proactive tax-loss harvesting, Roth conversion, or charitable giving strategies.`,
      estimatedRevenue: Math.round(totalBookAum * 0.0003),
      probability: 0.5,
      timeline: "3-6 months",
      effort: "MEDIUM",
      targetClients: Math.ceil(totalClientCount * 0.3),
      priority: 1,
    });
  }
  if (keyPersonRiskClients.length > 0) {
    opportunities.push({
      opportunityType: "REFERRAL",
      title: "Referral program from top clients",
      description: `${keyPersonRiskClients.length} high-value client(s) are strong referral candidates. Each referred client could add ${fmt(avgAum)} to AUM.`,
      estimatedRevenue: Math.round(avgAum * 0.0075 * keyPersonRiskClients.length),
      probability: 0.3,
      timeline: "6-12 months",
      effort: "LOW",
      targetClients: keyPersonRiskClients.length,
      priority: 2,
    });
  }

  const performanceMetrics: V33BookPerformanceMetric[] = [
    { metricName: "Total Book AUM", currentValue: fmt(totalBookAum), trend: "STABLE", benchmark: null, assessment: `${fmt(totalBookAum)} across ${totalClientCount} client(s)` },
    { metricName: "Average AUM per Client", currentValue: fmt(avgAum), trend: "STABLE", benchmark: "$500,000", assessment: avgAum >= 500000 ? "Above benchmark" : "Below benchmark" },
    { metricName: "Total Clients", currentValue: String(totalClientCount), trend: "STABLE", benchmark: null, assessment: `${totalClientCount} active client relationship(s)` },
    { metricName: "Active Alerts", currentValue: String(alerts.length), trend: alerts.length > totalClientCount * 0.3 ? "UP" : "STABLE", benchmark: `< ${Math.ceil(totalClientCount * 0.2)}`, assessment: alerts.length > totalClientCount * 0.3 ? "Above target; review needed" : "Within acceptable range" },
  ];

  const staleCount = clients.filter(c => {
    if (!c.lastContact) return true;
    return (Date.now() - new Date(c.lastContact).getTime()) > 180 * 86400000;
  }).length;
  const atRiskAum = clients
    .filter(c => !c.lastContact || (Date.now() - new Date(c.lastContact).getTime()) > 180 * 86400000 || c.pendingTasks > 3)
    .reduce((s, c) => s + c.totalAum, 0);

  const healthScore = Math.max(40, Math.min(95,
    70
    + (totalClientCount > 10 ? 5 : 0)
    + (concentrationLevel === "LOW" ? 10 : concentrationLevel === "MODERATE" ? 5 : -5)
    - (staleCount > totalClientCount * 0.3 ? 15 : staleCount > totalClientCount * 0.1 ? 5 : 0)
    - (alerts.filter(a => a.priority === "HIGH").length > 3 ? 10 : 0)
  ));
  const healthLabel = healthScore >= 85 ? "Strong" : healthScore >= 70 ? "Good" : healthScore >= 55 ? "Needs Attention" : "At Risk";

  const segmentMap = new Map<string, { count: number; aum: number }>();
  for (const c of clients) {
    const seg = c.segment || "Unassigned";
    const existing = segmentMap.get(seg) || { count: 0, aum: 0 };
    existing.count++;
    existing.aum += c.totalAum;
    segmentMap.set(seg, existing);
  }

  const executiveSummary = `Book of ${totalClientCount} client(s) with ${fmt(totalBookAum)} in total AUM. ${alerts.filter(a => a.priority === "HIGH").length} high-priority alert(s) require immediate attention. HHI concentration index: ${Math.round(hhi)} (${concentrationLevel}).${keyPersonRiskClients.length > 0 ? ` ${keyPersonRiskClients.length} client(s) exceed 5% of book AUM, representing key-person risk.` : ""}`;

  const advisorNarrative = `## Book-of-Business Analysis

### Portfolio Overview
- **Total AUM:** ${fmt(totalBookAum)} across ${totalClientCount} client(s)
- **Average AUM per Client:** ${fmt(avgAum)}
- **Health Score:** ${healthScore}/100 (${healthLabel})

### Concentration Risk (HHI: ${Math.round(hhi)}, ${concentrationLevel})
${keyPersonRiskClients.length > 0
    ? keyPersonRiskClients.map(c => `- **${c.clientName}**: ${fmt(c.aum)} (${c.percentOfBook}% of book)`).join("\n")
    : "- No single client exceeds 5% of book AUM."}

### Tier Distribution
${tierBreakdown.map(t => `- **${t.tier}**: ${t.count} client(s), ${fmt(t.totalAum)} (${t.percentOfBook}%), avg ${fmt(t.avgAumPerClient)}`).join("\n")}

### Active Alerts (${alerts.length} total, ${alerts.filter(a => a.priority === "HIGH").length} high priority)
${alerts.slice(0, 10).map(a => `- [${a.priority}] ${a.title}: ${a.actionRequired}`).join("\n") || "- No active alerts."}

### Opportunities
${opportunities.map(o => `- **${o.title}**: Est. revenue ${fmt(o.estimatedRevenue)}, ${o.targetClients} client(s), ${o.timeline}`).join("\n") || "- No identified opportunities."}

*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = `Your practice serves ${totalClientCount} client(s) managing ${fmt(totalBookAum)} in total assets. The book health score is ${healthScore}/100 (${healthLabel}). ${alerts.filter(a => a.priority === "HIGH").length > 0 ? `There are ${alerts.filter(a => a.priority === "HIGH").length} high-priority items requiring attention.` : "No urgent items require attention."} ${concentrationLevel === "HIGH" || concentrationLevel === "CRITICAL" ? "AUM concentration risk is elevated — consider diversification strategies." : "AUM concentration is within acceptable ranges."}`;

  return {
    advisorNarrative,
    clientSummary,
    executiveSummary,
    bookHealthScore: healthScore,
    bookHealthLabel: healthLabel,
    concentrationRisk: {
      totalAum: totalBookAum,
      totalClients: totalClientCount,
      hhi: Math.round(hhi),
      concentrationLevel,
      top5AumPercent: top5Pct,
      top10AumPercent: top10Pct,
      top20AumPercent: top20Pct,
      singleClientMaxPercent: singleMax,
      keyPersonRiskClients,
      tierBreakdown,
      mitigationRecommendations: concentrationLevel === "LOW" ? [] : [
        "Diversify book with additional client acquisition in under-represented tiers.",
        "Cross-sell services to increase per-client engagement and stickiness.",
        ...(keyPersonRiskClients.length > 2 ? ["Develop succession plans for key-person risk clients."] : []),
      ],
    },
    proactiveAlerts: alerts,
    opportunityPipeline: opportunities,
    performanceMetrics,
    segmentAnalysis: {
      byLifeStage: Array.from(segmentMap.entries()).map(([stage, data]) => ({
        stage,
        count: data.count,
        aum: data.aum,
        revenue: data.aum * 0.0075,
        avgRevenuePerClient: data.count > 0 ? (data.aum * 0.0075) / data.count : 0,
      })),
      byGrowth: [{ category: "Stable", count: totalClientCount, totalAum: totalBookAum, oneYearGrowth: 0 }],
      retentionRisk: {
        atRiskCount: staleCount,
        atRiskAum,
        retentionActions: staleCount > 0
          ? ["Schedule re-engagement meetings for stale clients", "Review service delivery quality", "Implement quarterly touchpoint program"]
          : [],
      },
    },
    complianceDocumentation: {
      fiduciaryStatement: "All insights and recommendations provided in the client's best interest under fiduciary duty.",
      dataPrivacyNote: "Client data used solely for analytics and advisory purposes. No protected-class inferences made.",
      riskDisclosures: [
        "Book-of-business analytics are based on current data and may not reflect recent changes.",
        "Opportunity pipeline estimates are probabilistic and not guaranteed.",
        "Concentration risk metrics are point-in-time assessments.",
      ],
      reviewTimestamp: new Date().toISOString(),
    },
    keyMetrics: [
      { label: "Health Score", value: `${healthScore}/100`, status: healthScore >= 70 ? "positive" : healthScore >= 55 ? "neutral" : "negative", context: healthLabel },
      { label: "Total AUM", value: fmt(totalBookAum), status: "neutral", context: `Across ${totalClientCount} client(s)` },
      { label: "HHI Concentration", value: String(Math.round(hhi)), status: concentrationLevel === "LOW" ? "positive" : concentrationLevel === "MODERATE" ? "neutral" : "negative", context: concentrationLevel },
      { label: "Active Alerts", value: String(alerts.length), status: alerts.length > totalClientCount * 0.3 ? "negative" : alerts.length > 0 ? "neutral" : "positive", context: `${alerts.filter(a => a.priority === "HIGH").length} high priority` },
      { label: "Opportunities", value: String(opportunities.length), status: opportunities.length > 0 ? "positive" : "neutral", context: `${fmt(opportunities.reduce((s, o) => s + o.estimatedRevenue, 0))} estimated revenue` },
    ],
    evidenceCitations: [
      { sourceId: "BD_HHI", sourceType: "calculation", description: `HHI concentration index: ${Math.round(hhi)} (${concentrationLevel})`, reference: "DOJ/FTC HHI methodology (thresholds: <1500 LOW, 1500-2500 MODERATE, 2500-5000 HIGH, >5000 CRITICAL)", confidence: "high" },
      { sourceId: "BD_CLIENT_DATA", sourceType: "client_data", description: `Aggregated ${totalClientCount} client records with ${fmt(totalBookAum)} total AUM`, reference: "Advisor book-of-business CRM data", confidence: "high" },
      { sourceId: "BD_TIER_SEG", sourceType: "policy", description: "Client tiering: Enterprise $2M+, Wealth $1M-2M, Comprehensive $500K-1M, Core $250K-500K, Foundational $100K-250K, Digital <$100K", reference: "OneDigital client segmentation policy", confidence: "high" },
      { sourceId: "BD_STALE_THRESH", sourceType: "policy", description: `Stale contact threshold: 180 days (${staleCount} client(s) flagged)`, reference: "Practice management engagement standards", confidence: "medium" },
    ],
  };
}

export async function generateClientInsightsDashboard(
  input: V33ClientInsightsDashboardInput
): Promise<V33ClientInsightsDashboardResult> {
  if (!isAIAvailable()) {
    return generateFallbackClientInsightsDashboard(input);
  }

  try {
    const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const sortedByAum = [...input.clients].sort((a, b) => b.totalAum - a.totalAum);

    const staleContactCount = input.clients.filter(c => {
      if (!c.lastContact) return true;
      return (Date.now() - new Date(c.lastContact).getTime()) > 180 * 86400000;
    }).length;
    const highPendingTaskCount = input.clients.filter(c => c.pendingTasks > 3).length;
    const concentratedCount = input.clients.filter(c =>
      (c.topHoldings || []).some(h => {
        const w = typeof h.weight === "number" ? h.weight : parseFloat(String(h.weight || "0"));
        return w > 15;
      })
    ).length;

    const clientRosterSummary = input.clients.map(c =>
      `- ${c.clientName}: ${fmt(c.totalAum)} AUM, ${c.accountCount} acct(s), ${c.segment || "unassigned"}, last contact: ${c.lastContact || "unknown"}, pending tasks: ${c.pendingTasks}`
    ).join("\n");

    const topClientsByAum = sortedByAum.slice(0, 10).map((c, i) =>
      `${i + 1}. ${c.clientName}: ${fmt(c.totalAum)} (${((c.totalAum / input.totalBookAum) * 100).toFixed(1)}% of book)`
    ).join("\n");

    const context: Record<string, string> = {
      advisorName: input.advisorName || "Advisor",
      totalClientCount: String(input.totalClientCount),
      totalBookAum: fmt(input.totalBookAum),
      clientRosterSummary: sanitizeForPrompt(clientRosterSummary, 6000),
      topClientsByAum,
      staleContactCount: String(staleContactCount),
      highPendingTaskCount: String(highPendingTaskCount),
      concentratedCount: String(concentratedCount),
    };

    const userPrompt = V33_CLIENT_INSIGHTS_DASHBOARD_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? context[key] : "";
    });

    const raw = await chatCompletion(V33_CLIENT_INSIGHTS_DASHBOARD_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackClientInsightsDashboard(input);

    return {
      advisorNarrative: parsed.advisorNarrative || fallback.advisorNarrative,
      clientSummary: parsed.clientSummary || fallback.clientSummary,
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      bookHealthScore: Math.max(0, Math.min(100, Number(parsed.bookHealthScore) || fallback.bookHealthScore)),
      bookHealthLabel: parsed.bookHealthLabel || fallback.bookHealthLabel,
      concentrationRisk: parsed.concentrationRisk || fallback.concentrationRisk,
      proactiveAlerts: Array.isArray(parsed.proactiveAlerts) ? parsed.proactiveAlerts : fallback.proactiveAlerts,
      opportunityPipeline: Array.isArray(parsed.opportunityPipeline) ? parsed.opportunityPipeline : fallback.opportunityPipeline,
      performanceMetrics: Array.isArray(parsed.performanceMetrics) ? parsed.performanceMetrics : fallback.performanceMetrics,
      segmentAnalysis: parsed.segmentAnalysis || fallback.segmentAnalysis,
      complianceDocumentation: parsed.complianceDocumentation || fallback.complianceDocumentation,
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : fallback.keyMetrics,
      evidenceCitations: Array.isArray(parsed.evidenceCitations) ? parsed.evidenceCitations : fallback.evidenceCitations,
    };
  } catch (error) {
    logger.error({ err: error }, "Client insights dashboard generation error");
    return generateFallbackClientInsightsDashboard(input);
  }
}
