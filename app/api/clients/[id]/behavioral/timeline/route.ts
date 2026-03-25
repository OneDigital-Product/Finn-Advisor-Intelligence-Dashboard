import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const analyses = await storage.getBehavioralAnalysesByClient(id);
    const timeline = analyses.map((a) => ({
      id: a.id,
      date: a.createdAt,
      sentiment: a.sentiment,
      sentimentScore: a.sentimentScore,
      behavioralRiskScore: a.behavioralRiskScore,
      anxietyLevel: a.anxietyLevel,
      dominantBias: a.dominantBias,
      sourceType: a.sourceType,
      coachingNotes: a.coachingNotes,
    }));

    return NextResponse.json({ timeline });
  } catch (err: any) {
    logger.error({ err: err }, "[Behavioral] Timeline error:");
    return NextResponse.json({ message: "Failed to get timeline" }, { status: 500 });
  }
}
