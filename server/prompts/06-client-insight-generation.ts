import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33ClientInsightInput,
  V33ClientInsightResult,
  V33InsightItem,
} from "./types";

const V33_CLIENT_INSIGHT_SYSTEM_PROMPT = `You are the **Client Insight Generation Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Scan across 9 planning domains to identify ranked, evidence-backed insights for a specific client
- Classify insights into 4 tiers by urgency and dollar impact
- Provide quantitative impact scoring for every insight
- Assess behavioral engagement patterns and recommend advisor tone
- Generate a prioritized action checklist

**Guardrails:** Fiduciary standard. Evidence-based reasoning only. No protected-class inference. All impacts quantified where possible. Conservative estimates preferred.

## 9 PLANNING DOMAINS TO SCAN

1. **Investment** — Portfolio concentration, drift, rebalancing needs, asset allocation alignment with risk tolerance
2. **Tax** — Harvesting opportunities, Roth conversion windows, RMD planning, capital gains exposure
3. **Retirement** — Savings rate adequacy, projected gaps, Social Security optimization, withdrawal sequencing
4. **Estate** — Beneficiary designations, document currency, trust considerations, titling issues
5. **Insurance** — Coverage adequacy (life, disability, LTC, umbrella), premium optimization
6. **Cash Flow** — Emergency fund adequacy, debt management, savings rate, income stability
7. **Goals** — Progress tracking against stated goals, timeline risk, funding gap analysis
8. **Behavioral** — Engagement patterns, sentiment shifts, decision-making biases, communication preferences
9. **Life Stage** — Age-appropriate planning gaps, upcoming transitions, generational wealth considerations

## 4-TIER INSIGHT CLASSIFICATION

- **Tier 1 (Critical):** Immediate action required, significant dollar impact (>$50K), regulatory or compliance risk, or time-sensitive window closing within 30 days
- **Tier 2 (High):** Action recommended within 90 days, meaningful dollar impact ($10K-$50K), or emerging risk that will escalate without intervention
- **Tier 3 (Medium):** Optimization opportunity, moderate impact ($1K-$10K), or best-practice gap that should be addressed in next review cycle
- **Tier 4 (Informational):** Awareness item, educational opportunity, or positive reinforcement of sound planning

## BEHAVIORAL PROFILE ASSESSMENT

Assess client engagement based on:
- Contact frequency and recency
- Task completion rate
- Activity volume trend
- Sentiment indicators from recent interactions

Recommend advisor tone: empathetic, educational, motivational, direct, or reassuring.

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed insight analysis for advisor with evidence-backed findings across planning domains",
  "clientSummary": "Plain-language summary suitable for client-facing communication",
  "totalInsights": number,
  "tier1Count": number,
  "tier2Count": number,
  "estimatedTotalImpact": number,
  "insights": [
    {
      "insightId": "INS_001",
      "title": "string",
      "description": "string with evidence and reasoning",
      "planningDomain": "Investment|Tax|Retirement|Estate|Insurance|Cash Flow|Goals|Behavioral|Life Stage",
      "insightType": "alert|opportunity|risk|behavioral|informational",
      "tier": 1|2|3|4,
      "urgency": "critical|high|medium|low",
      "daysToAddress": number or null,
      "dollarImpact": number or null,
      "impactStatement": "string quantifying the impact",
      "confidence": number (0-1),
      "recommendedAction": "string",
      "actionOwner": "advisor|client|operations|compliance"
    }
  ],
  "behavioralProfile": {
    "engagementTrend": "increasing|stable|declining",
    "anxietyLevel": "none|moderate|elevated",
    "recommendedTone": "string"
  },
  "actionChecklist": [
    {"action": "string", "owner": "string", "timeline": "string"}
  ]
}`;

