import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateRothConversion, validateRothConversionInput, type RothConversionInput } from "@server/calculators/roth-conversion-calculator";
import { logger } from "@server/lib/logger";

const rothConversionBodySchema = z.object({
  currentAge: z.coerce.number().int().min(18).max(100),
  retirementAge: z.coerce.number().int().min(50).max(100),
  traditionalIRABalance: z.coerce.number().min(0),
  rothIRABalance: z.coerce.number().min(0),
  annualIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  stateRate: z.coerce.number().min(0).max(0.15),
  expectedRetirementRate: z.coerce.number().min(0).max(0.50),
  conversionAmount: z.coerce.number().min(0),
  projectionYears: z.coerce.number().int().min(1).max(40).optional(),
  expectedGrowthRate: z.coerce.number().min(-0.10).max(0.20).optional(),
  nonDeductibleIRABalance: z.coerce.number().min(0).optional(),
  state: z.string().min(2).max(2).optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(rothConversionBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: RothConversionInput = {
      currentAge: data.currentAge,
      retirementAge: data.retirementAge,
      traditionalIRABalance: data.traditionalIRABalance,
      rothIRABalance: data.rothIRABalance,
      annualIncome: data.annualIncome,
      filingStatus: data.filingStatus,
      stateRate: data.stateRate,
      expectedRetirementRate: data.expectedRetirementRate,
      conversionAmount: data.conversionAmount,
      projectionYears: data.projectionYears || 20,
      expectedGrowthRate: data.expectedGrowthRate ?? 0.07,
      ...(data.nonDeductibleIRABalance !== undefined && { nonDeductibleIRABalance: data.nonDeductibleIRABalance }),
      ...(data.state !== undefined && { state: data.state }),
    };

    const validationErrors = validateRothConversionInput(inputs);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: validationErrors }, { status: 400 });
    }

    const results = calculateRothConversion(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "roth_conversion",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal", stateRate: data.stateRate },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "roth_conversion", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/roth-conversion error");
    return NextResponse.json({ error: "Failed to calculate Roth conversion" }, { status: 400 });
  }
}
