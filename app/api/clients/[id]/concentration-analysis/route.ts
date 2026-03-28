import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { generateDirectIndexingAnalysis } from "@server/prompts/21-direct-indexing-analysis";
import { logger } from "@server/lib/logger";
import type { V33DirectIndexingInput } from "@server/prompts/types";

export async function POST(
  _request: NextRequest,
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

    // Fetch portfolio holdings
    const portfolio = await storage.getClientPortfolio?.(id).catch(() => null);
    const holdings = portfolio?.holdings || [];
    const accounts = portfolio?.accounts || [];

    if (holdings.length === 0) {
      return NextResponse.json({
        concentrationData: [],
        overlapMatrix: [],
        sectorConcentration: [],
        aiAnalysis: null,
        message: "No holdings data available for concentration analysis.",
      });
    }

    // ── Deterministic Computation ──

    // 1. Roll up holdings by security across all accounts
    const securityMap = new Map<string, { ticker: string; name: string; totalValue: number; fundCount: number; accounts: Set<string> }>();
    const totalPortfolioValue = holdings.reduce((sum: number, h: any) => sum + (parseFloat(h.marketValue) || 0), 0);

    for (const h of holdings) {
      const ticker = (h.ticker || h.symbol || "UNKNOWN").toUpperCase();
      const value = parseFloat(h.marketValue) || 0;
      const accountId = h.accountId || h.portfolioId || "default";

      if (securityMap.has(ticker)) {
        const entry = securityMap.get(ticker)!;
        entry.totalValue += value;
        entry.accounts.add(accountId);
        entry.fundCount = entry.accounts.size;
      } else {
        securityMap.set(ticker, {
          ticker,
          name: h.description || h.name || ticker,
          totalValue: value,
          fundCount: 1,
          accounts: new Set([accountId]),
        });
      }
    }

    // 2. Top 10 securities by weight
    const concentrationData = Array.from(securityMap.values())
      .map(s => ({
        ticker: s.ticker,
        name: s.name,
        totalValue: s.totalValue,
        weight: totalPortfolioValue > 0 ? (s.totalValue / totalPortfolioValue) * 100 : 0,
        fundCount: s.fundCount,
        flag: totalPortfolioValue > 0
          ? (s.totalValue / totalPortfolioValue) > 0.15 ? "red" as const
            : (s.totalValue / totalPortfolioValue) > 0.10 ? "yellow" as const
            : "green" as const
          : "green" as const,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    // 3. Sector concentration
    const sectorMap = new Map<string, number>();
    for (const h of holdings) {
      const sector = h.sector || h.assetClass || "Other";
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + (parseFloat(h.marketValue) || 0));
    }
    const sectorConcentration = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        weight: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
        flag: totalPortfolioValue > 0 && (value / totalPortfolioValue) > 0.25 ? "amber" as const : "normal" as const,
      }))
      .sort((a, b) => b.weight - a.weight);

    // 4. Fund-to-fund overlap matrix
    const accountHoldings = new Map<string, Set<string>>();
    for (const h of holdings) {
      const accountId = h.accountId || h.portfolioId || "default";
      const ticker = (h.ticker || h.symbol || "").toUpperCase();
      if (!accountHoldings.has(accountId)) accountHoldings.set(accountId, new Set());
      accountHoldings.get(accountId)!.add(ticker);
    }

    const accountIds = Array.from(accountHoldings.keys());
    const overlapMatrix: { account1: string; account2: string; overlapPct: number; sharedCount: number }[] = [];

    for (let i = 0; i < accountIds.length; i++) {
      for (let j = i + 1; j < accountIds.length; j++) {
        const set1 = accountHoldings.get(accountIds[i])!;
        const set2 = accountHoldings.get(accountIds[j])!;
        const intersection = new Set([...set1].filter(t => set2.has(t)));
        const union = new Set([...set1, ...set2]);
        const overlapPct = union.size > 0 ? (intersection.size / union.size) * 100 : 0;

        // Get account names
        const acct1 = accounts.find((a: any) => a.id === accountIds[i] || a.accountId === accountIds[i]);
        const acct2 = accounts.find((a: any) => a.id === accountIds[j] || a.accountId === accountIds[j]);

        overlapMatrix.push({
          account1: acct1?.name || acct1?.accountType || accountIds[i],
          account2: acct2?.name || acct2?.accountType || accountIds[j],
          overlapPct: Math.round(overlapPct * 10) / 10,
          sharedCount: intersection.size,
        });
      }
    }

    // ── AI Interpretation via Agent 21 ──
    const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client";
    const totalUnrealizedGain = holdings
      .filter((h: any) => (h.unrealizedGainLoss ?? h.gainLoss ?? 0) > 0)
      .reduce((sum: number, h: any) => sum + (h.unrealizedGainLoss ?? h.gainLoss ?? 0), 0);
    const totalUnrealizedLoss = Math.abs(
      holdings
        .filter((h: any) => (h.unrealizedGainLoss ?? h.gainLoss ?? 0) < 0)
        .reduce((sum: number, h: any) => sum + (h.unrealizedGainLoss ?? h.gainLoss ?? 0), 0)
    );

    const aiInput: V33DirectIndexingInput = {
      clientId: id,
      clientName,
      totalUnrealizedGain,
      totalUnrealizedLoss,
      taxLotCount: holdings.length,
      harvestableCount: holdings.filter((h: any) => (h.unrealizedGainLoss ?? h.gainLoss ?? 0) < 0).length,
      totalHarvestableSavings: totalUnrealizedLoss * 0.35,
      washSaleTickersCount: 0,
      topHarvestable: concentrationData.slice(0, 5).map(c => ({
        ticker: c.ticker,
        unrealizedLoss: 0,
        potentialTaxSavings: 0,
        washSaleRisk: false,
        holdingPeriod: "long_term",
      })),
    };

    let aiAnalysis = null;
    try {
      aiAnalysis = await generateDirectIndexingAnalysis(aiInput);
    } catch (err) {
      logger.warn({ err }, "[ConcentrationAnalysis] AI analysis failed, returning deterministic only");
    }

    return NextResponse.json({
      concentrationData,
      overlapMatrix,
      sectorConcentration,
      aiAnalysis,
      totalPortfolioValue,
      holdingCount: holdings.length,
      accountCount: accountIds.length,
    });
  } catch (err: any) {
    logger.error({ err }, "[ConcentrationAnalysis] Error");
    return NextResponse.json(
      { error: "Failed to generate concentration analysis." },
      { status: 500 }
    );
  }
}