const V33_CLIENT_INSIGHT_USER_TEMPLATE = `Generate ranked, evidence-backed insights for the following client by scanning across all 9 planning domains.

Client: {{clientName}} (ID: {{clientId}})
Segment: {{segment}}
Age: {{age}}
Risk Tolerance: {{riskTolerance}}
Total AUM: {{totalAum}}
Account Count: {{accountCount}}
Last Contact: {{lastContact}}
Pending Tasks: {{pendingTasks}}

Top Holdings:
{{topHoldings}}

Recent Activities:
{{recentActivities}}

Financial Goals:
{{financialGoals}}

Provide:
1. Ranked insights across all 9 planning domains with tier classification (1-4)
2. Quantitative impact scoring for each insight
3. Behavioral profile assessment based on engagement patterns
4. Prioritized action checklist with owners and timelines
5. Dual advisor-detail and client-friendly narratives

All insights must be evidence-backed with specific numbers where data is available.`;

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function generateFallbackClientInsights(input: V33ClientInsightInput): V33ClientInsightResult {
  const insights: V33InsightItem[] = [];
  let insightIdx = 0;

  // Investment domain: check concentration
  const holdings = input.topHoldings || [];
  const concentrated = holdings.filter(h => h.weight > 15);
  if (concentrated.length > 0) {
    for (const h of concentrated) {
      insightIdx++;
      insights.push({
        insightId: `INS_${String(insightIdx).padStart(3, "0")}`,
        title: `Concentration risk: ${h.ticker} at ${h.weight.toFixed(1)}%`,
        description: `${h.ticker} (${h.name}) represents ${h.weight.toFixed(1)}% of portfolio (${fmt(h.marketValue)}), exceeding the 15% concentration threshold. This creates single-security risk that may be inappropriate for a ${input.riskTolerance || "moderate"} risk tolerance profile.`,
        planningDomain: "Investment",
        insightType: "risk",
        tier: h.weight > 25 ? 1 : 2,
        urgency: h.weight > 25 ? "critical" : "high",
        daysToAddress: h.weight > 25 ? 14 : 60,
        dollarImpact: Math.round(h.marketValue * 0.1),
        impactStatement: `A 10% decline in ${h.ticker} would reduce portfolio by ${fmt(Math.round(h.marketValue * 0.1))}`,
        confidence: 0.95,
        recommendedAction: `Review ${h.ticker} position and discuss diversification strategy with client.`,
        actionOwner: "advisor",
      });
    }
  }

  // Goals domain: check goal progress
  const goals = input.financialGoals || [];
  for (const goal of goals) {
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    const targetDate = new Date(goal.targetDate);
    const monthsRemaining = Math.max(0, Math.round((targetDate.getTime() - Date.now()) / (30 * 86400000)));
    const gap = goal.targetAmount - goal.currentAmount;

    if (progress < 50 && monthsRemaining < 60) {
      insightIdx++;
      insights.push({
        insightId: `INS_${String(insightIdx).padStart(3, "0")}`,
        title: `Goal at risk: ${goal.name} (${progress.toFixed(0)}% funded)`,
        description: `"${goal.name}" is ${progress.toFixed(0)}% funded with ${fmt(gap)} gap and only ${monthsRemaining} months remaining. Current trajectory suggests the goal may not be met without intervention.`,
        planningDomain: "Goals",
        insightType: "alert",
        tier: monthsRemaining < 24 ? 1 : 2,
        urgency: monthsRemaining < 24 ? "critical" : "high",
        daysToAddress: 30,
        dollarImpact: gap,
        impactStatement: `${fmt(gap)} funding shortfall with ${monthsRemaining} months remaining`,
        confidence: 0.85,
        recommendedAction: `Review savings rate and investment strategy for "${goal.name}" goal. Consider adjusting timeline or contribution levels.`,
        actionOwner: "advisor",
      });
    }
  }

  // Behavioral domain: last contact check
  if (input.lastContact) {
    const daysSinceContact = Math.floor((Date.now() - new Date(input.lastContact).getTime()) / 86400000);
    if (daysSinceContact > 180) {
      insightIdx++;
      insights.push({
        insightId: `INS_${String(insightIdx).padStart(3, "0")}`,
        title: `No contact in ${Math.floor(daysSinceContact / 30)} months`,
        description: `Last contact was ${input.lastContact} (${daysSinceContact} days ago). Extended gaps risk disengagement, missed planning opportunities, and potential compliance issues.`,
        planningDomain: "Behavioral",
        insightType: "behavioral",
        tier: daysSinceContact > 365 ? 1 : 2,
        urgency: daysSinceContact > 365 ? "critical" : "high",
        daysToAddress: 7,
        dollarImpact: null,
        impactStatement: `${fmt(input.totalAum)} AUM at engagement risk`,
        confidence: 0.9,
        recommendedAction: "Schedule re-engagement call or meeting immediately.",
        actionOwner: "advisor",
      });
    }
  }

  // Life Stage domain: age-based checks
  if (input.age) {
    if (input.age >= 70 && input.age < 73) {
      insightIdx++;
      insights.push({
        insightId: `INS_${String(insightIdx).padStart(3, "0")}`,
        title: "RMD planning window approaching",
        description: `Client is ${input.age} years old. Required Minimum Distributions begin at age 73. Proactive Roth conversion or withdrawal sequencing strategies should be evaluated before RMD obligations begin.`,
        planningDomain: "Life Stage",
        insightType: "opportunity",
        tier: 2,
        urgency: "high",
        daysToAddress: 180,
        dollarImpact: Math.round(input.totalAum * 0.04),
        impactStatement: `Estimated first-year RMD of approximately ${fmt(Math.round(input.totalAum * 0.04))}`,
        confidence: 0.85,
        recommendedAction: "Model Roth conversion scenarios and withdrawal sequencing before RMD obligations begin.",
        actionOwner: "advisor",
      });
    }
    if (input.age >= 60 && input.age < 67) {
      insightIdx++;
      insights.push({
        insightId: `INS_${String(insightIdx).padStart(3, "0")}`,
        title: "Social Security claiming strategy review",
        description: `Client is ${input.age} years old. Social Security claiming decisions between age 62-70 have significant lifetime income impact. Delaying benefits can increase monthly income by up to 77%.`,
        planningDomain: "Retirement",
        insightType: "opportunity",
        tier: 3,
        urgency: "medium",
        daysToAddress: 365,
        dollarImpact: null,
        impactStatement: "Optimal claiming strategy can increase lifetime benefits significantly",
        confidence: 0.8,
        recommendedAction: "Run Social Security optimization analysis comparing claiming ages 62, 67, and 70.",
        actionOwner: "advisor",
      });
    }
  }

  // Pending tasks check
  if ((input.pendingTasks ?? 0) > 3) {
    insightIdx++;
    insights.push({
      insightId: `INS_${String(insightIdx).padStart(3, "0")}`,
      title: `${input.pendingTasks} pending tasks unresolved`,
      description: `Client has ${input.pendingTasks} unresolved tasks, indicating potential stalled planning progress or advisor capacity constraints.`,
      planningDomain: "Behavioral",
      insightType: "alert",
      tier: 3,
      urgency: "medium",
      daysToAddress: 14,
      dollarImpact: null,
      impactStatement: "Stalled tasks may delay important financial planning actions",
      confidence: 0.9,
      recommendedAction: "Prioritize and resolve or close pending tasks. Follow up with client on outstanding items.",
      actionOwner: "advisor",
    });
  }

  // Sort insights by tier then urgency
  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => a.tier - b.tier || (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2));

  const tier1Count = insights.filter(i => i.tier === 1).length;
  const tier2Count = insights.filter(i => i.tier === 2).length;
  const estimatedTotalImpact = insights.reduce((sum, i) => sum + (i.dollarImpact ?? 0), 0);

  // Behavioral profile
  const daysSinceContact = input.lastContact
    ? Math.floor((Date.now() - new Date(input.lastContact).getTime()) / 86400000)
    : 999;
  const engagementTrend: "increasing" | "stable" | "declining" =
    daysSinceContact > 180 ? "declining" : daysSinceContact < 60 ? "increasing" : "stable";
  const anxietyLevel: "none" | "moderate" | "elevated" =
    tier1Count > 2 ? "elevated" : tier1Count > 0 ? "moderate" : "none";
  const recommendedTone =
    anxietyLevel === "elevated" ? "empathetic and reassuring"
    : engagementTrend === "declining" ? "warm and re-engaging"
    : "direct and informative";

  const actionChecklist = insights
    .filter(i => i.tier <= 2)
    .map(i => ({
      action: i.recommendedAction,
      owner: i.actionOwner,
      timeline: i.daysToAddress ? `Within ${i.daysToAddress} days` : "At next review",
    }));

  const advisorNarrative = `## Client Insight Analysis — ${input.clientName}

### Overview
- **Total AUM:** ${fmt(input.totalAum)} across ${input.accountCount} account(s)
- **Segment:** ${input.segment || "Unassigned"}
- **Risk Tolerance:** ${input.riskTolerance || "Not specified"}
${input.age ? `- **Age:** ${input.age}` : ""}

### Key Findings
- **Total Insights:** ${insights.length} (${tier1Count} critical, ${tier2Count} high)
- **Estimated Total Impact:** ${fmt(estimatedTotalImpact)}

${insights.slice(0, 5).map(i => `#### [Tier ${i.tier}] ${i.title}
${i.description}
- **Action:** ${i.recommendedAction}
- **Owner:** ${i.actionOwner} | **Timeline:** ${i.daysToAddress ? `${i.daysToAddress} days` : "At next review"}`).join("\n\n")}

### Behavioral Profile
- **Engagement Trend:** ${engagementTrend}
- **Anxiety Level:** ${anxietyLevel}
- **Recommended Tone:** ${recommendedTone}

*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = `We have identified ${insights.length} insight(s) for your financial plan, including ${tier1Count > 0 ? `${tier1Count} item(s) requiring prompt attention` : "no urgent items"}. ${tier2Count > 0 ? `Additionally, ${tier2Count} item(s) should be addressed in the near term.` : ""} ${estimatedTotalImpact > 0 ? `The estimated financial impact of addressing these items is ${fmt(estimatedTotalImpact)}.` : ""}`;

  return {
    advisorNarrative,
    clientSummary,
    totalInsights: insights.length,
    tier1Count,
    tier2Count,
    estimatedTotalImpact,
    insights,
    behavioralProfile: {
      engagementTrend,
      anxietyLevel,
      recommendedTone,
    },
    actionChecklist,
  };
}

export async function generateClientInsights(
  input: V33ClientInsightInput
): Promise<V33ClientInsightResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 06] AI unavailable — using deterministic fallback");
    return generateFallbackClientInsights(input);
  }

  try {
    const holdingsSummary = (input.topHoldings || [])
      .map(h => `- ${h.ticker} (${h.name}): ${fmt(h.marketValue)}, ${h.weight.toFixed(1)}% weight`)
      .join("\n") || "- No holdings data available";

    const activitiesSummary = (input.recentActivities || [])
      .map(a => `- ${a}`)
      .join("\n") || "- No recent activities";

    const goalsSummary = (input.financialGoals || [])
      .map(g => {
        const progress = g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(0) : "0";
        return `- ${g.name}: ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} (${progress}%) — target: ${g.targetDate}`;
      })
      .join("\n") || "- No financial goals on record";

    const context: Record<string, string> = {
      clientName: input.clientName,
      clientId: input.clientId,
      segment: input.segment || "Unassigned",
      age: input.age ? String(input.age) : "Not specified",
      riskTolerance: input.riskTolerance || "Not specified",
      totalAum: fmt(input.totalAum),
      accountCount: String(input.accountCount),
      lastContact: input.lastContact || "Unknown",
      pendingTasks: String(input.pendingTasks ?? 0),
      topHoldings: sanitizeForPrompt(holdingsSummary, 2000),
      recentActivities: sanitizeForPrompt(activitiesSummary, 1500),
      financialGoals: sanitizeForPrompt(goalsSummary, 1500),
    };

    const userPrompt = V33_CLIENT_INSIGHT_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? context[key] : "";
    });

    const raw = await chatCompletion(V33_CLIENT_INSIGHT_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackClientInsights(input);

    return {
      advisorNarrative: parsed.advisorNarrative || fallback.advisorNarrative,
      clientSummary: parsed.clientSummary || fallback.clientSummary,
      totalInsights: Number(parsed.totalInsights) || fallback.totalInsights,
      tier1Count: Number(parsed.tier1Count) || fallback.tier1Count,
      tier2Count: Number(parsed.tier2Count) || fallback.tier2Count,
      estimatedTotalImpact: Number(parsed.estimatedTotalImpact) || fallback.estimatedTotalImpact,
      insights: Array.isArray(parsed.insights) ? parsed.insights : fallback.insights,
      behavioralProfile: parsed.behavioralProfile || fallback.behavioralProfile,
      actionChecklist: Array.isArray(parsed.actionChecklist) ? parsed.actionChecklist : fallback.actionChecklist,
    };
  } catch (error) {
    logger.error({ err: error }, "[Agent 06] Client insight generation failed — using fallback");
    return generateFallbackClientInsights(input);
  }
}
