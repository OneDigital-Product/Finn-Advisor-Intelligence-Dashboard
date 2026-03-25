import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateTrustSchema = z.object({
  name: z.string().optional(), status: z.string().optional(), fundedValue: z.string().optional(),
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = updateTrustSchema.parse(await request.json());
    const existing = await storage.getTrust(id);
    if (!existing) return NextResponse.json({ message: "Trust not found" }, { status: 404 });
    const hasAccess = await verifyClientAccess(auth.session, existing.clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    const trust = await storage.updateTrust(id, body);
    return NextResponse.json(trust);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await storage.getTrust(id);
    if (!existing) return NextResponse.json({ message: "Trust not found" }, { status: 404 });
    const hasAccess = await verifyClientAccess(auth.session, existing.clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    await storage.deleteTrust(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
