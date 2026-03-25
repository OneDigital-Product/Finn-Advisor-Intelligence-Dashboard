import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { computeFullValuation } from "@server/lib/valuation-engine";
import { logger } from "@server/lib/logger";

const schema = z.object({
  revenue: z.number().min(0).optional().default(0), ebitda: z.number().min(0),
  growthRate: z.number().min(0).max(1).optional().default(0.05), discountRate: z.number().min(0).max(1).optional().default(0.10),
  industry: z.string().optional(), projectionYears: z.number().min(1).max(20).optional().default(5),
  tangibleAssets: z.number().optional(), intangibleAssets: z.number().optional(),
  totalLiabilities: z.number().optional(), goodwill: z.number().optional(),
  customMultiples: z.object({ evToEbitda: z.number().optional(), evToRevenue: z.number().optional() }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = schema.parse(await request.json());
    const result = computeFullValuation(body as any);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
