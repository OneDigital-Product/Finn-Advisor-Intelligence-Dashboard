import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { computeFlpDiscountTiered } from "@server/lib/valuation-engine";
import { logger } from "@server/lib/logger";

const schema = z.object({
  totalValue: z.number().min(0), lpInterestPercent: z.number().min(0).max(100),
  entityType: z.string().optional(), lackOfControlDiscount: z.number().min(0).max(1).optional(),
  lackOfMarketabilityDiscount: z.number().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = schema.parse(await request.json());
    const result = computeFlpDiscountTiered(body as any);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
