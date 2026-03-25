import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateLTCPlanning, type LTCPlanningInput } from "@server/calculators/ltc-planning-calculator";
import { logger } from "@server/lib/logger";

const ltcPlanningBodySchema = z.object({
  clientAge: z.coerce.number().int().min(30).max(100),
  gender: z.enum(["male", "female"]),
  healthStatus: z.enum(["excellent", "good", "fair", "poor"]),
  liquidAssets: z.coerce.number().min(0),
  annualIncome: z.coerce.number().min(0),
  annualExpenses: z.coerce.number().min(0),
  existingLTCCoverage: z.coerce.number().min(0).optional(),
  spouseAge: z.coerce.number().int().min(20).max(100).optional(),
  spouseIncome: z.coerce.number().min(0).optional(),
  stateOfResidence: z.string().optional(),
  carePreference: z.enum(["nursing_home", "assisted_living", "home_care", "blended"]),
  projectionYears: z.coerce.number().int().min(1).max(50).optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(ltcPlanningBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: LTCPlanningInput = {
      clientAge: data.clientAge,
      gender: data.gender,
      healthStatus: data.healthStatus,
      liquidAssets: data.liquidAssets,
      annualIncome: data.annualIncome,
      annualExpenses: data.annualExpenses,
      existingLTCCoverage: data.existingLTCCoverage,
      spouseAge: data.spouseAge,
      spouseIncome: data.spouseIncome,
      stateOfResidence: data.stateOfResidence,
      carePreference: data.carePreference,
      projectionYears: data.projectionYears ?? 30,
    };
    const results = calculateLTCPlanning(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "ltc_planning",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { ltcCostInflation: 0.04, investmentReturn: 0.06, averageDuration: 3.0 },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "ltc_planning", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/ltc-planning error");
    return NextResponse.json({ error: "Failed to calculate LTC planning analysis" }, { status: 400 });
  }
}
