import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateConcentratedStock, type ConcentratedStockInput } from "@server/calculators/concentrated-stock-calculator";
import { logger } from "@server/lib/logger";

const concentratedStockBodySchema = z.object({
  stockName: z.string().min(1),
  sharesOwned: z.coerce.number().min(1),
  currentPrice: z.coerce.number().min(0.01),
  costBasisPerShare: z.coerce.number().min(0),
  holdingPeriodMonths: z.coerce.number().int().min(0),
  totalPortfolioValue: z.coerce.number().min(0),
  targetAllocationPercent: z.coerce.number().min(0).max(100),
  annualDividendYield: z.coerce.number().min(0).max(1).optional(),
  expectedAnnualReturn: z.coerce.number().min(-0.5).max(0.5).optional(),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  ordinaryIncomeRate: z.coerce.number().min(0).max(0.5).optional(),
  stateCapGainsRate: z.coerce.number().min(0).max(0.15).optional(),
  sellYears: z.coerce.number().int().min(1).max(10).optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(concentratedStockBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: ConcentratedStockInput = {
      stockName: data.stockName,
      sharesOwned: data.sharesOwned,
      currentPrice: data.currentPrice,
      costBasisPerShare: data.costBasisPerShare,
      holdingPeriodMonths: data.holdingPeriodMonths,
      totalPortfolioValue: data.totalPortfolioValue,
      targetAllocationPercent: data.targetAllocationPercent,
      annualDividendYield: data.annualDividendYield,
      expectedAnnualReturn: data.expectedAnnualReturn ?? 0.08,
      filingStatus: data.filingStatus,
      ordinaryIncomeRate: data.ordinaryIncomeRate,
      stateCapGainsRate: data.stateCapGainsRate ?? 0,
      sellYears: data.sellYears ?? 3,
    };
    const results = calculateConcentratedStock(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "concentrated_stock",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { longTermCapGainsRate: 0.238, stateRate: data.stateCapGainsRate ?? 0 },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "concentrated_stock", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/concentrated-stock error");
    return NextResponse.json({ error: "Failed to calculate concentrated stock analysis" }, { status: 400 });
  }
}
