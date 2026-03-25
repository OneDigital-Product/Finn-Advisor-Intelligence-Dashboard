import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { computeEstateTax, computeSunsetComparison, type EstateTaxInput } from "@server/engines/estate-tax-engine";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const schema = z.object({
      totalEstateValue: z.number(), maritalDeduction: z.number().optional().default(0),
      charitableDeduction: z.number().optional().default(0), lifetimeGiftsUsed: z.number().optional().default(0),
      isMarried: z.boolean().optional().default(false), spouseExemptionPortability: z.number().optional().default(0),
    });
    const body = schema.parse(await request.json());
    const input: EstateTaxInput = {
      totalEstateValue: body.totalEstateValue, maritalDeduction: body.maritalDeduction,
      charitableDeduction: body.charitableDeduction, lifetimeGiftsUsed: body.lifetimeGiftsUsed,
      isMarried: body.isMarried, spouseExemptionPortability: body.spouseExemptionPortability,
    };
    const estateTax = computeEstateTax(input);
    const sunsetComparison = computeSunsetComparison(input);
    return NextResponse.json({ estateTax, sunsetComparison });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
