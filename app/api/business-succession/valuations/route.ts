import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createValuationSchema = z.object({
  businessEntityId: z.string().optional(), clientId: z.string().optional(), advisorId: z.string().optional(),
  valuationDate: z.string().optional(), methodology: z.string().optional(), estimatedValue: z.string().optional(),
  assumptions: z.any().optional(), notes: z.string().nullable().optional(),
  businessName: z.string().optional(), industry: z.string().optional(), entityType: z.string().optional(),
  revenue: z.string().optional(), ebitda: z.string().optional(), netIncome: z.string().optional(),
  valuationMethod: z.string().optional(), multiple: z.string().optional(), discountRate: z.string().optional(),
  growthRate: z.string().optional(), projectedCashFlows: z.any().optional(),
  tangibleAssets: z.string().optional(), intangibleAssets: z.string().optional(),
  totalLiabilities: z.string().optional(), goodwill: z.string().optional(),
});

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(session);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const body = createValuationSchema.parse(await request.json()) as any;
    const clientId = body.clientId;
    if (!clientId) return NextResponse.json({ message: "clientId is required" }, { status: 400 });
    const hasAccess = await verifyClientAccess(auth.session, clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    body.advisorId = advisor.id;
    const valuation = await storage.createBusinessValuation(body as any);
    return NextResponse.json(valuation);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
