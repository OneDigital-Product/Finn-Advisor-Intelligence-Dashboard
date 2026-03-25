import { storage } from "../storage";
import { logger } from "../lib/logger";
import { sanitizePromptInput } from "../lib/prompt-sanitizer";
import { generateAssessment, sanitizeForPrompt } from "../openai";
import { validateAIContent } from "./fiduciary-compliance";
import type { Alert } from "@shared/schema";
import type { SimulationResults } from "../monte-carlo";

function statusFromScore(score: number): "action_needed" | "on_track" | "review" {
  if (score >= 75) return "on_track";
  if (score >= 50) return "review";
  return "action_needed";
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

interface AssessmentSettings {
  retirementAge: number;
  withdrawalRate: number;
  insuranceMultiplier: number;
  hnwThreshold: number;
}

export type PlanningDomain = "cashflow" | "investment" | "insurance" | "tax" | "retirement" | "estate" | "education";

export interface Recommendation {
  priority: "high" | "medium" | "low";
  action: string;
  rationale: string;
  estimatedImpact?: string;
  estimatedCost?: string;
}

export interface DomainAssessment {
  domain: PlanningDomain;
  status: "action_needed" | "on_track" | "review";
  score: number;
  summary: string;
  keyMetrics: Record<string, any>;
  recommendations: Recommendation[];
  generatedAt: Date;
}

export interface AssessmentResult {
  clientId: string;
  advisorId: string;
  overallScore: number;
  domains: DomainAssessment[];
  criticalActions: Recommendation[];
  summary: string;
  generatedAt: Date;
  expiresAt: Date;
}

const DOMAIN_LABELS: Record<PlanningDomain, string> = {
  cashflow: "Cash Flow & Budgeting",
  investment: "Investment & Portfolio",
  insurance: "Insurance Coverage",
  tax: "Tax Optimization",
  retirement: "Retirement Planning",
  estate: "Estate & Legacy",
  education: "Education Funding",
};

const cache = new Map<string, { result: AssessmentResult; expiresAt: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AssessmentEngine {
  async assessClient(clientId: string, advisorId: string, regenerate = false): Promise<AssessmentResult> {
    const startTime = Date.now();

    if (!regenerate) {
      const cached = cache.get(clientId);
      if (cached && cached.expiresAt > Date.now()) {
        logger.info("Operation completed");
        return cached.result;
      }
    }

    const client = await storage.getClient(clientId);
    if (!client) throw new Error("Client not found");

    const [accounts, holdings, tasks, lifeEvents, transactions, activeAlerts, monteCarloScenarios, documents, docChecklist, businessEntities, dafAccounts, crts, diPortfolios, taxLots, trusts, estateExemptions, giftHistory] = await Promise.all([
      storage.getAccountsByClient(clientId),
      storage.getHoldingsByClient(clientId),
      storage.getTasksByClient(clientId),
      storage.getLifeEvents(clientId),
      storage.getTransactionsByClient(clientId),
      storage.getActiveClientAlerts(clientId),
      storage.getMonteCarloScenarios(clientId),
      storage.getDocumentsByClient(clientId).catch(() => []),
      storage.getDocumentChecklist(clientId).catch(() => []),
      storage.getBusinessEntitiesByClient(clientId).catch(() => []),
      storage.getDafAccountsByClient(clientId).catch(() => []),
      storage.getCrtsByClient(clientId).catch(() => []),
      storage.getDirectIndexPortfoliosByClient(clientId).catch(() => []),
      storage.getTaxLotsByClient(clientId).catch(() => []),
      storage.getTrustsByClient(clientId).catch(() => []),
      storage.getEstateExemptions(clientId).catch(() => []),
      storage.getGiftHistory(clientId).catch(() => []),
    ]);

    const settings = await this.resolveSettings(advisorId, client);

    let perf: any[] = [];
    if (accounts.length > 0 && accounts[0].householdId) {
      perf = await storage.getPerformanceByHousehold(accounts[0].householdId);
    } else if (accounts.length > 0) {
      perf = await storage.getPerformanceByAccount(accounts[0].id);
    }

    let householdMembers: any[] = [];
    if (accounts.length > 0 && accounts[0].householdId) {
      try {
        householdMembers = await storage.getHouseholdMembers(accounts[0].householdId);
      } catch { /* ignore */ }
    }

    const clientAge = client.dateOfBirth ? this.calculateAge(client.dateOfBirth) : null;
    const totalAUM = accounts.reduce((s, a) => s + parseFloat(String(a.balance || "0")), 0);

    const latestMonteCarlo = monteCarloScenarios.length > 0 ? monteCarloScenarios[0] : null;
    const monteCarloResults = latestMonteCarlo?.results as SimulationResults | null;
    const monteCarloSuccessRate = monteCarloResults?.successRate ?? null;

    const sanitizedClient = {
      ...client,
      occupation: sanitizePromptInput(client.occupation || ""),
      notes: sanitizePromptInput(client.notes || ""),
      interests: sanitizePromptInput(client.interests || ""),
      employer: sanitizePromptInput(client.employer || ""),
    };

    const clientData = {
      client: sanitizedClient,
      clientAge,
      totalAUM,
      accounts,
      holdings,
      perf,
      tasks,
      lifeEvents,
      transactions,
      settings,
      activeAlerts,
      monteCarloSuccessRate,
      householdMembers,
      documents,
      docChecklist,
      businessEntities,
      dafAccounts,
      crts,
      diPortfolios,
      taxLots,
      trusts,
      estateExemptions,
      giftHistory,
    };

    const domainAssessments = await Promise.all([
      this.assessCashFlow(clientData),
      this.assessInvestment(clientData),
      this.assessInsurance(clientData),
      this.assessTax(clientData),
      this.assessRetirement(clientData),
      this.assessEstate(clientData),
      this.assessEducation(clientData),
    ]);

    const validScores = domainAssessments.filter((d) => d.score >= 0);
    const overallScore = validScores.length > 0
      ? Math.round(validScores.reduce((s, d) => s + d.score, 0) / validScores.length)
      : 50;

    const criticalActions = domainAssessments
      .flatMap((d) => d.recommendations.filter((r) => r.priority === "high"))
      .slice(0, 5);

    const rawSummary = this.generateExecutiveSummary(domainAssessments, overallScore, `${client.firstName} ${client.lastName}`);

    const allRecommendationText = domainAssessments
      .flatMap(d => d.recommendations.map(r => r.action + " " + r.rationale))
      .join("\n") + "\n" + rawSummary;

    const riskTolerance = (client.riskTolerance || "").toLowerCase();
    const ipsLimits = this.deriveInvestmentPolicyLimits(riskTolerance, client.assessmentOverrides as any);

    const holdingsForValidation = holdings.map((h: any) => ({
      ticker: h.ticker || "",
      name: h.name || "",
      marketValue: parseFloat(String(h.marketValue || "0")),
      sector: h.sector || undefined,
      weight: h.weight ? parseFloat(String(h.weight)) : undefined,
    }));

    const withdrawalTransactions = (transactions || [])
      .filter((t: any) => parseFloat(t.amount || "0") < 0 && t.date && new Date(t.date) > new Date())
      .map((t: any) => ({
        amount: Math.abs(parseFloat(t.amount || "0")),
        date: t.date,
        type: t.type || "withdrawal",
      }));

    const isRmdAge = clientAge !== null && clientAge >= 73;

    const complianceResult = await validateAIContent(allRecommendationText, "assessment", {
      advisorId,
      clientId,
      clientRiskTolerance: client.riskTolerance || undefined,
      clientAge: clientAge || undefined,
      holdings: holdingsForValidation.length > 0 ? holdingsForValidation : undefined,
      totalPortfolioValue: totalAUM > 0 ? totalAUM : undefined,
      upcomingWithdrawals: withdrawalTransactions.length > 0 ? withdrawalTransactions : undefined,
      rmdRequired: isRmdAge || undefined,
      investmentPolicyLimits: ipsLimits,
    });

    try {
      await storage.createFiduciaryValidationLog({
        advisorId,
        clientId,
        contentType: "assessment",
        outcome: complianceResult.outcome,
        ruleSetVersion: complianceResult.ruleSetVersion,
        matchCount: complianceResult.matches.length,
        warningCount: complianceResult.warnings.length,
        blockCount: complianceResult.blocks.length,
        matches: complianceResult.matches as any,
        contentPreview: allRecommendationText.substring(0, 500),
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
      });
    } catch (logErr) {
      logger.error({ err: logErr }, "Failed to log compliance validation for assessment");
    }

    const summary = complianceResult.outcome === "blocked"
      ? rawSummary + "\n\n> **⚠️ Compliance Review Required** — Some recommendations in this assessment have been flagged by the fiduciary compliance guardrail. Please review before sharing with client."
      : complianceResult.outcome === "flagged"
        ? rawSummary + "\n\n> **ℹ️ Compliance Notice** — Some content has compliance annotations. Review the flagged items."
        : rawSummary;

    const result: AssessmentResult = {
      clientId,
      advisorId,
      overallScore,
      domains: domainAssessments,
      criticalActions,
      summary,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    };

    await storage.createAssessment({
      clientId,
      advisorId,
      overallScore,
      assessmentData: result as any,
      criticalActions: criticalActions as any,
      summary,
      generatedAt: result.generatedAt,
      expiresAt: result.expiresAt,
    });

    cache.set(clientId, { result, expiresAt: Date.now() + CACHE_TTL_MS });

    logger.info("Operation completed");
    return result;
  }

  async assessDomain(clientId: string, domain: PlanningDomain, advisorId?: string): Promise<DomainAssessment> {
    const client = await storage.getClient(clientId);
    if (!client) throw new Error("Client not found");
    const resolvedAdvisorId = advisorId || client.advisorId;
    const [accounts, holdings, tasks, lifeEvents, transactions, activeAlerts, monteCarloScenarios, documents, docChecklist, businessEntities, dafAccounts, crts, diPortfolios, taxLots, trusts, estateExemptions, giftHistory] = await Promise.all([
      storage.getAccountsByClient(clientId),
      storage.getHoldingsByClient(clientId),
      storage.getTasksByClient(clientId),
      storage.getLifeEvents(clientId),
      storage.getTransactionsByClient(clientId),
      storage.getActiveClientAlerts(clientId),
      storage.getMonteCarloScenarios(clientId),
      storage.getDocumentsByClient(clientId).catch(() => []),
      storage.getDocumentChecklist(clientId).catch(() => []),
      storage.getBusinessEntitiesByClient(clientId).catch(() => []),
      storage.getDafAccountsByClient(clientId).catch(() => []),
      storage.getCrtsByClient(clientId).catch(() => []),
      storage.getDirectIndexPortfoliosByClient(clientId).catch(() => []),
      storage.getTaxLotsByClient(clientId).catch(() => []),
      storage.getTrustsByClient(clientId).catch(() => []),
      storage.getEstateExemptions(clientId).catch(() => []),
      storage.getGiftHistory(clientId).catch(() => []),
    ]);
    const settings = await this.resolveSettings(resolvedAdvisorId, client);
    let perf: any[] = [];
    if (accounts.length > 0 && accounts[0].householdId) {
      perf = await storage.getPerformanceByHousehold(accounts[0].householdId);
    }
    let householdMembers: any[] = [];
    if (accounts.length > 0 && accounts[0].householdId) {
      try {
        householdMembers = await storage.getHouseholdMembers(accounts[0].householdId);
      } catch { /* ignore */ }
    }
    const clientAge = client.dateOfBirth ? this.calculateAge(client.dateOfBirth) : null;
    const totalAUM = accounts.reduce((s, a) => s + parseFloat(String(a.balance || "0")), 0);
    const latestMonteCarlo = monteCarloScenarios.length > 0 ? monteCarloScenarios[0] : null;
    const monteCarloResults = latestMonteCarlo?.results as SimulationResults | null;
    const monteCarloSuccessRate = monteCarloResults?.successRate ?? null;
    const sanitizedClient = {
      ...client,
      occupation: sanitizePromptInput(client.occupation || ""),
      notes: sanitizePromptInput(client.notes || ""),
      interests: sanitizePromptInput(client.interests || ""),
      employer: sanitizePromptInput(client.employer || ""),
    };
    const data = { client: sanitizedClient, clientAge, totalAUM, accounts, holdings, perf, tasks, lifeEvents, transactions, settings, activeAlerts, monteCarloSuccessRate, householdMembers, documents, docChecklist, businessEntities, dafAccounts, crts, diPortfolios, taxLots, trusts, estateExemptions, giftHistory };

    const methods: Record<PlanningDomain, (d: any) => Promise<DomainAssessment>> = {
      cashflow: (d) => this.assessCashFlow(d),
      investment: (d) => this.assessInvestment(d),
      insurance: (d) => this.assessInsurance(d),
      tax: (d) => this.assessTax(d),
      retirement: (d) => this.assessRetirement(d),
      estate: (d) => this.assessEstate(d),
      education: (d) => this.assessEducation(d),
    };
    return methods[domain](data);
  }

  private async assessCashFlow(data: any): Promise<DomainAssessment> {
    const { client, totalAUM, accounts, transactions, activeAlerts } = data;

    const recentTransactions = (transactions || []).slice(0, 20);
    const deposits = recentTransactions.filter((t: any) => parseFloat(t.amount || "0") > 0);
    const withdrawals = recentTransactions.filter((t: any) => parseFloat(t.amount || "0") < 0);
    const depositTotal = deposits.reduce((s: number, t: any) => s + Math.abs(parseFloat(t.amount || "0")), 0);
    const withdrawalTotal = withdrawals.reduce((s: number, t: any) => s + Math.abs(parseFloat(t.amount || "0")), 0);

    const cashAccounts = accounts.filter((a: any) =>
      /money market|cash|savings|checking/i.test(a.accountType || "")
    );
    const cashBalance = cashAccounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);

    const cashflowAlerts = this.getAlertsByDomain(activeAlerts, "cashflow");
    const alertContext = cashflowAlerts.length > 0
      ? `\n- Active Cash Flow Alerts: ${cashflowAlerts.length} (${cashflowAlerts.map((a: Alert) => `${a.severity}: ${a.title}`).join("; ")})`
      : "";

    const prompt = `Assess cash flow and liquidity for this client:
- Total AUM: $${totalAUM.toLocaleString()}
- Cash/Money Market Balance: $${cashBalance.toLocaleString()}
- Cash as % of Portfolio: ${totalAUM > 0 ? ((cashBalance / totalAUM) * 100).toFixed(1) : 0}%
- Recent Deposits (last 20 txns): $${depositTotal.toLocaleString()}
- Recent Withdrawals (last 20 txns): $${withdrawalTotal.toLocaleString()}
- Number of Accounts: ${accounts.length}
- Client Occupation: ${sanitizeForPrompt(client.occupation || "Unknown", 200)}
- Risk Tolerance: ${sanitizeForPrompt(client.riskTolerance || "Unknown", 100)}${alertContext}

Provide:
1. Status: action_needed | on_track | review
2. Score: 0-100
3. Summary: 1-2 sentences about cash flow health
4. 2-3 recommendations with priority (high/medium/low), action, and rationale

Respond with valid JSON only: {"status":"...","score":...,"summary":"...","recommendations":[{"priority":"...","action":"...","rationale":"..."}]}`;

    const aiResult = await generateAssessment(prompt);
    const result = this.parseAIResult(aiResult, "cashflow", {
      totalAUM: `$${totalAUM.toLocaleString()}`,
      cashBalance: `$${cashBalance.toLocaleString()}`,
      cashPercent: totalAUM > 0 ? `${((cashBalance / totalAUM) * 100).toFixed(1)}%` : "N/A",
      accountCount: accounts.length,
    });
    return this.applyAlertPenalty(result, cashflowAlerts);
  }

  private async assessInvestment(data: any): Promise<DomainAssessment> {
    const { client, clientAge, totalAUM, holdings, perf, accounts, activeAlerts, diPortfolios = [], taxLots = [] } = data;

    if (!holdings || holdings.length === 0) {
      const investmentAlerts = this.getAlertsByDomain(activeAlerts, "investment");
      const placeholder = this.placeholderDomain("investment", "No holdings data available for investment assessment.", {
        priority: "high" as const,
        action: "Add investment holdings to client profile",
        rationale: "Cannot assess investment strategy without holdings data",
      });
      return this.applyAlertPenalty(placeholder, investmentAlerts);
    }

    const totalMV = holdings.reduce((s: number, h: any) => s + parseFloat(String(h.marketValue || "0")), 0);
    const sectors: Record<string, number> = {};
    for (const h of holdings) {
      const sector = h.sector || "Other";
      sectors[sector] = (sectors[sector] || 0) + parseFloat(String(h.marketValue || "0"));
    }
    const sectorBreakdown = Object.entries(sectors)
      .map(([sector, value]) => ({ sector, value, weight: totalMV > 0 ? ((value / totalMV) * 100).toFixed(1) + "%" : "0%" }))
      .sort((a, b) => (b.value as number) - (a.value as number));

    const topHoldings = [...holdings]
      .sort((a: any, b: any) => parseFloat(b.marketValue || "0") - parseFloat(a.marketValue || "0"))
      .slice(0, 5);
    const topConcentration = topHoldings.reduce((s: number, h: any) => s + parseFloat(String(h.marketValue || "0")), 0);

    const totalUGL = holdings.reduce((s: number, h: any) => s + parseFloat(String(h.unrealizedGainLoss || "0")), 0);

    const ytdReturn = perf.find((p: any) => p.period === "YTD");

    const investmentAlerts = this.getAlertsByDomain(activeAlerts, "investment");
    const alertContext = investmentAlerts.length > 0
      ? `\n- Active Investment Alerts: ${investmentAlerts.length} (${investmentAlerts.map((a: Alert) => `${a.severity}: ${a.title}`).join("; ")})`
      : "";

    const diPortfolioCount = (diPortfolios || []).length;
    const realizedLosses = (taxLots || [])
      .filter((l: any) => parseFloat(String(l.realizedGainLoss || "0")) < 0)
      .reduce((s: number, l: any) => s + Math.abs(parseFloat(String(l.realizedGainLoss || "0"))), 0);
    const unrealizedTaxLotLosses = (taxLots || [])
      .filter((l: any) => parseFloat(String(l.unrealizedGainLoss || "0")) < 0)
      .reduce((s: number, l: any) => s + Math.abs(parseFloat(String(l.unrealizedGainLoss || "0"))), 0);
    const diContext = diPortfolioCount > 0
      ? `\n- Direct Indexing Portfolios: ${diPortfolioCount}\n- Tax-Loss Harvested (Realized): $${realizedLosses.toLocaleString()}\n- Unrealized Losses Available: $${unrealizedTaxLotLosses.toLocaleString()}\n- Estimated Tax Savings (37%): $${Math.round(realizedLosses * 0.37).toLocaleString()}`
      : "";

    const prompt = `Assess investment portfolio for this client:
- Client Age: ${clientAge || "Unknown"}
- Risk Tolerance: ${sanitizeForPrompt(client.riskTolerance || "Unknown", 100)}
- Total Portfolio: $${totalMV.toLocaleString()}
- Number of Holdings: ${holdings.length}
- Top 5 Holdings Concentration: ${totalMV > 0 ? ((topConcentration / totalMV) * 100).toFixed(1) : 0}%
- Sector Breakdown: ${sectorBreakdown.map((s) => `${sanitizeForPrompt(String(s.sector), 100)}: ${s.weight}`).join(", ")}
- Unrealized Gain/Loss: $${totalUGL.toLocaleString()}
- YTD Return: ${ytdReturn ? `${parseFloat(ytdReturn.returnPct || "0").toFixed(2)}%` : "N/A"}
- Account Types: ${[...new Set(accounts.map((a: any) => sanitizeForPrompt(String(a.accountType || ''), 100)))].join(", ")}${alertContext}${diContext}

Provide:
1. Status: action_needed | on_track | review
2. Score: 0-100
3. Summary: 1-2 sentences
4. 2-3 recommendations with priority, action, rationale

Respond with valid JSON only: {"status":"...","score":...,"summary":"...","recommendations":[{"priority":"...","action":"...","rationale":"..."}]}`;

    const aiResult = await generateAssessment(prompt);
    const result = this.parseAIResult(aiResult, "investment", {
      portfolioValue: `$${totalMV.toLocaleString()}`,
      holdingsCount: holdings.length,
      topConcentration: `${totalMV > 0 ? ((topConcentration / totalMV) * 100).toFixed(1) : 0}%`,
      unrealizedGainLoss: `$${totalUGL.toLocaleString()}`,
      sectorCount: Object.keys(sectors).length,
      ytdReturn: ytdReturn ? `${parseFloat(ytdReturn.returnPct || "0").toFixed(2)}%` : "N/A",
      directIndexingPortfolios: diPortfolioCount,
      harvestedLosses: realizedLosses > 0 ? `$${realizedLosses.toLocaleString()}` : "None",
      estimatedTaxSavings: realizedLosses > 0 ? `$${Math.round(realizedLosses * 0.37).toLocaleString()}` : "N/A",
    });
    return this.applyAlertPenalty(result, investmentAlerts);
  }

  private computeInsuranceScore(data: any): { score: number; metrics: Record<string, any>; factors: string[] } {
    const { client, clientAge, totalAUM, settings, accounts, householdMembers, documents, businessEntities = [], trusts = [] } = data;
    const withdrawalRate = settings.withdrawalRate;
    const insuranceMultiplier = settings.insuranceMultiplier;
    const estimatedIncome = totalAUM > 0 ? Math.round(totalAUM * (withdrawalRate / 100)) : 0;
    const recommendedCoverage = estimatedIncome * insuranceMultiplier;

    const notes = (client.notes || "");

    const dependentRelationships = /child|son|daughter|dependent|minor/i;
    const spouseRelationships = /spouse|wife|husband|partner/i;
    const structuredDependents = (householdMembers || []).filter((m: any) =>
      dependentRelationships.test(m.relationship || "")
    );
    const structuredSpouse = (householdMembers || []).filter((m: any) =>
      spouseRelationships.test(m.relationship || "")
    );
    const dependentCount = structuredDependents.length;
    const hasSpouse = structuredSpouse.length > 0;
    const notesDependents = /child|kid|baby|son|daughter|dependent/i.test(notes);
    const notesSpouse = /spouse|wife|husband|partner/i.test(notes);
    const hasDependents = dependentCount > 0 || notesDependents;
    const hasFamilyObligations = hasDependents || hasSpouse || notesSpouse;

    const insuranceDocs = (documents || []).filter((d: any) =>
      /insurance|life insurance|disability|umbrella|ltc|long.?term care/i.test(d.type || d.name || "")
    );
    const hasInsuranceDocs = insuranceDocs.length > 0;
    const hasInsuranceMention = /life insurance|term life|whole life|universal life|disability|umbrella|long.?term care|ltc/i.test(notes);
    const hasInsuranceEvidence = hasInsuranceDocs || hasInsuranceMention;

    const coverageMatch = notes.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:k|K)?\s*(?:coverage|life|insurance|policy)/i) ||
                          notes.match(/(?:coverage|life|insurance|policy)\s*(?:of|:)?\s*\$\s*([\d,]+(?:\.\d+)?)\s*(?:k|K)?/i);
    let documentedCoverage = 0;
    if (coverageMatch) {
      documentedCoverage = parseFloat(coverageMatch[1].replace(/,/g, ""));
      if (/k/i.test(coverageMatch[0])) documentedCoverage *= 1000;
    }

    const hasEmployerBenefits = /employer.*benefit|group.*life|group.*insurance|employer.*insurance|benefit.*package/i.test(notes) ||
                                (client.employer && client.employer.trim().length > 0);

    const debtAccounts = (accounts || []).filter((a: any) =>
      /loan|mortgage|credit|margin|heloc/i.test(a.accountType || "")
    );
    const totalDebt = debtAccounts.reduce((s: number, a: any) => s + Math.abs(parseFloat(String(a.balance || "0"))), 0);

    const factors: string[] = [];
    let score = 50;

    if (hasInsuranceEvidence) {
      score += 15;
      if (hasInsuranceDocs) {
        factors.push(`${insuranceDocs.length} insurance document(s) on file`);
      }
      if (hasInsuranceMention) {
        factors.push("Insurance policies referenced in client notes");
      }
    } else {
      score -= 15;
      factors.push("No insurance policies documented in records or notes");
    }

    if (documentedCoverage > 0 && recommendedCoverage > 0) {
      const coverageRatio = documentedCoverage / recommendedCoverage;
      if (coverageRatio >= 1.0) {
        score += 15;
        factors.push(`Coverage ratio ${(coverageRatio * 100).toFixed(0)}% — meets or exceeds ${insuranceMultiplier}x income target ($${documentedCoverage.toLocaleString()} / $${recommendedCoverage.toLocaleString()})`);
      } else if (coverageRatio >= 0.5) {
        score += 5;
        factors.push(`Coverage ratio ${(coverageRatio * 100).toFixed(0)}% — partially meets ${insuranceMultiplier}x income target`);
      } else {
        score -= 10;
        factors.push(`Coverage ratio only ${(coverageRatio * 100).toFixed(0)}% — significantly below ${insuranceMultiplier}x income target`);
      }
    } else if (recommendedCoverage > 0 && !hasInsuranceEvidence) {
      factors.push(`Recommended coverage: $${recommendedCoverage.toLocaleString()} (${insuranceMultiplier}x estimated income) — no documented coverage to compare`);
    }

    if (hasDependents) {
      const depDesc = dependentCount > 0 ? `${dependentCount} dependent(s) in household` : "Dependents mentioned in notes";
      if (!hasInsuranceEvidence) {
        score -= 15;
        factors.push(`${depDesc} but no insurance coverage documented — high priority gap`);
      } else {
        score += 5;
        factors.push(`${depDesc} with insurance coverage in place`);
      }
    }
    if (hasSpouse || notesSpouse) {
      if (!hasDependents) {
        factors.push("Spouse/partner present — survivor income protection relevant");
      }
    }
    if (!hasFamilyObligations) {
      score += 5;
      factors.push("No dependents or spouse identified — lower coverage urgency");
    }

    if (clientAge !== null) {
      if (clientAge > 60) {
        score -= 5;
        factors.push("Age over 60 — long-term care and Medicare supplemental review needed");
      } else if (clientAge < 40) {
        score += 5;
        factors.push("Under 40 — favorable insurance rates available");
      } else if (clientAge >= 40 && clientAge <= 55) {
        factors.push("Age 40-55 — peak earning years, coverage review important");
      }
    }

    if (hasEmployerBenefits) {
      score += 3;
      factors.push(`Employer benefits data available (${client.employer || "employer noted"}) — may supplement personal coverage`);
    }

    const totalBusinessValue = (businessEntities || []).reduce(
      (s: number, e: any) => s + parseFloat(String(e.estimatedValue || "0")), 0
    );
    if (totalBusinessValue > 500_000) {
      const hasKeyPersonInsurance = (businessEntities || []).some((e: any) =>
        /life insurance|key.?person|buy.?sell/i.test(e.notes || "")
      );
      if (!hasKeyPersonInsurance) {
        score -= 8;
        factors.push(`Business interests valued at $${totalBusinessValue.toLocaleString()} without documented key-person or buy-sell insurance — continuity risk`);
      } else {
        score += 5;
        factors.push(`Business interests ($${totalBusinessValue.toLocaleString()}) with key-person/buy-sell insurance documented`);
      }
    }

    const ilitTrusts = (trusts || []).filter((t: any) =>
      /ilit|irrevocable life|insurance trust/i.test(t.trustType || t.name || "")
    );
    if (ilitTrusts.length > 0) {
      score += 8;
      const ilitValue = ilitTrusts.reduce((s: number, t: any) => s + parseFloat(String(t.fundedValue || "0")), 0);
      factors.push(`${ilitTrusts.length} ILIT(s) hold life insurance outside the estate — $${ilitValue.toLocaleString()} in coverage protected from estate tax`);
    }

    if (totalDebt > 0) {
      const debtToAUM = totalAUM > 0 ? totalDebt / totalAUM : 1;
      if (debtToAUM > 0.5 && !hasInsuranceEvidence) {
        score -= 10;
        factors.push(`Significant debt ($${totalDebt.toLocaleString()}, ${(debtToAUM * 100).toFixed(0)}% of AUM) without documented insurance coverage`);
      } else if (debtToAUM > 0.3) {
        score -= 3;
        factors.push(`Debt obligations: $${totalDebt.toLocaleString()} (${(debtToAUM * 100).toFixed(0)}% of AUM) — debt coverage gap risk`);
      } else {
        factors.push(`Debt obligations: $${totalDebt.toLocaleString()} — manageable relative to assets`);
      }
    }

    const finalScore = clampScore(score);
    return {
      score: finalScore,
      metrics: {
        totalAssets: `$${totalAUM.toLocaleString()}`,
        estimatedIncome: `$${estimatedIncome.toLocaleString()}`,
        dependentCount,
        hasDependents: hasDependents ? "Yes" : "No",
        hasSpouse: (hasSpouse || notesSpouse) ? "Yes" : "No",
        recommendedCoverage: `$${recommendedCoverage.toLocaleString()}`,
        documentedCoverage: documentedCoverage > 0 ? `$${documentedCoverage.toLocaleString()}` : "Not documented",
        coverageRatio: (documentedCoverage > 0 && recommendedCoverage > 0)
          ? `${((documentedCoverage / recommendedCoverage) * 100).toFixed(0)}%`
          : "N/A",
        withdrawalRate: `${withdrawalRate}%`,
        insuranceMultiplier: `${insuranceMultiplier}x`,
        debtObligations: `$${totalDebt.toLocaleString()}`,
        insuranceDocumented: hasInsuranceEvidence ? "Yes" : "No",
        insuranceDocsOnFile: insuranceDocs.length,
        employerBenefits: hasEmployerBenefits ? "Available" : "Not documented",
        businessValue: totalBusinessValue > 0 ? `$${totalBusinessValue.toLocaleString()}` : "None",
        businessEntities: (businessEntities || []).length,
        ilitTrusts: ilitTrusts.length,
      },
      factors,
    };
  }

  private async assessInsurance(data: any): Promise<DomainAssessment> {
    const { client, clientAge, totalAUM, settings, activeAlerts } = data;
    const insuranceAlerts = this.getAlertsByDomain(activeAlerts, "insurance");

    const { score: rawScore, metrics, factors } = this.computeInsuranceScore(data);

    const { score: penalizedScore, status: penalizedStatus, penaltyFactors } = this.computeAlertPenaltyPreview(rawScore, insuranceAlerts);

    const allFactors = [...factors, ...penaltyFactors];

    const prompt = `You are a senior financial planning analyst. A deterministic insurance assessment has already been computed for this client. Your job is ONLY to generate a human-readable summary and actionable recommendations — DO NOT recalculate the score.

Pre-computed results:
- Deterministic Score: ${penalizedScore}/100
- Status: ${penalizedStatus}
- Scoring factors: ${allFactors.join("; ")}

Client context:
- Age: ${clientAge || "Unknown"}
- Total Assets: $${totalAUM.toLocaleString()}
- Estimated Annual Income: ${metrics.estimatedIncome}
- Recommended Coverage (${settings.insuranceMultiplier}x income): ${metrics.recommendedCoverage}
- Documented Coverage: ${metrics.documentedCoverage}
- Coverage Ratio: ${metrics.coverageRatio}
- Dependent Count: ${metrics.dependentCount}
- Has Spouse/Partner: ${metrics.hasSpouse}
- Occupation: ${sanitizeForPrompt(client.occupation || "Unknown", 200)}
- Employer Benefits: ${metrics.employerBenefits}
- Debt Obligations: ${metrics.debtObligations}
- Insurance Docs on File: ${metrics.insuranceDocsOnFile}

Provide a JSON response with:
1. summary: 1-2 sentences explaining the score and key findings
2. recommendations: 2-3 actionable items with priority (high/medium/low), action, rationale, and estimatedCost if applicable

Respond with valid JSON only: {"summary":"...","recommendations":[{"priority":"...","action":"...","rationale":"...","estimatedCost":"..."}]}`;

    const aiResult = await generateAssessment(prompt);
    const narrative = this.parseNarrative(aiResult);

    return {
      domain: "insurance",
      status: penalizedStatus,
      score: penalizedScore,
      summary: narrative.summary,
      keyMetrics: metrics,
      recommendations: narrative.recommendations,
      generatedAt: new Date(),
    };
  }

  private async assessTax(data: any): Promise<DomainAssessment> {
    const { client, totalAUM, holdings, accounts, activeAlerts } = data;

    const taxableAccounts = accounts.filter((a: any) => a.taxStatus === "taxable" || !a.taxStatus);
    const taxDeferredAccounts = accounts.filter((a: any) => /ira|401k|403b|deferred/i.test(a.accountType || ""));
    const rothAccounts = accounts.filter((a: any) => /roth/i.test(a.accountType || ""));

    const taxableBalance = taxableAccounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);
    const taxDeferredBalance = taxDeferredAccounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);
    const rothBalance = rothAccounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);

    const unrealizedLosses = holdings
      .filter((h: any) => parseFloat(String(h.unrealizedGainLoss || "0")) < 0)
      .reduce((s: number, h: any) => s + Math.abs(parseFloat(String(h.unrealizedGainLoss || "0"))), 0);

    const unrealizedGains = holdings
      .filter((h: any) => parseFloat(String(h.unrealizedGainLoss || "0")) > 0)
      .reduce((s: number, h: any) => s + parseFloat(String(h.unrealizedGainLoss || "0")), 0);

    const taxAlerts = this.getAlertsByDomain(activeAlerts, "tax");
    const alertContext = taxAlerts.length > 0
      ? `\n- Active Tax Alerts: ${taxAlerts.length} (${taxAlerts.map((a: Alert) => `${a.severity}: ${a.title}`).join("; ")})`
      : "";

    const prompt = `Assess tax optimization opportunities for this client:
- Total Assets: $${totalAUM.toLocaleString()}
- Taxable Account Balance: $${taxableBalance.toLocaleString()}
- Tax-Deferred Balance (IRA/401k): $${taxDeferredBalance.toLocaleString()}
- Roth Balance: $${rothBalance.toLocaleString()}
- Unrealized Gains: $${unrealizedGains.toLocaleString()}
- Unrealized Losses (TLH opportunity): $${unrealizedLosses.toLocaleString()}
- Client Occupation: ${sanitizeForPrompt(client.occupation || "Unknown", 200)}${alertContext}

Provide:
1. Status: action_needed | on_track | review
2. Score: 0-100
3. Summary: 1-2 sentences
4. 2-3 recommendations with priority, action, rationale, and estimatedImpact

Respond with valid JSON only: {"status":"...","score":...,"summary":"...","recommendations":[{"priority":"...","action":"...","rationale":"...","estimatedImpact":"..."}]}`;

    const aiResult = await generateAssessment(prompt);
    const result = this.parseAIResult(aiResult, "tax", {
      taxableBalance: `$${taxableBalance.toLocaleString()}`,
      taxDeferredBalance: `$${taxDeferredBalance.toLocaleString()}`,
      rothBalance: `$${rothBalance.toLocaleString()}`,
      unrealizedGains: `$${unrealizedGains.toLocaleString()}`,
      taxLossHarvestingOpportunity: `$${unrealizedLosses.toLocaleString()}`,
    });
    return this.applyAlertPenalty(result, taxAlerts);
  }

  private computeRetirementScore(data: any): { score: number; metrics: Record<string, any>; factors: string[] } {
    const { client, clientAge, totalAUM, accounts, settings, monteCarloSuccessRate, crts = [] } = data;

    const retirementAccounts = (accounts || []).filter((a: any) =>
      /ira|401k|403b|pension|retirement/i.test(a.accountType || "")
    );
    const retirementBalance = retirementAccounts.reduce(
      (s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0
    );

    const targetAge = settings.retirementAge;
    const withdrawalRate = settings.withdrawalRate;
    const yearsToRetirement = clientAge ? Math.max(0, targetAge - clientAge) : null;
    const projectedAnnualIncome = totalAUM > 0 ? totalAUM * (withdrawalRate / 100) : 0;

    const factors: string[] = [];
    let score: number;

    if (monteCarloSuccessRate !== null) {
      score = monteCarloSuccessRate;
      factors.push(`Monte Carlo success rate directly mapped: ${monteCarloSuccessRate}%`);
    } else {
      score = 55;
      factors.push("No Monte Carlo simulation available — using heuristic baseline");
    }

    if (yearsToRetirement !== null) {
      if (yearsToRetirement <= 0) {
        factors.push("Client is at or past retirement age");
      } else if (yearsToRetirement <= 5) {
        score -= 5;
        factors.push("Within 5 years of retirement — limited time for course correction");
      } else if (yearsToRetirement >= 20) {
        score += 5;
        factors.push("20+ years to retirement — significant time for compound growth");
      }
    }

    if (totalAUM > 0) {
      const retirementRatio = retirementBalance / totalAUM;
      if (retirementRatio >= 0.6) {
        score += 5;
        factors.push(`Strong retirement allocation: ${(retirementRatio * 100).toFixed(0)}% of portfolio in retirement accounts`);
      } else if (retirementRatio < 0.2 && retirementAccounts.length > 0) {
        score -= 5;
        factors.push(`Low retirement allocation: only ${(retirementRatio * 100).toFixed(0)}% of portfolio in retirement accounts`);
      }
    }

    if (clientAge !== null && clientAge >= 62) {
      factors.push("Eligible or near-eligible for Social Security benefits");
      score += 3;
    }

    if (retirementAccounts.length === 0) {
      score -= 15;
      factors.push("No dedicated retirement accounts identified");
    }

    const targetRetirementSavings = projectedAnnualIncome > 0 ? projectedAnnualIncome * 25 : 0;
    if (targetRetirementSavings > 0 && retirementBalance > 0) {
      const fundingRatio = retirementBalance / targetRetirementSavings;
      if (fundingRatio >= 1.0) {
        score += 10;
        factors.push(`Retirement accounts at ${(fundingRatio * 100).toFixed(0)}% of 25x withdrawal target`);
      } else if (fundingRatio >= 0.5) {
        factors.push(`Retirement accounts at ${(fundingRatio * 100).toFixed(0)}% of 25x withdrawal target — on track`);
      } else {
        score -= 10;
        factors.push(`Retirement accounts at ${(fundingRatio * 100).toFixed(0)}% of 25x withdrawal target — underfunded`);
      }
    }

    const crtAnnualIncome = (crts || []).reduce(
      (s: number, c: any) => s + parseFloat(String(c.projectedAnnualIncome || "0")), 0
    );
    if (crtAnnualIncome > 0) {
      score += 5;
      const crtPct = projectedAnnualIncome > 0 ? ((crtAnnualIncome / projectedAnnualIncome) * 100).toFixed(1) : "N/A";
      factors.push(`CRT income stream of $${crtAnnualIncome.toLocaleString()}/year supplements retirement income (${crtPct}% of projected withdrawal income)`);
    }

    const finalScore = clampScore(score);
    return {
      score: finalScore,
      metrics: {
        currentAge: clientAge ?? "Unknown",
        targetRetirementAge: targetAge,
        yearsToRetirement: yearsToRetirement ?? "Unknown",
        retirementBalance: `$${retirementBalance.toLocaleString()}`,
        totalPortfolio: `$${totalAUM.toLocaleString()}`,
        projectedAnnualIncome: `$${projectedAnnualIncome.toLocaleString()}`,
        withdrawalRate: `${withdrawalRate}%`,
        monteCarloSuccessRate: monteCarloSuccessRate !== null ? `${monteCarloSuccessRate}%` : "N/A",
        retirementAccountCount: retirementAccounts.length,
        crtAnnualIncome: crtAnnualIncome > 0 ? `$${crtAnnualIncome.toLocaleString()}` : "None",
      },
      factors,
    };
  }

  private async assessRetirement(data: any): Promise<DomainAssessment> {
    const { client, clientAge, totalAUM, settings, activeAlerts, monteCarloSuccessRate } = data;
    const retirementAlerts = this.getAlertsByDomain(activeAlerts, "retirement");

    const { score: rawScore, metrics, factors } = this.computeRetirementScore(data);

    const { score: penalizedScore, status: penalizedStatus, penaltyFactors } = this.computeAlertPenaltyPreview(rawScore, retirementAlerts);

    const allFactors = [...factors, ...penaltyFactors];

    const prompt = `You are a senior financial planning analyst. A deterministic retirement assessment has already been computed for this client. Your job is ONLY to generate a human-readable summary and actionable recommendations — DO NOT recalculate the score.

Pre-computed results:
- Deterministic Score: ${penalizedScore}/100
- Status: ${penalizedStatus}
- Scoring factors: ${allFactors.join("; ")}

Client context:
- Age: ${clientAge || "Unknown"}
- Target Retirement Age: ${settings.retirementAge}
- Years to Retirement: ${metrics.yearsToRetirement}
- Total Portfolio: ${metrics.totalPortfolio}
- Retirement Account Balance: ${metrics.retirementBalance}
- Risk Tolerance: ${sanitizeForPrompt(client.riskTolerance || "Unknown", 100)}
- Projected Annual Income (${settings.withdrawalRate}% withdrawal): ${metrics.projectedAnnualIncome}
- Monte Carlo Success Rate: ${metrics.monteCarloSuccessRate}

Provide a JSON response with:
1. summary: 1-2 sentences explaining the score and key findings
2. recommendations: 2-3 actionable items with priority (high/medium/low), action, rationale

Respond with valid JSON only: {"summary":"...","recommendations":[{"priority":"...","action":"...","rationale":"..."}]}`;

    const aiResult = await generateAssessment(prompt);
    const narrative = this.parseNarrative(aiResult);

    return {
      domain: "retirement",
      status: penalizedStatus,
      score: penalizedScore,
      summary: narrative.summary,
      keyMetrics: metrics,
      recommendations: narrative.recommendations,
      generatedAt: new Date(),
    };
  }

  private computeEstateScore(data: any): { score: number; metrics: Record<string, any>; factors: string[] } {
    const { client, clientAge, totalAUM, accounts, settings, documents, docChecklist, householdMembers, businessEntities = [], crts = [], dafAccounts = [], trusts = [], estateExemptions = [], giftHistory = [] } = data;
    const hnwThreshold = settings.hnwThreshold;
    const hasHighNetWorth = totalAUM > hnwThreshold;
    const notes = (client.notes || "");

    const trustAccounts = (accounts || []).filter((a: any) =>
      /trust|revocable|irrevocable/i.test(a.accountType || "")
    );
    const hasTrustAccounts = trustAccounts.length > 0;
    const trustAccountBalance = trustAccounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);

    const hasTrustMention = /trust|revocable|irrevocable|living trust|family trust/i.test(notes);
    const hasWillMention = /will|testament|last will/i.test(notes);
    const hasBeneficiaryMention = /beneficiar/i.test(notes);
    const hasPOAMention = /power of attorney|poa|healthcare directive|advance directive/i.test(notes);
    const hasGuardianMention = /guardian/i.test(notes);
    const hasTrustEvidence = hasTrustAccounts || hasTrustMention;

    const estateDocTypes = /estate|trust|will|testament|beneficiary|power of attorney|poa|guardian|healthcare directive|advance directive/i;
    const estateDocuments = (documents || []).filter((d: any) =>
      estateDocTypes.test(d.type || "") || estateDocTypes.test(d.name || "")
    );
    const hasEstateDocsOnFile = estateDocuments.length > 0;

    const estateDocCategories = ["estate", "trust", "beneficiary", "legal"];
    const checklistEstateDocs = (docChecklist || []).filter((d: any) =>
      estateDocCategories.some(cat => (d.category || "").toLowerCase().includes(cat))
    );
    const receivedChecklistDocs = checklistEstateDocs.filter((d: any) => d.received);
    const checklistCompleteness = checklistEstateDocs.length > 0 ? receivedChecklistDocs.length / checklistEstateDocs.length : 0;

    const accountsWithBeneficiaryTypes = (accounts || []).filter((a: any) =>
      /ira|401k|403b|roth|pension|retirement|annuity|life/i.test(a.accountType || "")
    );
    const beneficiaryDesignationAccounts = accountsWithBeneficiaryTypes.length;

    const hasDependents = (householdMembers || []).some((m: any) =>
      /child|son|daughter|dependent|minor/i.test(m.relationship || "")
    ) || /child|kid|baby|son|daughter|dependent/i.test(notes);

    const factors: string[] = [];
    let score = 50;

    if (hasTrustEvidence) {
      score += 15;
      if (hasTrustAccounts) {
        factors.push(`${trustAccounts.length} trust account(s) with $${trustAccountBalance.toLocaleString()} in assets`);
      }
      if (hasTrustMention && !hasTrustAccounts) {
        factors.push("Trust structure referenced in client notes");
      }
    }

    if (hasWillMention) {
      score += 10;
      factors.push("Will/testament referenced in client records");
    }

    if (hasBeneficiaryMention) {
      score += 8;
      factors.push("Beneficiary designations documented in notes");
    }
    if (beneficiaryDesignationAccounts > 0) {
      const coverageDesc = `${beneficiaryDesignationAccounts} account(s) requiring beneficiary designations (IRA/401k/Roth/Pension)`;
      if (hasBeneficiaryMention || hasEstateDocsOnFile) {
        score += 5;
        factors.push(`${coverageDesc} — beneficiary documentation present`);
      } else {
        score -= 5;
        factors.push(`${coverageDesc} — no beneficiary documentation found`);
      }
    }

    if (hasPOAMention) {
      score += 5;
      factors.push("Power of attorney or healthcare directive documented");
    }
    if (hasGuardianMention) {
      score += 3;
      factors.push("Guardian designation documented");
    }

    if (hasEstateDocsOnFile) {
      score += 8;
      factors.push(`${estateDocuments.length} estate-related document(s) on file`);
    }

    const noEstateEvidence = !hasTrustEvidence && !hasWillMention && !hasBeneficiaryMention && !hasPOAMention && !hasEstateDocsOnFile;
    if (noEstateEvidence) {
      score -= 20;
      factors.push("No estate planning documents, trust accounts, or beneficiary designations found — significant gap");
    }

    if (checklistEstateDocs.length > 0) {
      if (checklistCompleteness >= 0.8) {
        score += 10;
        factors.push(`Estate document checklist ${(checklistCompleteness * 100).toFixed(0)}% complete (${receivedChecklistDocs.length}/${checklistEstateDocs.length})`);
      } else if (checklistCompleteness < 0.5) {
        score -= 10;
        factors.push(`Estate document checklist only ${(checklistCompleteness * 100).toFixed(0)}% complete (${receivedChecklistDocs.length}/${checklistEstateDocs.length})`);
      } else {
        factors.push(`Estate document checklist ${(checklistCompleteness * 100).toFixed(0)}% complete`);
      }
    }

    if (hasHighNetWorth) {
      if (noEstateEvidence) {
        score -= 15;
        factors.push(`High net worth ($${totalAUM.toLocaleString()} > $${hnwThreshold.toLocaleString()} threshold) with no estate planning — critical gap`);
      } else if (!hasTrustEvidence) {
        score -= 5;
        factors.push("High net worth without trust structure — may result in probate exposure and estate tax inefficiency");
      } else {
        score += 5;
        factors.push("High net worth with trust structure in place — estate tax planning enabled");
      }
    }

    if (clientAge !== null && clientAge >= 70 && noEstateEvidence) {
      score -= 10;
      factors.push("Age 70+ with no estate documents — urgent action needed");
    }

    if (hasDependents && !hasGuardianMention && noEstateEvidence) {
      score -= 5;
      factors.push("Dependents present without guardian designation or estate plan");
    }

    const totalBusinessValue = (businessEntities || []).reduce(
      (s: number, e: any) => s + parseFloat(String(e.estimatedValue || "0")), 0
    );
    if (totalBusinessValue > 0) {
      const totalEstateValue = totalAUM + totalBusinessValue;
      const EXEMPTION = 13_610_000;
      if (totalEstateValue > EXEMPTION) {
        score -= 10;
        factors.push(`Business assets ($${totalBusinessValue.toLocaleString()}) push total estate to $${totalEstateValue.toLocaleString()}, exceeding federal exemption — advanced transfer planning needed`);
      } else if (totalEstateValue > EXEMPTION * 0.7) {
        score -= 3;
        factors.push(`Business assets ($${totalBusinessValue.toLocaleString()}) bring estate within 30% of federal exemption — proactive planning recommended`);
      } else {
        score += 3;
        factors.push(`Business interests ($${totalBusinessValue.toLocaleString()}) documented — estate value manageable`);
      }
    }

    const totalCrtValue = (crts || []).reduce(
      (s: number, c: any) => s + parseFloat(String(c.currentValue || c.fundedValue || "0")), 0
    );
    if (totalCrtValue > 0) {
      score += 5;
      factors.push(`CRT(s) valued at $${totalCrtValue.toLocaleString()} reduce taxable estate while generating income`);
    }

    const totalDafBalance = (dafAccounts || []).reduce(
      (s: number, d: any) => s + parseFloat(String(d.currentBalance || "0")), 0
    );
    if (totalDafBalance > 0 && totalAUM > hnwThreshold) {
      score += 2;
      factors.push(`DAF balance ($${totalDafBalance.toLocaleString()}) supports charitable estate reduction strategy`);
    }

    const dbTrustCount = (trusts || []).length;
    if (dbTrustCount > 0 && !hasTrustAccounts) {
      const dbTrustValue = (trusts || []).reduce(
        (s: number, t: any) => s + parseFloat(String(t.fundedValue || "0")), 0
      );
      score += 12;
      factors.push(`${dbTrustCount} trust structure(s) on file with $${dbTrustValue.toLocaleString()} funded — estate plan documented`);
      const irrevocableTrusts = (trusts || []).filter((t: any) =>
        /irrevocable|grat|slat|ilit|dynasty|idgt/i.test(t.trustType || "")
      );
      if (irrevocableTrusts.length > 0) {
        score += 5;
        factors.push(`${irrevocableTrusts.length} irrevocable trust(s) shelter future appreciation from estate tax`);
      }
    }

    const totalGiftsUsed = (giftHistory || []).reduce(
      (s: number, g: any) => s + parseFloat(String(g.taxableAmount || "0")), 0
    );
    if (totalGiftsUsed > 0) {
      const EXEMPTION = 13_610_000;
      const pctUsed = (totalGiftsUsed / EXEMPTION) * 100;
      if (pctUsed > 80) {
        score -= 5;
        factors.push(`${pctUsed.toFixed(0)}% of lifetime exemption used ($${totalGiftsUsed.toLocaleString()}) — limited remaining transfer capacity`);
      } else if (pctUsed > 30) {
        factors.push(`${pctUsed.toFixed(0)}% of lifetime exemption used via gifts ($${totalGiftsUsed.toLocaleString()})`);
      } else {
        score += 3;
        factors.push(`Gift planning initiated — $${totalGiftsUsed.toLocaleString()} of exemption used (${pctUsed.toFixed(0)}%)`);
      }
    }

    const currentYearExemption = (estateExemptions || []).find((e: any) => e.taxYear === new Date().getFullYear());
    if (currentYearExemption) {
      const remaining = parseFloat(String(currentYearExemption.remainingExemption || "0"));
      if (remaining > 0) {
        factors.push(`Current year exemption tracking: $${remaining.toLocaleString()} remaining`);
      }
    }

    const accountCount = (accounts || []).length;

    const finalScore = clampScore(score);
    return {
      score: finalScore,
      metrics: {
        totalAssets: `$${totalAUM.toLocaleString()}`,
        highNetWorth: hasHighNetWorth ? "Yes" : "No",
        hnwThreshold: `$${hnwThreshold.toLocaleString()}`,
        accountCount,
        trustAccounts: trustAccounts.length,
        trustAccountBalance: `$${trustAccountBalance.toLocaleString()}`,
        trustDocumented: hasTrustEvidence ? "Yes" : "No",
        willDocumented: hasWillMention ? "Yes" : "No",
        beneficiariesDocumented: hasBeneficiaryMention ? "Yes" : "No",
        beneficiaryDesignationAccounts,
        poaDocumented: hasPOAMention ? "Yes" : "No",
        estateDocsOnFile: estateDocuments.length,
        estateDocCompleteness: checklistEstateDocs.length > 0 ? `${(checklistCompleteness * 100).toFixed(0)}%` : "N/A",
        hasDependents: hasDependents ? "Yes" : "No",
        businessEntities: (businessEntities || []).length,
        businessValue: totalBusinessValue > 0 ? `$${totalBusinessValue.toLocaleString()}` : "None",
        crtValue: totalCrtValue > 0 ? `$${totalCrtValue.toLocaleString()}` : "None",
        dafBalance: totalDafBalance > 0 ? `$${totalDafBalance.toLocaleString()}` : "None",
        dbTrustsOnFile: dbTrustCount,
        lifetimeGiftsUsed: totalGiftsUsed > 0 ? `$${totalGiftsUsed.toLocaleString()}` : "None",
        exemptionTracking: currentYearExemption ? "Active" : "Not tracked",
      },
      factors,
    };
  }

  private async assessEstate(data: any): Promise<DomainAssessment> {
    const { client, clientAge, totalAUM, accounts, settings, activeAlerts } = data;
    const estateAlerts = this.getAlertsByDomain(activeAlerts, "estate");

    const { score: rawScore, metrics, factors } = this.computeEstateScore(data);

    const { score: penalizedScore, status: penalizedStatus, penaltyFactors } = this.computeAlertPenaltyPreview(rawScore, estateAlerts);

    const allFactors = [...factors, ...penaltyFactors];
    const hnwThreshold = settings.hnwThreshold;

    const prompt = `You are a senior financial planning analyst. A deterministic estate planning assessment has already been computed for this client. Your job is ONLY to generate a human-readable summary and actionable recommendations — DO NOT recalculate the score.

Pre-computed results:
- Deterministic Score: ${penalizedScore}/100
- Status: ${penalizedStatus}
- Scoring factors: ${allFactors.join("; ")}

Client context:
- Age: ${clientAge || "Unknown"}
- Total Assets: $${totalAUM.toLocaleString()}
- High Net Worth (>$${hnwThreshold.toLocaleString()}): ${metrics.highNetWorth}
- Trust Accounts: ${metrics.trustAccounts} (Balance: ${metrics.trustAccountBalance})
- Trust Documented: ${metrics.trustDocumented}
- Will Documented: ${metrics.willDocumented}
- Beneficiaries Documented: ${metrics.beneficiariesDocumented}
- Accounts Requiring Beneficiary Designations: ${metrics.beneficiaryDesignationAccounts}
- POA/Healthcare Directive: ${metrics.poaDocumented}
- Estate Docs on File: ${metrics.estateDocsOnFile}
- Estate Doc Checklist Completeness: ${metrics.estateDocCompleteness}
- Has Dependents: ${metrics.hasDependents}
- Number of Accounts: ${metrics.accountCount}

Provide a JSON response with:
1. summary: 1-2 sentences explaining the score and key findings
2. recommendations: 2-3 actionable items with priority (high/medium/low), action, rationale

Respond with valid JSON only: {"summary":"...","recommendations":[{"priority":"...","action":"...","rationale":"..."}]}`;

    const aiResult = await generateAssessment(prompt);
    const narrative = this.parseNarrative(aiResult);

    return {
      domain: "estate",
      status: penalizedStatus,
      score: penalizedScore,
      summary: narrative.summary,
      keyMetrics: metrics,
      recommendations: narrative.recommendations,
      generatedAt: new Date(),
    };
  }

  private async assessEducation(data: any): Promise<DomainAssessment> {
    const { client, accounts, activeAlerts } = data;

    const educationAccounts = accounts.filter((a: any) =>
      /529|education|coverdell|esa/i.test(a.accountType || "")
    );
    const notes = client.notes || "";
    const hasChildMention = /child|kid|baby|son|daughter|college|education|school|university/i.test(notes);

    if (educationAccounts.length === 0 && !hasChildMention) {
      const educationAlerts = this.getAlertsByDomain(activeAlerts, "education");
      const earlyResult: DomainAssessment = {
        domain: "education",
        status: "review",
        score: 50,
        summary: "No education savings accounts identified and no dependents mentioned. If education funding is a goal, consider opening a 529 plan.",
        keyMetrics: { educationAccounts: 0, childrenMentioned: "No" },
        recommendations: [
          {
            priority: "low",
            action: "Discuss education funding goals during next review",
            rationale: "529 plans offer tax-free growth for education expenses and should be considered if applicable",
          },
        ],
        generatedAt: new Date(),
      };
      return this.applyAlertPenalty(earlyResult, educationAlerts);
    }

    const educationBalance = educationAccounts.reduce(
      (s: number, a: any) => s + parseFloat(String(a.balance || "0")),
      0
    );

    const prompt = `Assess education funding for this client:
- Has 529/Education Accounts: ${educationAccounts.length > 0 ? "Yes" : "No"}
- Education Account Balance: $${educationBalance.toLocaleString()}
- Number of Education Accounts: ${educationAccounts.length}
- Children/Education Mentioned in Notes: ${hasChildMention ? "Yes" : "No"}
- Client Notes: ${sanitizeForPrompt(notes.substring(0, 200), 200)}

Provide:
1. Status: action_needed | on_track | review
2. Score: 0-100
3. Summary: 1-2 sentences
4. 2-3 recommendations with priority, action, rationale

Respond with valid JSON only: {"status":"...","score":...,"summary":"...","recommendations":[{"priority":"...","action":"...","rationale":"..."}]}`;

    const educationAlerts = this.getAlertsByDomain(activeAlerts, "education");

    const aiResult = await generateAssessment(prompt);
    const result = this.parseAIResult(aiResult, "education", {
      educationAccounts: educationAccounts.length,
      educationBalance: `$${educationBalance.toLocaleString()}`,
      childrenMentioned: hasChildMention ? "Yes" : "No",
    });
    return this.applyAlertPenalty(result, educationAlerts);
  }

  private parseNarrative(aiResult: string): { summary: string; recommendations: Recommendation[] } {
    try {
      const cleaned = aiResult.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      return {
        summary: parsed.summary || "Assessment complete.",
        recommendations: recs.map((r: any) => ({
          priority: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
          action: r.action || "",
          rationale: r.rationale || "",
          estimatedImpact: r.estimatedImpact || r.estimated_impact,
          estimatedCost: r.estimatedCost || r.estimated_cost,
        })),
      };
    } catch (err) {
      logger.error({ err }, "Failed to parse narrative from AI response");
      return {
        summary: "Assessment complete. Please review the scoring factors for details.",
        recommendations: [],
      };
    }
  }

  private parseAIResult(
    aiResult: string,
    domain: PlanningDomain,
    keyMetrics: Record<string, any> = {}
  ): DomainAssessment {
    try {
      const cleaned = aiResult.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const normalizeStatus = (s: string): "action_needed" | "on_track" | "review" => {
        const lower = (s || "").toLowerCase().replace(/[_\s-]+/g, "_");
        if (/action|critical|needs|underfunded|underinsured|behind/.test(lower)) return "action_needed";
        if (/on_track|adequate|good|well|excellent|complete/.test(lower)) return "on_track";
        return "review";
      };

      return {
        domain,
        status: normalizeStatus(parsed.status),
        score: Math.max(0, Math.min(100, Number(parsed.score) || 50)),
        summary: parsed.summary || "Assessment complete.",
        keyMetrics,
        recommendations: (parsed.recommendations || []).map((r: any) => ({
          priority: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
          action: r.action || "",
          rationale: r.rationale || "",
          estimatedImpact: r.estimatedImpact || r.estimated_impact,
          estimatedCost: r.estimatedCost || r.estimated_cost,
        })),
        generatedAt: new Date(),
      };
    } catch (err) {
      logger.error({ err }, "Assessment analysis error");
      return {
        domain,
        status: "review",
        score: 50,
        summary: "Assessment analysis pending. Please regenerate.",
        keyMetrics,
        recommendations: [],
        generatedAt: new Date(),
      };
    }
  }

  private placeholderDomain(domain: PlanningDomain, summary: string, rec: Recommendation): DomainAssessment {
    return {
      domain,
      status: "review",
      score: 40,
      summary,
      keyMetrics: {},
      recommendations: [rec],
      generatedAt: new Date(),
    };
  }

  private generateExecutiveSummary(domains: DomainAssessment[], overallScore: number, clientName: string): string {
    const actionNeeded = domains.filter((d) => d.status === "action_needed");
    const onTrack = domains.filter((d) => d.status === "on_track");

    let summary = `Financial assessment for ${clientName} shows an overall health score of ${overallScore}/100. `;

    if (actionNeeded.length > 0) {
      summary += `${actionNeeded.length} area${actionNeeded.length > 1 ? "s" : ""} require${actionNeeded.length === 1 ? "s" : ""} attention: ${actionNeeded.map((d) => DOMAIN_LABELS[d.domain]).join(", ")}. `;
    }

    if (onTrack.length > 0) {
      summary += `${onTrack.length} area${onTrack.length > 1 ? "s are" : " is"} on track: ${onTrack.map((d) => DOMAIN_LABELS[d.domain]).join(", ")}. `;
    }

    const totalRecs = domains.reduce((s, d) => s + d.recommendations.length, 0);
    summary += `Review the ${totalRecs} recommendation${totalRecs !== 1 ? "s" : ""} below to optimize your financial strategy.`;

    return summary;
  }

  private async resolveSettings(advisorId: string, client: any): Promise<AssessmentSettings> {
    const defaults: AssessmentSettings = {
      retirementAge: 67,
      withdrawalRate: 4,
      insuranceMultiplier: 10,
      hnwThreshold: 1000000,
    };

    try {
      const advisorDefaults = await storage.getAdvisorAssessmentDefaults(advisorId);
      if (advisorDefaults) {
        defaults.retirementAge = advisorDefaults.retirementAge;
        defaults.withdrawalRate = parseFloat(String(advisorDefaults.withdrawalRate));
        defaults.insuranceMultiplier = advisorDefaults.insuranceMultiplier;
        defaults.hnwThreshold = parseFloat(String(advisorDefaults.hnwThreshold));
      }
    } catch (err) {
      logger.warn({ err }, "Failed to load advisor assessment defaults, using system defaults");
    }

    const overrides = client.assessmentOverrides as Record<string, any> | null;
    if (overrides) {
      if (typeof overrides.retirementAge === "number") defaults.retirementAge = overrides.retirementAge;
      if (typeof overrides.withdrawalRate === "number") defaults.withdrawalRate = overrides.withdrawalRate;
      if (typeof overrides.insuranceMultiplier === "number") defaults.insuranceMultiplier = overrides.insuranceMultiplier;
      if (typeof overrides.hnwThreshold === "number") defaults.hnwThreshold = overrides.hnwThreshold;
    }

    return defaults;
  }

  private getAlertsByDomain(activeAlerts: Alert[], domain: string): Alert[] {
    const domainAlertTypeMap: Record<string, string[]> = {
      retirement: ["rmd", "retirement", "pension", "401k", "ira"],
      estate: ["estate", "trust", "beneficiary", "will", "guardian", "power of attorney"],
      insurance: ["insurance", "coverage", "life insurance", "disability", "umbrella"],
      investment: ["rebalance", "concentration", "transaction", "drift", "allocation", "portfolio"],
      tax: ["tax", "rmd", "harvesting", "loss harvest", "conversion", "roth"],
      cashflow: ["transaction", "withdrawal", "cash", "liquidity", "cash_movement"],
      education: ["education", "529", "college", "coverdell"],
    };

    const relevantTypes = domainAlertTypeMap[domain] || [];

    return activeAlerts.filter((alert: Alert) => {
      const alertType = (alert.alertType || alert.type || "").toLowerCase();
      const title = (alert.title || "").toLowerCase();
      return relevantTypes.some(t => alertType.includes(t) || title.includes(t));
    });
  }

  private computeAlertPenaltyPreview(score: number, domainAlerts: Alert[]): { score: number; status: "action_needed" | "on_track" | "review"; penaltyFactors: string[] } {
    const penaltyFactors: string[] = [];
    let adjustedScore = score;
    let status = statusFromScore(score);

    if (domainAlerts.length === 0) {
      return { score: adjustedScore, status, penaltyFactors };
    }

    const hasCritical = domainAlerts.some((a: Alert) => a.severity === "critical" || a.severity === "high");
    const hasWarning = domainAlerts.some((a: Alert) => a.severity === "warning" || a.severity === "medium");

    if (hasCritical) {
      adjustedScore = Math.min(adjustedScore, 40);
      status = "action_needed";
      penaltyFactors.push(`${domainAlerts.filter((a: Alert) => a.severity === "critical" || a.severity === "high").length} critical/high alert(s) — score capped at 40`);
    } else if (hasWarning && status === "on_track") {
      status = "review";
      adjustedScore = Math.min(adjustedScore, 70);
      penaltyFactors.push(`${domainAlerts.filter((a: Alert) => a.severity === "warning" || a.severity === "medium").length} warning alert(s) — status downgraded to review`);
    }

    return { score: adjustedScore, status, penaltyFactors };
  }

  private applyAlertPenalty(assessment: DomainAssessment, domainAlerts: Alert[]): DomainAssessment {
    if (domainAlerts.length === 0) return assessment;

    const hasCritical = domainAlerts.some((a: Alert) => a.severity === "critical" || a.severity === "high");
    const hasWarning = domainAlerts.some((a: Alert) => a.severity === "warning" || a.severity === "medium");

    if (hasCritical) {
      assessment.score = Math.min(assessment.score, 40);
      assessment.status = "action_needed";
    } else if (hasWarning && assessment.status === "on_track") {
      assessment.status = "review";
      assessment.score = Math.min(assessment.score, 70);
    }

    return assessment;
  }

  private deriveInvestmentPolicyLimits(
    riskTolerance: string,
    overrides?: { investmentPolicyLimits?: any } | null
  ): { maxSinglePosition?: number; maxSectorConcentration?: number; prohibitedProducts?: string[]; maxEquityAllocation?: number; minFixedIncomeAllocation?: number } | undefined {
    const defaults: Record<string, { maxEquity: number; minFixed: number; maxSingle: number; maxSector: number }> = {
      "conservative": { maxEquity: 30, minFixed: 50, maxSingle: 10, maxSector: 25 },
      "moderate-conservative": { maxEquity: 40, minFixed: 40, maxSingle: 15, maxSector: 25 },
      "moderate": { maxEquity: 60, minFixed: 25, maxSingle: 20, maxSector: 30 },
      "moderate-aggressive": { maxEquity: 80, minFixed: 10, maxSingle: 20, maxSector: 35 },
      "aggressive": { maxEquity: 100, minFixed: 0, maxSingle: 25, maxSector: 40 },
    };

    const base = defaults[riskTolerance];
    if (!base) return undefined;

    const ipsOverrides = overrides?.investmentPolicyLimits;
    return {
      maxEquityAllocation: ipsOverrides?.maxEquityAllocation ?? base.maxEquity,
      minFixedIncomeAllocation: ipsOverrides?.minFixedIncomeAllocation ?? base.minFixed,
      maxSinglePosition: ipsOverrides?.maxSinglePosition ?? base.maxSingle,
      maxSectorConcentration: ipsOverrides?.maxSectorConcentration ?? base.maxSector,
      prohibitedProducts: ipsOverrides?.prohibitedProducts ?? undefined,
    };
  }

  private calculateAge(dateOfBirth: string): number | null {
    try {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
      return age;
    } catch {
      return null;
    }
  }
}
