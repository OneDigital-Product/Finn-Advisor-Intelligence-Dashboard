import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { BehavioralFinanceEngine } from "@server/engines/behavioral-finance";
import { logger } from "@server/lib/logger";

const engine = new BehavioralFinanceEngine();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id, meetingId } = await params;

    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
    if (meeting.clientId !== id) return NextResponse.json({ message: "Meeting does not belong to this client" }, { status: 400 });

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const analysisData = await engine.analyzeMeetingTranscript(meetingId, advisor.id);

    if (!analysisData) {
      return NextResponse.json({ message: "Meeting has no transcript or notes to analyze" }, { status: 400 });
    }

    const saved = await storage.createBehavioralAnalysis(analysisData);
    return NextResponse.json({ analysis: saved });
  } catch (err: any) {
    logger.error({ err: err }, "[Behavioral] Analyze meeting error:");
    return NextResponse.json({ message: "Analysis failed" }, { status: 500 });
  }
}
