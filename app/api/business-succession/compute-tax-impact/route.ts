import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { computeTaxImpact } from "@server/lib/valuation-engine";
import { logger } from "@server/lib/logger";

const schema = z.object({
  totalValue: z.number().min(0), discountedValue: z.number().min(0),
  transferAmount: z.number().min(0).optional().default(0),
  transferType: z.enum(["gift", "estate", "both"]).optional().default("gift"),
  annualExclusionRecipients: z.number().min(0).optional().default(0),
  priorGiftsUsed: z.number().min(0).optional().default(0),
  isGstApplicable: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = schema.parse(await request.json());
    const result = computeTaxImpact(body as any);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
