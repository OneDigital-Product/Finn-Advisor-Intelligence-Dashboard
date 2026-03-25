import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const clientId = id;
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const goals = await storage.getFinancialGoalsByClient(clientId);
    const accounts = await storage.getAccountsByClient(clientId);

    const allHoldings = [];
    for (const account of accounts) {
      const h = await storage.getHoldingsByAccount(account.id);
      allHoldings.push(...h.map(holding => ({ ...holding, accountId: account.id })));
    }

    const totalPortfolio = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

    const cashTickers = ["CASH", "SPAXX", "FDRXX", "VMFXX", "SWVXX", "BIL", "SHV", "SGOV"];
    const bondTickers = ["AGG", "BND", "VBTLX", "TLT", "IEF", "LQD", "HYG", "MUB", "TIP", "VCIT", "VCSH", "BSV"];
    const equityTickers = ["SPY", "VOO", "VTI", "QQQ", "IWM", "VEA", "VWO", "EFA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"];

    let cashValue = 0;
    let bondValue = 0;
    let equityValue = 0;

    for (const holding of allHoldings) {
      const mv = parseFloat(holding.marketValue);
      const ticker = holding.ticker.toUpperCase();
      const sector = (holding.sector || "").toLowerCase();

      if (cashTickers.includes(ticker) || sector === "cash" || sector === "money market") {
        cashValue += mv;
      } else if (bondTickers.includes(ticker) || sector === "fixed income" || sector === "bonds" || ticker.includes("BOND")) {
        bondValue += mv;
      } else {
        equityValue += mv;
      }
    }

    const totalHoldings = cashValue + bondValue + equityValue;
    const unallocatedCash = Math.max(0, totalPortfolio - totalHoldings);
    cashValue += unallocatedCash;

    const bucket1Target = goals.filter(g => g.bucket === 1).reduce((s, g) => s + parseFloat(g.targetAmount), 0);
    const bucket2Target = goals.filter(g => g.bucket === 2).reduce((s, g) => s + parseFloat(g.targetAmount), 0);
    const bucket3Target = goals.filter(g => g.bucket === 3).reduce((s, g) => s + parseFloat(g.targetAmount), 0);
    const totalTarget = bucket1Target + bucket2Target + bucket3Target;

    const suggestions: string[] = [];
    const bucket1Pct = totalPortfolio > 0 ? (cashValue / totalPortfolio) * 100 : 0;
    const bucket2Pct = totalPortfolio > 0 ? (bondValue / totalPortfolio) * 100 : 0;
    const bucket3Pct = totalPortfolio > 0 ? (equityValue / totalPortfolio) * 100 : 0;

    const bucket1TargetPct = totalTarget > 0 ? (bucket1Target / totalTarget) * 100 : 15;
    const bucket2TargetPct = totalTarget > 0 ? (bucket2Target / totalTarget) * 100 : 35;
    const bucket3TargetPct = totalTarget > 0 ? (bucket3Target / totalTarget) * 100 : 50;

    if (Math.abs(bucket1Pct - bucket1TargetPct) > 5) {
      suggestions.push(bucket1Pct > bucket1TargetPct
        ? `Bucket 1 (Cash) is overweight by ${(bucket1Pct - bucket1TargetPct).toFixed(1)}%. Consider moving funds to growth buckets.`
        : `Bucket 1 (Cash) is underweight by ${(bucket1TargetPct - bucket1Pct).toFixed(1)}%. Consider increasing cash reserves for near-term needs.`);
    }
    if (Math.abs(bucket2Pct - bucket2TargetPct) > 5) {
      suggestions.push(bucket2Pct > bucket2TargetPct
        ? `Bucket 2 (Bonds) is overweight by ${(bucket2Pct - bucket2TargetPct).toFixed(1)}%. Consider rebalancing to equities for growth.`
        : `Bucket 2 (Bonds) is underweight by ${(bucket2TargetPct - bucket2Pct).toFixed(1)}%. Consider adding intermediate-term bond allocations.`);
    }
    if (Math.abs(bucket3Pct - bucket3TargetPct) > 5) {
      suggestions.push(bucket3Pct > bucket3TargetPct
        ? `Bucket 3 (Growth) is overweight by ${(bucket3Pct - bucket3TargetPct).toFixed(1)}%. Consider de-risking to protect near-term goals.`
        : `Bucket 3 (Growth) is underweight by ${(bucket3TargetPct - bucket3Pct).toFixed(1)}%. Consider increasing equity exposure for long-term goals.`);
    }

    const aggregateFundedRatio = totalTarget > 0 ? Math.min(100, (totalPortfolio / totalTarget) * 100) : (totalPortfolio > 0 ? 100 : 0);

    return NextResponse.json({
      totalPortfolio,
      buckets: [
        {
          id: 1,
          name: "Cash & Short-Term",
          description: "1-2 year needs",
          currentValue: cashValue,
          targetValue: bucket1Target,
          currentPct: bucket1Pct,
          targetPct: bucket1TargetPct,
          fundedRatio: bucket1Target > 0 ? Math.min(100, (cashValue / bucket1Target) * 100) : (cashValue > 0 ? 100 : 0),
        },
        {
          id: 2,
          name: "Bonds & Intermediate",
          description: "3-7 year needs",
          currentValue: bondValue,
          targetValue: bucket2Target,
          currentPct: bucket2Pct,
          targetPct: bucket2TargetPct,
          fundedRatio: bucket2Target > 0 ? Math.min(100, (bondValue / bucket2Target) * 100) : (bondValue > 0 ? 100 : 0),
        },
        {
          id: 3,
          name: "Equities & Growth",
          description: "8+ year needs",
          currentValue: equityValue,
          targetValue: bucket3Target,
          currentPct: bucket3Pct,
          targetPct: bucket3TargetPct,
          fundedRatio: bucket3Target > 0 ? Math.min(100, (equityValue / bucket3Target) * 100) : (equityValue > 0 ? 100 : 0),
        },
      ],
      aggregateFundedRatio,
      suggestions,
      goalsCount: goals.length,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
