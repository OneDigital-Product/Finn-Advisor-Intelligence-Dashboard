import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createValuationSchema = z.object({
  businessEntityId: z.string().optional(), clientId: z.string().optional(), advisorId: z.string().optional(),
  valuationDate: z.string().optional().default(() => new Date().toISOString().split("T")[0]),
  methodology: z.string().optional().default("dcf"), estimatedValue: z.string().optional().default("0"),
  assumptions: z.any().optional(), notes: z.string().nullable().optional(),
  businessName: z.string().optional(), industry: z.string().optional(), entityType: z.string().optional(),
  revenue: z.string().optional(), ebitda: z.string().optional(), netIncome: z.string().optional(),
  valuationMethod: z.string().optional(), multiple: z.string().optional(), discountRate: z.string().optional(),
  growthRate: z.string().optional(), projectedCashFlows: z.any().optional(),
  tangibleAssets: z.string().optional(), intangibleAssets: z.string().optional(),
  totalLiabilities: z.string().optional(), goodwill: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = createValuationSchema.parse(await request.json());
    const valuation = await storage.createBusinessValuation(body as any);
    return NextResponse.json(valuation);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
