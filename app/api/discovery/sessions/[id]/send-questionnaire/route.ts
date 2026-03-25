import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const sendQuestionnaireSchema = z.object({ email: z.string().email(), message: z.string().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const session = await storage.getDiscoverySession(id);
    if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (session.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    const body = sendQuestionnaireSchema.parse(await request.json());
    await storage.updateDiscoverySession(session.id, { prospectEmail: body.email, status: "questionnaire_sent" });
    await storage.createActivity({
      advisorId: advisor.id, clientId: session.clientId || null, type: "email",
      subject: `Discovery questionnaire sent to ${body.email}`,
      description: body.message || `Pre-meeting questionnaire sent for ${session.prospectName || 'prospect'}`,
      date: new Date().toISOString().split("T")[0],
    });
    return NextResponse.json({ success: true, message: `Questionnaire sent to ${body.email}`, sessionStatus: "questionnaire_sent" });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ message: err.errors[0].message }, { status: 400 });
    logger.error({ err: err }, "POST /api/discovery/sessions/:id/send-questionnaire error:");
    return NextResponse.json({ message: "Failed to send questionnaire" }, { status: 500 });
  }
}
