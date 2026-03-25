import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createTrustSchema = z.object({
  clientId: z.string(), advisorId: z.string(), trustType: z.string(), name: z.string(),
  status: z.string().optional(), fundedValue: z.string().optional(), dateEstablished: z.string().optional(),
  jurisdiction: z.string().optional(), termYears: z.number().optional(), section7520Rate: z.string().optional(),
  annuityRate: z.string().optional(), remainderBeneficiary: z.string().optional(),
  distributionSchedule: z.any().optional(), taxImplications: z.any().optional(), notes: z.string().optional(),
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
    const body = createTrustSchema.parse(await request.json());
    const hasAccess = await verifyClientAccess(auth.session, body.clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    const trust = await storage.createTrust(body);
    return NextResponse.json(trust);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
