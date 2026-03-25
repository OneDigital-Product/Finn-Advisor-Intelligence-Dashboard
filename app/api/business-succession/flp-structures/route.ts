import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createFlpSchema = z.object({
  clientId: z.string(), advisorId: z.string().optional(), name: z.string(),
  totalValue: z.string().optional(), generalPartnerPct: z.string().optional(),
  limitedPartnerPct: z.string().optional(), lackOfControlDiscount: z.string().optional(),
  lackOfMarketabilityDiscount: z.string().optional(), combinedDiscount: z.string().optional(),
  discountedValue: z.string().optional(), ownershipDetails: z.any().optional(),
  status: z.string().optional(), dateEstablished: z.string().optional(), notes: z.string().optional(),
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
    const body = createFlpSchema.parse(await request.json()) as any;
    const hasAccess = await verifyClientAccess(auth.session, body.clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    body.advisorId = advisor.id;
    const flp = await storage.createFlpStructure(body as any);
    return NextResponse.json(flp);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
