import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { generateDiscoveryTalkingPoints } from "@server/openai";
import { logger } from "@server/lib/logger";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const session = await storage.getDiscoverySession(id);
    if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (session.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    const talkingPoints = await generateDiscoveryTalkingPoints({
      prospectName: session.prospectName || "Client", clientType: session.clientType,
      questionnaireResponses: (session.questionnaireResponses as Record<string, unknown>) || {},
      wizardResponses: (session.wizardResponses as Record<string, unknown>) || {},
    });
    await storage.updateDiscoverySession(session.id, { talkingPoints });
    return NextResponse.json({ talkingPoints });
  } catch (err) {
    logger.error({ err: err }, "POST /api/discovery/sessions/:id/talking-points error:");
    return NextResponse.json({ message: "Failed to generate talking points" }, { status: 500 });
  }
}
