import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { generateFinancialAssessment } from "@server/prompts/15-financial-assessment";
import { generateDirectIndexingAnalysis } from "@server/prompts/21-direct-indexing-analysis";
import { logger } from "@server/lib/logger";
import { z } from "zod";
import type {
  V33FinancialAssessmentInput,
  V33FinancialAssessmentResult,
  V33DirectIndexingInput,
  V33DirectIndexingResult,
} from "@server/prompts/types";

// ── 15-min in-memory cache ──
const analysisCache = new Map<string, { result: any; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function getCached(key: string): any | null {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    analysisCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: any): void {
  analysisCache.set(key, { result, expiry: Date.now() + CACHE_TTL });
}

const bodySchema = z.object({
  analysisType: z.enum(["full", "concentration", "tax-optimization"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { analysisType } = parsed.data;
    const cacheKey = `${id}:${analysisType}`;

    // Check cache
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ analysisType, result: cached, cached: true });
    }

    // Fetch supporting data
    const [monolithic, portfolioHoldings] = await Promise.all([
      storage.getClientMonolithic?.(id).catch(() => null),
      storage.getClientPortfolio?.(id).catch(() => null),
    ]);

    const clientData = { ...client, ...(monolithic || {}) };
    const age = clientData.age || clientData.dateOfBirth
      ? Math.floor((Date.now() - new Date(clientData.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 50;
    const totalAum = clientData.totalAum || clientData.aum || 0;

    if (analysisType === "full") {
      // Agent 15: Financial Assessment
      const input: V33FinancialAssessmentInput = {
        clientId: id,
        clientName: `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "Client",
        age,
        filingStatus: clientData.filingStatus || clientData.taxFilingStatus || "single",
        annualIncome: clientData.annualIncome || clientData.householdIncome || 0,
        annualExpenses: clientData.annualExpenses,
        totalAssets: totalAum,
        totalLiabilities: clientData.totalLiabilities,
        retirementAccounts: clientData.retirementAccounts,
        taxableAccounts: clientData.taxableAccounts,
        riskTolerance: clientData.riskTolerance || clientData.riskProfile || "moderate",
        currentInsurance: clientData.insurance || clientData.currentInsurance,
        estateDocuments: clientData.estateDocuments,
        financialGoals: clientData.financialGoals || clientData.goals,
      };

      const result: V33FinancialAssessmentResult = await generateFinancialAssessment(input);
      setCache(cacheKey, result);
      return NextResponse.json({ analysisType, result });
    }

    // Agent 21: Direct Indexing (concentration + tax-optimization)
    const portfolio = portfolioHoldings || {};
    const holdings = portfolio.holdings || [];

    // Build harvestable positions from holdings with unrealized losses
    const harvestable = holdings
      .filter((h: any) => (h.unrealizedGainLoss ?? h.gainLoss ?? 0) < 0)
      .sort((a: any, b: any) => (a.unrealizedGainLoss ?? a.gainLoss ?? 0) - (b.unrealizedGainLoss ?? b.gainLoss ?? 0))
      .slice(0, 20);

    const totalUnrealizedGain = holdings
      .filter((h: any) => (h.unrealizedGainLoss ?? h.gainLoss ?? 0) > 0)
      .reduce((sum: number, h: any) => sum + (h.unrealizedGainLoss ?? h.gainLoss ?? 0), 0);
    const totalUnrealizedLoss = Math.abs(
      holdings
        .filter((h: any) => (h.unrealizedGainLoss ?? h.gainLoss ?? 0) < 0)
        .reduce((sum: number, h: any) => sum + (h.unrealizedGainLoss ?? h.gainLoss ?? 0), 0)
    );

    const input: V33DirectIndexingInput = {
      clientId: id,
      clientName: `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "Client",
      totalUnrealizedGain,
      totalUnrealizedLoss,
      taxLotCount: holdings.length,
      harvestableCount: harvestable.length,
      totalHarvestableSavings: harvestable.reduce((s: number, h: any) => s + Math.abs(h.unrealizedGainLoss ?? h.gainLoss ?? 0) * 0.35, 0),
      washSaleTickersCount: 0,
      washSaleTickers: [],
      topHarvestable: harvestable.slice(0, 10).map((h: any) => ({
        ticker: h.ticker || h.symbol || "N/A",
        unrealizedLoss: Math.abs(h.unrealizedGainLoss ?? h.gainLoss ?? 0),
        potentialTaxSavings: Math.abs(h.unrealizedGainLoss ?? h.gainLoss ?? 0) * 0.35,
        washSaleRisk: false,
        holdingPeriod: "long_term",
      })),
    };

    const result: V33DirectIndexingResult = await generateDirectIndexingAnalysis(input);
    setCache(cacheKey, result);
    return NextResponse.json({ analysisType, result });
  } catch (err: any) {
    logger.error({ err }, "[PortfolioAnalysis] Generate error");
    return NextResponse.json(
      { error: "Failed to generate portfolio analysis. Please try again." },
      { status: 500 }
    );
  }
}
