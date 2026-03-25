import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { getConversionAmountToMaximizeBracket, type BracketOptimizerInput } from "@server/calculators/roth-conversion-calculator";
import { logger } from "@server/lib/logger";

const bracketOptimizerBodySchema = z.object({
  annualIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  stateRate: z.coerce.number().min(0).max(0.15),
  traditionalIRABalance: z.coerce.number().min(0),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(bracketOptimizerBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: BracketOptimizerInput = {
      annualIncome: data.annualIncome,
      filingStatus: data.filingStatus,
      stateRate: data.stateRate,
      traditionalIRABalance: data.traditionalIRABalance,
    };
    const results = getConversionAmountToMaximizeBracket(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "roth_bracket_optimizer",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal" },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "roth_bracket_optimizer", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/roth/bracket-optimizer error");
    return NextResponse.json({ error: "Failed to optimize bracket" }, { status: 400 });
  }
}
