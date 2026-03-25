import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { calculateCharitableTaxImpact, type CharitableTaxInput } from "@server/calculators/charitable-tax-calculator";

const charitableTaxInputSchema = z.object({
  agi: z.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  contributions: z.array(z.object({
    amount: z.number().min(0),
    type: z.enum(["cash_public", "appreciated_property", "private_foundation"]),
  })),
  priorCarryforward: z.array(z.object({
    year: z.number(),
    amount: z.number(),
    type: z.string(),
    expiresYear: z.number(),
  })).optional(),
  rmdAmount: z.number().optional(),
  age: z.number().optional(),
  standardDeductionOverride: z.number().optional(),
  section7520Rate: z.number().optional(),
  crtFundedValue: z.number().optional(),
  crtPayoutRate: z.number().optional(),
  crtTermYears: z.number().optional(),
  crtType: z.enum(["CRAT", "CRUT"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = charitableTaxInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const result = calculateCharitableTaxImpact(parsed.data as CharitableTaxInput);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
