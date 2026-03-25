import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateBudget, type BudgetInput } from "@server/calculators/budget-calculator";
import { logger } from "@server/lib/logger";

const scenarioSchema = z.object({
  growthRate: z.coerce.number().min(-1).max(1),
  inflationRate: z.coerce.number().min(-1).max(1),
});

const budgetBodySchema = z.object({
  mode: z.enum(["pre_retirement", "post_retirement"]),
  currentAge: z.coerce.number().int().min(0).max(150),
  retirementAge: z.coerce.number().int().min(0).max(150).optional(),
  currentIncome: z.coerce.number().min(0).optional(),
  annualSavingsAmount: z.coerce.number().min(0).optional(),
  currentSavings: z.coerce.number().min(0).optional(),
  portfolioBalance: z.coerce.number().min(0).optional(),
  retirementIncome: z.object({
    socialSecurity: z.coerce.number().min(0),
    pension: z.coerce.number().min(0),
    dividends: z.coerce.number().min(0),
  }).optional(),
  expenses: z.record(z.string(), z.coerce.number()),
  projectionYears: z.coerce.number().int().min(1).max(100).optional(),
  scenarios: z.object({
    base: scenarioSchema,
    optimistic: scenarioSchema,
    conservative: scenarioSchema,
  }),
  clientId: z.string().optional(),
}).passthrough();

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(budgetBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;
    const { mode, expenses, scenarios, projectionYears, clientId, ...otherInputs } = data;

    const inputs: BudgetInput = {
      mode,
      expenses,
      scenarios,
      projectionYears: projectionYears || 30,
      clientId: clientId || undefined,
      ...otherInputs,
    };

    const results = calculateBudget(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "budget",
        clientId: clientId || null,
        advisorId: advisorId!,
        inputs,
        results,
        assumptions: {
          projectionYears: projectionYears || 30,
          scenarioRates: scenarios,
          healthcareInflationRate: 0.04,
        },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({
      id: run.id,
      calculatorType: "budget",
      inputs,
      results,
      assumptions: run.assumptions,
      createdAt: run.createdAt,
    }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/budget error");
    return NextResponse.json({ error: "Failed to calculate budget" }, { status: 400 });
  }
}
