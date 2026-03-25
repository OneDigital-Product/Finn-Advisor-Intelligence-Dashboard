import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { compareStrategies, type StrategyComparisonInput } from "@server/calculators/rmd-calculator";
import { logger } from "@server/lib/logger";

const strategyComparisonBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  accountBalance: z.coerce.number().min(0),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  assumedGrowthRate: z.coerce.number().min(-1).max(1),
  projectionYears: z.coerce.number().int().min(1).max(50),
  qcdAmount: z.coerce.number().min(0),
  marginalTaxRate: z.coerce.number().min(0).max(1),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(strategyComparisonBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: StrategyComparisonInput = {
      accountHolderDOB: data.accountHolderDOB,
      accountBalance: data.accountBalance,
      taxYear: data.taxYear,
      assumedGrowthRate: data.assumedGrowthRate,
      projectionYears: data.projectionYears,
      qcdAmount: data.qcdAmount,
      marginalTaxRate: data.marginalTaxRate,
    };
    const results = compareStrategies(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "rmd_strategy_comparison",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { mortalityTableUsed: "IRS Uniform Lifetime Table III" },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "rmd_strategy_comparison", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/rmd/compare-strategies error");
    return NextResponse.json({ error: "Failed to compare RMD strategies" }, { status: 400 });
  }
}
