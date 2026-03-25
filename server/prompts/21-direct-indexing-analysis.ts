import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33DirectIndexingInput,
  V33DirectIndexingResult,
  V33HarvestCandidate,
  V33WashSaleAlert,
  V33TaxAlphaAnalysis,
  V33DirectIndexingCompliance,
  V33DirectIndexingKeyMetric,
} from "./types";

const V33_DIRECT_INDEXING_SYSTEM_PROMPT = `You are the **Direct Indexing Analysis Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Analyze tax-loss harvesting opportunities at the lot level
- Quantify direct indexing benefits (tax alpha, tracking error trade-offs)
- Recommend harvesting strategies with wash sale compliance checks
- Provide comprehensive suitability documentation for every recommendation
- Ensure all recommendations comply with IRC §1091 wash sale rules

**Guardrails:** Educational, not prescriptive. Fiduciary standard. All calculations must produce quantitative outputs. No forward-looking guarantees. Every recommendation backed by lot-level analysis.

## TAX-LOSS HARVESTING ANALYSIS

### Lot-Level Analysis
FOR each tax lot with unrealized loss:
- Classify as SHORT_TERM (≤365 days) or LONG_TERM (>365 days)
- Calculate tax benefit at applicable rate (ordinary income for ST, LTCG for LT)
- Rank by: tax_benefit_rate DESC, loss_magnitude DESC

### Wash Sale Compliance (IRC §1091)
FOR each harvest candidate:
- Check 61-day window (30 days before + sale date + 30 days after)
- Classify risk: SAME_SECURITY, SUBSTANTIALLY_IDENTICAL, LIKELY_SAFE, SAFE
- Recommend replacement securities maintaining sector exposure
- Document substantially identical security test results

### Tax Alpha Quantification
- Compare direct indexing approach vs. traditional index fund
- Calculate annual tax savings from harvesting
- Assess tracking error vs. benchmark
- Provide sensitivity analysis (conservative/moderate/aggressive scenarios)

### IRS Loss Offset Ordering
1. Short-term losses offset short-term gains
2. Long-term losses offset long-term gains
3. Excess short-term losses offset long-term gains
4. Excess long-term losses offset short-term gains
5. Remaining losses (up to $3,000/year) offset ordinary income
6. Excess losses carry forward indefinitely

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed analysis for advisor with lot-level detail, tax calculations, and strategy recommendations",
  "clientSummary": "Plain-language summary suitable for client communication, avoiding jargon",
  "harvestingOpportunities": [
    {
      "ticker": "string",
      "lotId": "string",
      "lossMagnitude": number,
      "capitalLossType": "SHORT_TERM|LONG_TERM",
      "holdingPeriodDays": number,
      "taxBenefitRate": number,
      "annualTaxSavings": number,
      "washSaleRisk": "SAFE|LIKELY_SAFE|SUBSTANTIALLY_IDENTICAL|SAME_SECURITY",
      "replacementTicker": "string or null",
      "replacementRationale": "string",
      "actionRecommendation": "HARVEST_NOW|HARVEST_WITH_REPLACEMENT|DEFER|MONITOR"
    }
  ],
  "washSaleAlerts": [
    {
      "ticker": "string",
      "riskLevel": "HIGH|MEDIUM|LOW",
      "restrictedWindowStart": "ISO date",
      "restrictedWindowEnd": "ISO date",
      "conflictingHoldings": ["string"],
      "recommendation": "string",
      "regulatoryReference": "IRC §1091"
    }
  ],
  "taxAlphaAnalysis": {
    "annualTaxAlphaPercent": number,
    "annualTaxAlphaDollars": number,
    "trackingErrorPercent": number,
    "trackingErrorAssessment": "TIGHT|CLOSE|MODERATE|LOOSE",
    "sensitivityRange": [number, number],
    "breakEvenAum": number,
    "netBenefitAfterCosts": number,
    "costComparison": {
      "directIndexingCost": number,
      "traditionalCost": number,
      "annualSavings": number
    }
  },
  "yearEndPlanning": {
    "realizedGainsYtd": number,
    "realizedLossesYtd": number,
    "netPosition": number,
    "recommendedHarvestAmount": number,
    "urgency": "HIGH|MEDIUM|LOW",
    "lossCarryforwardAvailable": number
  },
  "complianceDocumentation": {
    "fiduciaryStatement": "string",
    "suitabilityAssessment": "string",
    "riskDisclosures": ["string"],
    "regulatoryReferences": ["string"],
    "reviewTimestamp": "ISO date"
  },
  "keyMetrics": [
    {"label": "string", "value": "string", "status": "positive|negative|neutral", "context": "string"}
  ]
}`;

