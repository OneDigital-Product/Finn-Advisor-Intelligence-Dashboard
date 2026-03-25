import type { Express } from "express";
import { z } from "zod";
import { getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { validateBody } from "../lib/validation";
import { sanitizePromptInput } from "../lib/prompt-sanitizer";
import {
  extractActionItems,
  generateFollowUpEmail,
  generateTalkingPointsWithMeta,
  generateClientInsightWithMeta,
  answerNaturalLanguageQueryWithMeta,
  sanitizeObjectStrings,
  chatCompletion,
  isAIAvailable,
  generateDirectIndexingAnalysis,
  generateRetirementAnalysis,
  generateWithdrawalAnalysis,
  generateClientInsightsDashboard,
  type PerformanceData,
} from "../openai";
import { validateAIContent } from "../engines/fiduciary-compliance";
import { logger } from "../lib/logger";

async function applyComplianceGuardrail(
  content: string,
  contentType: string,
  advisorId?: string,
  clientId?: string,
  clientRiskTolerance?: string
): Promise<{ result: string; complianceStatus: { outcome: string; warnings: number; blocks: number } }> {
  let validation;
  try {
    validation = await validateAIContent(content, contentType, {
      advisorId,
      clientId,
      clientRiskTolerance,
    });
  } catch (err) {
    logger.error({ err }, "Compliance guardrail validation error — blocking content for safety");
    return {
      result: "⚠️ Content validation failed. This content has been held pending compliance review. Please try again or contact your compliance officer.",
      complianceStatus: { outcome: "blocked", warnings: 0, blocks: 1 },
    };
  }

  try {
    await storage.createFiduciaryValidationLog({
      advisorId: advisorId || null,
      clientId: clientId || null,
      contentType,
      outcome: validation.outcome,
      ruleSetVersion: validation.ruleSetVersion,
      matchCount: validation.matches.length,
      warningCount: validation.warnings.length,
      blockCount: validation.blocks.length,
      matches: validation.matches as any,
      contentPreview: content.substring(0, 500),
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
    });
  } catch (logErr) {
    logger.error({ err: logErr }, "Failed to log fiduciary validation — validation result still enforced");
  }

  const outputContent = validation.outcome === "blocked"
    ? validation.annotatedContent + "\n\n> **This content has been held for compliance review.** A compliance officer must review and approve before delivery."
    : validation.outcome === "flagged"
      ? validation.annotatedContent
      : content;

  return {
    result: outputContent,
    complianceStatus: {
      outcome: validation.outcome,
      warnings: validation.warnings.length,
      blocks: validation.blocks.length,
    },
  };
}

const actionItemsSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  clientName: z.string().optional(),
});

const followUpEmailSchema = z.object({
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  meetingNotes: z.string().optional(),
});

const clientIdBodySchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
});

const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
});

const directIndexingAnalysisSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  totalUnrealizedLoss: z.number(),
  totalUnrealizedGain: z.number(),
  taxLotCount: z.number(),
  harvestableCount: z.number(),
  totalHarvestableSavings: z.number(),
  washSaleTickersCount: z.number(),
  washSaleTickers: z.array(z.string()).optional(),
  topHarvestable: z.array(z.object({
    ticker: z.string(),
    unrealizedLoss: z.number(),
    potentialTaxSavings: z.number(),
    washSaleRisk: z.boolean(),
    replacementTicker: z.string().optional(),
    holdingPeriod: z.string(),
  })).optional(),
  portfolioCount: z.number().optional(),
  taxAlpha: z.number().optional(),
});

const retirementAnalysisSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  scenarioName: z.string(),
  currentAge: z.number(),
  retirementAge: z.number(),
  lifeExpectancy: z.number(),
  annualSpending: z.number(),
  expectedReturn: z.number(),
  returnStdDev: z.number(),
  inflationRate: z.number(),
  portfolioValue: z.number(),
  successRate: z.number(),
  medianFinalBalance: z.number(),
  p10FinalBalance: z.number(),
  p90FinalBalance: z.number(),
  medianDepletionAge: z.number().nullable().optional(),
  events: z.array(z.object({
    name: z.string(),
    type: z.string(),
    amount: z.number(),
    startAge: z.number(),
    endAge: z.number().nullable().optional(),
  })).optional(),
});

