import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { computeGRATAnalysis } from "@server/engines/estate-tax-engine";
import type { Trust } from "@shared/schema";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const schema = z.object({
      fundedValue: z.number(), termYears: z.number().min(1).max(30),
      section7520Rate: z.number().min(0).max(0.2),
      annuityRate: z.number().min(0).max(1).optional(),
      assumedGrowthRate: z.number().min(0).max(0.5).optional().default(0.07),
    });
    const body = schema.parse(await request.json());
    const mockTrust = {
      fundedValue: String(body.fundedValue), termYears: body.termYears,
      section7520Rate: String(body.section7520Rate),
      annuityRate: body.annuityRate ? String(body.annuityRate) : undefined,
      trustType: "GRAT",
    } as Trust;
    const analysis = computeGRATAnalysis(mockTrust, body.assumedGrowthRate);
    return NextResponse.json(analysis);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
