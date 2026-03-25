import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateQuestionnaireSchema = z.object({
  name: z.string().min(1).optional(), clientType: z.string().min(1).optional(),
  sections: z.array(z.any()).optional(), isActive: z.boolean().optional(),
}).partial();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const questionnaire = await storage.getDiscoveryQuestionnaire(id);
    if (!questionnaire) return NextResponse.json({ message: "Questionnaire not found" }, { status: 404 });
    if (questionnaire.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    return NextResponse.json(questionnaire);
  } catch (err) {
    logger.error({ err: err }, "GET /api/discovery/questionnaires/:id error:");
    return NextResponse.json({ message: "Failed to fetch questionnaire" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const existing = await storage.getDiscoveryQuestionnaire(id);
    if (!existing) return NextResponse.json({ message: "Questionnaire not found" }, { status: 404 });
    if (existing.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    const body = updateQuestionnaireSchema.parse(await request.json());
    const questionnaire = await storage.updateDiscoveryQuestionnaire(id, body);
    if (!questionnaire) return NextResponse.json({ message: "Questionnaire not found" }, { status: 404 });
    return NextResponse.json(questionnaire);
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ message: err.errors[0].message }, { status: 400 });
    logger.error({ err: err }, "PATCH /api/discovery/questionnaires/:id error:");
    return NextResponse.json({ message: "Failed to update questionnaire" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const existing = await storage.getDiscoveryQuestionnaire(id);
    if (!existing) return NextResponse.json({ message: "Questionnaire not found" }, { status: 404 });
    if (existing.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    await storage.deleteDiscoveryQuestionnaire(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err: err }, "DELETE /api/discovery/questionnaires/:id error:");
    return NextResponse.json({ message: "Failed to delete questionnaire" }, { status: 500 });
  }
}