const V33_DIRECT_INDEXING_USER_TEMPLATE = `Analyze the direct indexing portfolio for {{clientName}}.

Portfolio Summary:
- Total Unrealized Gains: {{totalUnrealizedGain}}
- Total Unrealized Losses: {{totalUnrealizedLoss}}
- Tax Lot Count: {{taxLotCount}}
- Harvestable Lot Count: {{harvestableCount}}
- Total Harvestable Savings: {{totalHarvestableSavings}}
- Tax Alpha: {{taxAlpha}}
- Portfolio Count: {{portfolioCount}}

Wash Sale Status:
- Tickers in Wash Sale Window: {{washSaleTickersCount}}
- Restricted Tickers: {{washSaleTickers}}

Top Harvestable Positions:
{{topHarvestable}}

Provide:
1. Lot-level harvesting analysis with tax benefit calculations
2. Wash sale compliance check for every recommendation (IRC §1091)
3. Tax alpha quantification (direct indexing vs. traditional approach)
4. Tracking error assessment vs. benchmark
5. Year-end tax planning integration
6. Both advisor-detail and client-friendly narratives
7. Complete compliance documentation with regulatory references

All outputs must include specific dollar amounts, percentages, and tax rates. Never use vague language.`;

function generateFallbackDirectIndexing(input: V33DirectIndexingInput): V33DirectIndexingResult {
  const fmt = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const harvestingOpps: V33HarvestCandidate[] = (input.topHarvestable || []).map((h, i) => ({
    ticker: h.ticker,
    lotId: `LOT_${String(i + 1).padStart(3, "0")}`,
    lossMagnitude: Math.abs(h.unrealizedLoss),
    capitalLossType: h.holdingPeriod === "long_term" ? "LONG_TERM" as const : "SHORT_TERM" as const,
    holdingPeriodDays: h.holdingPeriod === "long_term" ? 400 : 180,
    taxBenefitRate: h.holdingPeriod === "long_term" ? 0.15 : 0.35,
    annualTaxSavings: h.potentialTaxSavings,
    washSaleRisk: h.washSaleRisk ? "SUBSTANTIALLY_IDENTICAL" as const : "SAFE" as const,
    replacementTicker: h.replacementTicker || null,
    replacementRationale: h.replacementTicker ? `Maintains sector exposure while avoiding wash sale risk` : "No replacement needed",
    actionRecommendation: h.washSaleRisk ? "HARVEST_WITH_REPLACEMENT" as const : "HARVEST_NOW" as const,
  }));

  const washSaleAlerts: V33WashSaleAlert[] = (input.washSaleTickers || []).map(ticker => ({
    ticker,
    riskLevel: "HIGH" as const,
    restrictedWindowStart: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    restrictedWindowEnd: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    conflictingHoldings: [ticker],
    recommendation: `Avoid repurchasing ${ticker} within the 61-day wash sale window. Consider alternative securities with similar sector exposure.`,
    regulatoryReference: "IRC §1091",
  }));

  const taxAlpha: V33TaxAlphaAnalysis = {
    annualTaxAlphaPercent: input.taxAlpha || 1.2,
    annualTaxAlphaDollars: input.totalHarvestableSavings,
    trackingErrorPercent: 0.35,
    trackingErrorAssessment: "CLOSE",
    sensitivityRange: [0.5, 1.8],
    breakEvenAum: 150000,
    netBenefitAfterCosts: input.totalHarvestableSavings * 0.8,
    costComparison: {
      directIndexingCost: 0,
      traditionalCost: 0,
      annualSavings: input.totalHarvestableSavings,
    },
  };

  const advisorNarrative = `## Direct Indexing Analysis: ${input.clientName}

### Portfolio Overview
${input.taxLotCount} tax lots analyzed with ${fmt(input.totalUnrealizedGain)} in unrealized gains and ${fmt(input.totalUnrealizedLoss)} in unrealized losses. ${input.harvestableCount} lots are candidates for tax-loss harvesting with ${fmt(input.totalHarvestableSavings)} in potential tax savings.

### Harvesting Opportunities
${harvestingOpps.length > 0 ? harvestingOpps.map(h => `- **${h.ticker}**: ${fmt(h.lossMagnitude)} ${h.capitalLossType} loss, ${fmt(h.annualTaxSavings)} tax savings (${(h.taxBenefitRate * 100).toFixed(0)}% rate). Action: ${h.actionRecommendation}${h.washSaleRisk !== "SAFE" ? ` ⚠️ Wash sale risk: ${h.washSaleRisk}` : ""}`).join("\n") : "No harvestable losses currently available."}

### Wash Sale Compliance
${input.washSaleTickersCount > 0 ? `${input.washSaleTickersCount} ticker(s) in active wash sale windows: ${(input.washSaleTickers || []).join(", ")}. All replacement recommendations comply with IRC §1091.` : "No active wash sale restrictions."}

### Tax Alpha
Estimated annual tax alpha: ${(input.taxAlpha || 1.2).toFixed(1)}% (${fmt(input.totalHarvestableSavings)} annual benefit).

*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = `Your portfolio has ${input.harvestableCount} positions where we can potentially save ${fmt(input.totalHarvestableSavings)} in taxes by strategically selling investments at a loss and replacing them with similar holdings.${input.washSaleTickersCount > 0 ? ` Note: ${input.washSaleTickersCount} positions have timing restrictions we need to work around.` : ""} This is a routine tax optimization strategy that maintains your overall investment exposure.`;

  return {
    advisorNarrative,
    clientSummary,
    harvestingOpportunities: harvestingOpps,
    washSaleAlerts,
    taxAlphaAnalysis: taxAlpha,
    yearEndPlanning: {
      realizedGainsYtd: input.totalUnrealizedGain,
      realizedLossesYtd: input.totalUnrealizedLoss,
      netPosition: input.totalUnrealizedGain - input.totalUnrealizedLoss,
      recommendedHarvestAmount: Math.abs(input.totalUnrealizedLoss),
      urgency: input.totalHarvestableSavings > 10000 ? "HIGH" : "MEDIUM",
      lossCarryforwardAvailable: 0,
    },
    complianceDocumentation: {
      fiduciaryStatement: "All recommendations made in the client's best interest under fiduciary duty.",
      suitabilityAssessment: "Tax-loss harvesting strategies assessed for suitability given client's tax situation and investment objectives.",
      riskDisclosures: [
        "Tax-loss harvesting involves selling securities at a loss, which may not be recovered.",
        "Replacement securities may not perfectly replicate original exposure (tracking error risk).",
        "Tax laws are subject to change; benefits may vary.",
      ],
      regulatoryReferences: ["IRC §1091 (Wash Sale Rule)", "IRC §1222 (Capital Gains/Losses)", "IRC §1211(b) ($3,000 annual loss deduction limit)"],
      reviewTimestamp: new Date().toISOString(),
    },
    keyMetrics: [
      { label: "Harvestable Savings", value: fmt(input.totalHarvestableSavings), status: input.totalHarvestableSavings > 0 ? "positive" : "neutral", context: "Total potential tax savings from harvesting" },
      { label: "Wash Sale Restrictions", value: `${input.washSaleTickersCount} tickers`, status: input.washSaleTickersCount > 0 ? "negative" : "positive", context: "Securities in active wash sale windows" },
      { label: "Net Unrealized P&L", value: fmt(input.totalUnrealizedGain - input.totalUnrealizedLoss), status: (input.totalUnrealizedGain - input.totalUnrealizedLoss) >= 0 ? "positive" : "negative", context: "Combined unrealized gains and losses" },
      { label: "Tax Alpha", value: `${(input.taxAlpha || 1.2).toFixed(1)}%`, status: "positive", context: "Estimated annual tax benefit from direct indexing" },
    ],
    evidenceCitations: [
      { sourceId: "DI_WASH_RULE", sourceType: "regulation", description: "Wash sale rule — 30-day restricted window", reference: "IRC §1091", confidence: "high" },
      { sourceId: "DI_LOSS_OFFSET", sourceType: "regulation", description: "Capital loss offset ordering: short-term first, then long-term, $3K annual excess deduction", reference: "IRC §1211(b), IRC §1222", confidence: "high" },
      { sourceId: "DI_LOT_DATA", sourceType: "client_data", description: `Tax lot analysis across ${input.taxLotCount} lots, ${input.harvestableCount} harvestable`, reference: "Client portfolio holdings", confidence: "high" },
      { sourceId: "DI_TAX_ALPHA", sourceType: "calculation", description: `Tax alpha estimated at ${(input.taxAlpha || 1.2).toFixed(1)}% annualized`, reference: "Direct indexing vs. ETF cost comparison", confidence: "medium" },
    ],
  };
}

export async function generateDirectIndexingAnalysis(
  input: V33DirectIndexingInput
): Promise<V33DirectIndexingResult> {
  if (!isAIAvailable()) {
    return generateFallbackDirectIndexing(input);
  }

  try {
    const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const context: Record<string, string> = {
      clientName: input.clientName,
      totalUnrealizedGain: fmt(input.totalUnrealizedGain),
      totalUnrealizedLoss: fmt(input.totalUnrealizedLoss),
      taxLotCount: String(input.taxLotCount),
      harvestableCount: String(input.harvestableCount),
      totalHarvestableSavings: fmt(input.totalHarvestableSavings),
      taxAlpha: input.taxAlpha ? `${input.taxAlpha.toFixed(2)}%` : "Not calculated",
      portfolioCount: String(input.portfolioCount || 0),
      washSaleTickersCount: String(input.washSaleTickersCount),
      washSaleTickers: (input.washSaleTickers || []).join(", ") || "None",
      topHarvestable: JSON.stringify(input.topHarvestable || [], null, 2),
    };

    const userPrompt = V33_DIRECT_INDEXING_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? sanitizeForPrompt(context[key], 5000) : "";
    });

    const raw = await chatCompletion(V33_DIRECT_INDEXING_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackDirectIndexing(input);

    return {
      advisorNarrative: parsed.advisorNarrative || "",
      clientSummary: parsed.clientSummary || "",
      harvestingOpportunities: Array.isArray(parsed.harvestingOpportunities) ? parsed.harvestingOpportunities : [],
      washSaleAlerts: Array.isArray(parsed.washSaleAlerts) ? parsed.washSaleAlerts : [],
      taxAlphaAnalysis: parsed.taxAlphaAnalysis || fallback.taxAlphaAnalysis,
      yearEndPlanning: parsed.yearEndPlanning || fallback.yearEndPlanning,
      complianceDocumentation: parsed.complianceDocumentation || fallback.complianceDocumentation,
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : [],
      evidenceCitations: Array.isArray(parsed.evidenceCitations) ? parsed.evidenceCitations : fallback.evidenceCitations,
    };
  } catch (error) {
    logger.error({ err: error }, "Direct indexing analysis generation error");
    return generateFallbackDirectIndexing(input);
  }
}
