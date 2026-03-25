import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateMilestoneSchema = z.object({
  title: z.string().optional(), description: z.string().nullable().optional(), category: z.string().optional(),
  targetDate: z.string().nullable().optional(), status: z.string().optional(),
  completedDate: z.string().optional().nullable(), sortOrder: z.number().optional(), notes: z.string().optional(),
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
    const body = updateMilestoneSchema.parse(await request.json());
    const existing = await storage.getExitMilestone(id);
    if (!existing) return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    const hasAccess = await verifyClientAccess(auth.session, existing.clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    const result = await storage.updateExitMilestone(id, body as any);
    return NextResponse.json(result);
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
    const existing = await storage.getExitMilestone(id);
    if (!existing) return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    const hasAccess = await verifyClientAccess(auth.session, existing.clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    await storage.deleteExitMilestone(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