const withdrawalAnalysisSchema = z.object({
  clientName: z.string().min(1),
  clientId: z.string().optional(),
  accountType: z.string(),
  accountNumber: z.string(),
  withdrawalAmount: z.number(),
  accountBalance: z.number().optional(),
  method: z.string(),
  reason: z.string(),
  frequency: z.string(),
  taxWithholding: z.string().nullable().optional(),
  clientAge: z.number().optional(),
  retirementAge: z.number().optional(),
  lifeExpectancy: z.number().optional(),
  filingStatus: z.string().optional(),
  socialSecurityBenefit: z.number().optional(),
  pensionIncome: z.number().optional(),
  otherIncome: z.number().optional(),
  stateOfResidence: z.string().optional(),
  expectedGrowthRate: z.number().optional(),
  inflationRate: z.number().optional(),
  projectionYears: z.number().optional(),
  qcdAmount: z.number().optional(),
  accounts: z.array(z.object({
    name: z.string(),
    type: z.enum(["roth", "taxable", "traditional_ira", "401k"]),
    balance: z.number(),
    costBasis: z.number().optional(),
    unrealizedGains: z.number().optional(),
    annualContributions: z.number().optional(),
  })).optional(),
});

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/action-items", async (req, res) => {
    try {
      const body = validateBody(actionItemsSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      const rawResult = await extractActionItems(sanitizePromptInput(body.notes), sanitizePromptInput(body.clientName || "Client"));
      const { result, complianceStatus } = await applyComplianceGuardrail(
        rawResult, "action_items", advisor?.id
      );
      res.json({ result, complianceStatus });
    } catch (err) {
      logger.error({ err }, "[AI] action-items failed");
      res.status(500).json({ message: "AI service error" });
    }
  });

  app.post("/api/ai/follow-up-email", async (req, res) => {
    try {
      const body = validateBody(followUpEmailSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      const rawResult = await generateFollowUpEmail({
        clientName: sanitizePromptInput(body.clientName || "Client"),
        clientEmail: body.clientEmail || "",
        meetingNotes: sanitizePromptInput(body.meetingNotes || ""),
        advisorName: advisor?.name || "Your Advisor",
      });
      const { result, complianceStatus } = await applyComplianceGuardrail(
        rawResult, "follow_up_email", advisor?.id
      );
      res.json({ result, complianceStatus });
    } catch (err) {
      logger.error({ err }, "[AI] follow-up-email failed");
      res.status(500).json({ message: "AI service error" });
    }
  });

  app.post("/api/ai/talking-points", async (req, res) => {
    try {
      const body = validateBody(clientIdBodySchema, req, res);
      if (!body) return;

      const client = await storage.getClient(body.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const advisor = await getSessionAdvisor(req);
      const hlds = await storage.getHoldingsByClient(client.id);
      const meta = await generateTalkingPointsWithMeta({
        clientName: sanitizePromptInput(`${client.firstName} ${client.lastName}`),
        clientInfo: sanitizeObjectStrings(client as Record<string, unknown>) as typeof client,
        holdings: hlds,
      });
      const { result, complianceStatus } = await applyComplianceGuardrail(
        meta.output, "talking_points", advisor?.id, client.id, client.riskTolerance || undefined
      );
      res.json({
        result,
        complianceStatus,
        guardrailFlagged: meta.guardrailFlagged,
        guardrailViolations: meta.guardrailViolations,
      });
    } catch (err) {
      logger.error({ err }, "[AI] talking-points failed");
      res.status(500).json({ message: "AI service error" });
    }
  });

  app.post("/api/ai/insight", async (req, res) => {
    try {
      const body = validateBody(clientIdBodySchema, req, res);
      if (!body) return;

      const client = await storage.getClient(body.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const advisor = await getSessionAdvisor(req);
      const [hlds, acts, tsks] = await Promise.all([
        storage.getHoldingsByClient(client.id),
        storage.getActivitiesByClient(client.id),
        storage.getTasksByClient(client.id),
      ]);

      let perf: PerformanceData[] = [];
      const accts = await storage.getAccountsByClient(client.id);
      if (accts.length > 0 && accts[0].householdId) {
        perf = await storage.getPerformanceByHousehold(accts[0].householdId);
      }

      const meta = await generateClientInsightWithMeta({
        clientName: sanitizePromptInput(`${client.firstName} ${client.lastName}`),
        clientInfo: sanitizeObjectStrings(client as Record<string, unknown>) as typeof client,
        holdings: hlds,
        performance: perf,
        activities: acts,
        tasks: tsks,
      });
      const { result, complianceStatus } = await applyComplianceGuardrail(
        meta.output, "client_insight", advisor?.id, client.id, client.riskTolerance || undefined
      );
      res.json({
        result,
        complianceStatus,
        guardrailFlagged: meta.guardrailFlagged,
        guardrailViolations: meta.guardrailViolations,
      });
    } catch (err) {
      logger.error({ err }, "[AI] insight failed");
      res.status(500).json({ message: "AI service error" });
    }
  });

  app.post("/api/ai/query", async (req, res) => {
    try {
      const body = validateBody(querySchema, req, res);
      if (!body) return;

      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const [allClients, allHouseholds] = await Promise.all([
        storage.getClients(advisor.id),
        storage.getHouseholds(advisor.id),
      ]);

      const clientSummaries = await Promise.all(
        allClients.map(async (c) => {
          const accts = await storage.getAccountsByClient(c.id);
          const totalAum = accts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
          return sanitizeObjectStrings({
            name: `${c.firstName} ${c.lastName}`,
            segment: c.segment || '',
            totalAum,
            lastContact: c.lastContactDate,
            nextReview: c.nextReviewDate,
            status: c.status || '',
          });
        })
      );

      const sanitizedHouseholds = sanitizeObjectStrings(allHouseholds);
      const context = JSON.stringify({ clients: clientSummaries, households: sanitizedHouseholds, totalClients: allClients.length });
      const meta = await answerNaturalLanguageQueryWithMeta(sanitizePromptInput(body.query), context);
      const { result, complianceStatus } = await applyComplianceGuardrail(
        meta.output, "natural_language_query", advisor?.id
      );
      res.json({
        result,
        complianceStatus,
        guardrailFlagged: meta.guardrailFlagged,
        guardrailViolations: meta.guardrailViolations,
      });
    } catch (err) {
      logger.error({ err }, "[AI] query failed");
      res.status(500).json({ message: "AI service error" });
    }
  });

  app.post("/api/ai/direct-indexing-analysis", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const body = validateBody(directIndexingAnalysisSchema, req, res);
      if (!body) return;

      const result = await generateDirectIndexingAnalysis({
        clientId: body.clientId,
        clientName: body.clientName,
        totalUnrealizedLoss: body.totalUnrealizedLoss,
        totalUnrealizedGain: body.totalUnrealizedGain,
        taxLotCount: body.taxLotCount,
        harvestableCount: body.harvestableCount,
        totalHarvestableSavings: body.totalHarvestableSavings,
        washSaleTickersCount: body.washSaleTickersCount,
        washSaleTickers: body.washSaleTickers,
        topHarvestable: body.topHarvestable,
        portfolioCount: body.portfolioCount,
        taxAlpha: body.taxAlpha,
      });

      const { result: guardedNarrative, complianceStatus } = await applyComplianceGuardrail(
        result.advisorNarrative || "", "direct_indexing_analysis", advisor.id, body.clientId
      );
      if (complianceStatus.outcome === "blocked") {
        result.advisorNarrative = guardedNarrative;
        result.clientSummary = "Content held for compliance review.";
      } else if (complianceStatus.outcome === "flagged") {
        result.advisorNarrative = guardedNarrative;
      }
      res.json({ ...result, complianceStatus });
    } catch (err) {
      logger.error({ err }, "Direct indexing analysis failed");
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/ai/retirement-analysis", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const body = validateBody(retirementAnalysisSchema, req, res);
      if (!body) return;

      const result = await generateRetirementAnalysis({
        clientId: body.clientId,
        clientName: body.clientName,
        scenarioName: body.scenarioName,
        currentAge: body.currentAge,
        retirementAge: body.retirementAge,
        lifeExpectancy: body.lifeExpectancy,
        portfolioValue: body.portfolioValue,
        annualSpending: body.annualSpending,
        expectedReturn: body.expectedReturn,
        inflationRate: body.inflationRate,
        successRate: body.successRate,
        medianFinalBalance: body.medianFinalBalance,
        p10FinalBalance: body.p10FinalBalance,
        p90FinalBalance: body.p90FinalBalance,
        medianDepletionAge: body.medianDepletionAge,
        events: body.events,
      });

      const { result: guardedNarrative, complianceStatus } = await applyComplianceGuardrail(
        result.advisorNarrative || "", "retirement_analysis", advisor.id, body.clientId
      );
      if (complianceStatus.outcome === "blocked") {
        result.advisorNarrative = guardedNarrative;
        result.clientSummary = "Content held for compliance review.";
      } else if (complianceStatus.outcome === "flagged") {
        result.advisorNarrative = guardedNarrative;
      }
      res.json({ ...result, complianceStatus });
    } catch (err) {
      logger.error({ err }, "Retirement analysis failed");
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/ai/withdrawal-analysis", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const body = validateBody(withdrawalAnalysisSchema, req, res);
      if (!body) return;

      let accounts: Array<{ name: string; type: "roth" | "taxable" | "traditional_ira" | "401k"; balance: number; costBasis?: number; unrealizedGains?: number; annualContributions?: number }>;
      if (body.accounts && body.accounts.length > 0) {
        accounts = body.accounts;
      } else {
        const accountType = body.accountType?.toLowerCase() || "";
        const isRoth = /roth/i.test(accountType);
        const isRetirement = /ira|401k|403b|roth|retirement|sep/i.test(accountType);
        const mappedType = isRoth ? "roth" as const : isRetirement ? "traditional_ira" as const : "taxable" as const;
        accounts = [{
          name: body.accountNumber || "Primary Account",
          type: mappedType,
          balance: body.accountBalance || 0,
        }];
      }

      const filingStatusVal = body.filingStatus === "single" ? "single" as const : "married_filing_jointly" as const;

      const result = await generateWithdrawalAnalysis({
        currentAge: body.clientAge || 65,
        retirementAge: body.retirementAge || 65,
        lifeExpectancy: body.lifeExpectancy || 90,
        filingStatus: filingStatusVal,
        annualSpendingNeed: body.frequency === "one_time" ? body.withdrawalAmount : body.withdrawalAmount * 12,
        socialSecurityBenefit: body.socialSecurityBenefit || 0,
        pensionIncome: body.pensionIncome || 0,
        otherIncome: body.otherIncome || 0,
        accounts,
        stateOfResidence: body.stateOfResidence || "Unknown",
        expectedGrowthRate: body.expectedGrowthRate || 0.06,
        inflationRate: body.inflationRate || 0.025,
        projectionYears: body.projectionYears || 25,
        qcdAmount: body.qcdAmount,
        clientId: body.clientId,
      });

      const { result: guardedNarrative, complianceStatus } = await applyComplianceGuardrail(
        result.advisorNarrative || "", "withdrawal_analysis", advisor.id
      );
      if (complianceStatus.outcome === "blocked") {
        result.advisorNarrative = guardedNarrative;
        result.clientSummary = "Content held for compliance review.";
      } else if (complianceStatus.outcome === "flagged") {
        result.advisorNarrative = guardedNarrative;
      }
      res.json({ ...result, complianceStatus });
    } catch (err) {
      logger.error({ err }, "Withdrawal analysis failed");
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/ai/insights-dashboard", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const allClients = await storage.getClients(advisor.id);
      if (allClients.length === 0) {
        return res.json({
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
            concentrationRisk: { totalAum: 0, totalClients: 0, hhi: 0, concentrationLevel: "LOW", top5AumPercent: 0, top10AumPercent: 0, top20AumPercent: 0, singleClientMaxPercent: 0, keyPersonRiskClients: [], tierBreakdown: [], mitigationRecommendations: [] },
            segmentAnalysis: { byLifeStage: [], byGrowth: [], retentionRisk: { atRiskCount: 0, atRiskAum: 0, retentionActions: [] } },
            complianceDocumentation: { fiduciaryStatement: "N/A", dataPrivacyNote: "N/A", riskDisclosures: [], reviewTimestamp: new Date().toISOString() },
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

          const totalAum = accts.reduce((sum, a) => sum + parseFloat(String(a.balance || "0")), 0);
          const topHoldings = hlds.slice(0, 10).map(h => ({
            ticker: h.ticker,
            name: h.name,
            marketValue: typeof h.marketValue === "number" ? h.marketValue : parseFloat(String(h.marketValue || "0")),
            weight: typeof h.weight === "number" ? h.weight : parseFloat(String(h.weight || "0")),
            sector: h.sector,
            unrealizedGainLoss: typeof h.unrealizedGainLoss === "number" ? h.unrealizedGainLoss : parseFloat(String(h.unrealizedGainLoss || "0")),
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
            accountTypes: accts.map(a => a.accountType),
            riskTolerance: client.riskTolerance || undefined,
            segment: client.segment || undefined,
            topHoldings,
            performance: perf.map(p => ({
              period: p.period || "unknown",
              returnPercent: p.returnPct ? parseFloat(p.returnPct) : null,
              benchmarkPercent: p.benchmarkPct ? parseFloat(p.benchmarkPct) : null,
            })),
            recentActivities: acts.slice(0, 5).map(a => `${a.type}: ${a.subject}`),
            pendingTasks: tsks.filter(t => t.status !== "completed").length,
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
        ...(result.proactiveAlerts || []).map((a) => `${a.title}: ${a.description}`),
      ].join("\n");
      const { result: guardedContent, complianceStatus } = await applyComplianceGuardrail(
        complianceContent, "ai_insights_dashboard", advisor.id
      );
      if (complianceStatus.outcome === "blocked") {
        result.executiveSummary = guardedContent;
        result.advisorNarrative = guardedContent;
        result.clientSummary = "Content held for compliance review.";
      } else if (complianceStatus.outcome === "flagged") {
        result.advisorNarrative = guardedContent;
      }

      const statusToTrend = (s: string) => s === "positive" ? "up" : s === "negative" ? "down" : "stable";

      const legacyResponse = {
        executiveSummary: result.executiveSummary,
        healthScore: result.bookHealthScore,
        healthScoreLabel: result.bookHealthLabel,
        portfolioInsights: (result.performanceMetrics || []).map(m => ({
          title: m.metricName,
          description: m.assessment,
          type: m.trend === "UP" ? "positive" : m.trend === "DOWN" ? "warning" : "info",
          metric: m.currentValue,
        })),
        marketTrends: (result.proactiveAlerts || []).filter(a => a.category === "PORTFOLIO_DRIFT").map(a => ({
          title: a.title,
          description: a.description,
          impact: a.priority === "HIGH" ? "negative" : a.priority === "MEDIUM" ? "neutral" : "positive",
          relevantHoldings: [] as string[],
        })),
        recommendations: (result.opportunityPipeline || []).map(o => ({
          title: o.title,
          description: o.description,
          priority: o.priority <= 1 ? "high" : o.priority <= 3 ? "medium" : "low",
          category: o.opportunityType.replace(/_/g, " ").toLowerCase(),
          estimatedValue: o.estimatedRevenue > 0 ? `$${o.estimatedRevenue.toLocaleString()}` : undefined,
        })),
        riskIndicators: (result.proactiveAlerts || []).filter(a => a.priority === "HIGH" || a.priority === "MEDIUM").slice(0, 5).map(a => ({
          title: a.title,
          severity: a.priority.toLowerCase(),
          description: a.description,
          action: a.actionRequired,
        })),
        keyMetrics: (result.keyMetrics || []).map(m => ({
          label: m.label,
          value: m.value,
          trend: statusToTrend(m.status),
          context: m.context,
        })),
        nextSteps: (result.proactiveAlerts || []).filter(a => a.priority === "HIGH").slice(0, 5).map(a => a.actionRequired),
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

      res.json(legacyResponse);
    } catch (err) {
      logger.error({ err }, "AI insights dashboard generation failed");
      res.status(500).json({ error: "Failed to generate insights dashboard" });
    }
  });
}
