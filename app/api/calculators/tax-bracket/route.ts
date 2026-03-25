import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateTaxBracket, type TaxBracketInput } from "@server/calculators/tax-bracket-calculator";
import { logger } from "@server/lib/logger";

const taxBracketBodySchema = z.object({
  grossIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  deductions: z.coerce.number().min(0),
  additionalIncome: z.coerce.number().min(0),
  stateRate: z.coerce.number().min(0).max(0.15),
  projectionYears: z.coerce.number().int().min(1).max(30).optional(),
  expectedIncomeGrowth: z.coerce.number().min(-0.10).max(0.20).optional(),
  expectedBracketInflation: z.coerce.number().min(0).max(0.10).optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(taxBracketBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: TaxBracketInput = {
      grossIncome: data.grossIncome,
      filingStatus: data.filingStatus,
      deductions: data.deductions,
      additionalIncome: data.additionalIncome,
      stateRate: data.stateRate,
      projectionYears: data.projectionYears || 10,
      expectedIncomeGrowth: data.expectedIncomeGrowth ?? 0.03,
      expectedBracketInflation: data.expectedBracketInflation ?? 0.02,
    };

    const results = calculateTaxBracket(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "tax_bracket",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal", standardDeductionApplied: data.deductions === 0 },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "tax_bracket", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/tax-bracket error");
    return NextResponse.json({ error: "Failed to calculate tax bracket" }, { status: 400 });
  }
}
