import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createSessionSchema = z.object({
  clientId: z.string().nullable().optional(), questionnaireId: z.string().nullable().optional(),
  clientType: z.string().min(1), prospectName: z.string().nullable().optional(),
  prospectEmail: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const sessions = await storage.getDiscoverySessions(advisor.id);
    return NextResponse.json(sessions);
  } catch (err) {
    logger.error({ err: err }, "GET /api/discovery/sessions error:");
    return NextResponse.json({ message: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const body = createSessionSchema.parse(await request.json());
    if (body.clientId) {
      const client = await storage.getClient(body.clientId);
      if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized to use this client" }, { status: 403 });
    }
    if (body.questionnaireId) {
      const q = await storage.getDiscoveryQuestionnaire(body.questionnaireId);
      if (!q || q.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized to use this questionnaire" }, { status: 403 });
    }
    const session = await storage.createDiscoverySession({
      advisorId: advisor.id, clientId: body.clientId || null,
      questionnaireId: body.questionnaireId || null, clientType: body.clientType,
      prospectName: body.prospectName || null, prospectEmail: body.prospectEmail || null,
      status: "draft",
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ message: err.errors[0].message }, { status: 400 });
    logger.error({ err: err }, "POST /api/discovery/sessions error:");
    return NextResponse.json({ message: "Failed to create session" }, { status: 500 });
  }
}
