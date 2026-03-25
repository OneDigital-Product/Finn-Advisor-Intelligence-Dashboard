import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateSessionSchema = z.object({
  questionnaireId: z.string().nullable().optional(), questionnaireResponses: z.record(z.unknown()).optional(),
  wizardResponses: z.record(z.unknown()).optional(), currentSection: z.number().optional(),
  status: z.string().optional(), prospectName: z.string().nullable().optional(),
  prospectEmail: z.string().nullable().optional(), clientId: z.string().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const session = await storage.getDiscoverySession(id);
    if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (session.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    return NextResponse.json(session);
  } catch (err) {
    logger.error({ err: err }, "GET /api/discovery/sessions/:id error:");
    return NextResponse.json({ message: "Failed to fetch session" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const existing = await storage.getDiscoverySession(id);
    if (!existing) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    const body = updateSessionSchema.parse(await request.json());
    if (body.clientId) {
      const client = await storage.getClient(body.clientId);
      if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized to use this client" }, { status: 403 });
    }
    if (body.questionnaireId) {
      const q = await storage.getDiscoveryQuestionnaire(body.questionnaireId);
      if (!q || q.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized to use this questionnaire" }, { status: 403 });
    }
    const session = await storage.updateDiscoverySession(id, body);
    if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    return NextResponse.json(session);
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ message: err.errors[0].message }, { status: 400 });
    logger.error({ err: err }, "PATCH /api/discovery/sessions/:id error:");
    return NextResponse.json({ message: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const existing = await storage.getDiscoverySession(id);
    if (!existing) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    await storage.deleteDiscoverySession(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err: err }, "DELETE /api/discovery/sessions/:id error:");
    return NextResponse.json({ message: "Failed to delete session" }, { status: 500 });
  }
}
