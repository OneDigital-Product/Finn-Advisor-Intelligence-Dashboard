import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import {
  generateMeetingPrep,
} from "@server/openai";
import { getClientRelevantResearch, getResearchHighlightsForMeetingPrep } from "@server/engines/research-engine";
import { logger } from "@server/lib/logger";

export async function POST(
  request: Request, { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const meeting = await storage.getMeeting(id);
  if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  if (meeting.advisorId !== session.userId) return NextResponse.json({ message: "Access denied" }, { status: 403 });
  if (!meeting.clientId) return NextResponse.json({ message: "No client associated" }, { status: 400 });

  const client = await storage.getClient(meeting.clientId);
  if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });

  const [hlds, accts, tasks, recentMeetings, lifeEvts, compliance, prepConfig] = await Promise.all([
    storage.getHoldingsByClient(client.id),
    storage.getAccountsByClient(client.id),
    storage.getTasksByClient(client.id),
    storage.getMeetingsByClient(client.id),
    storage.getLifeEvents(client.id),
    storage.getComplianceItemsByClient(client.id),
    storage.getActiveMeetingPrepConfig(),
  ]);

  let perf: any[] = [];
  if (accts.length > 0 && accts[0].householdId) {
    perf = await storage.getPerformanceByHousehold(accts[0].householdId);
  }

  let researchHighlights = "";
  try {
    const relevantResearch = await getClientRelevantResearch(client.id);
    researchHighlights = getResearchHighlightsForMeetingPrep(relevantResearch);
  } catch (err) {
    // Research is optional; don't fail meeting prep if it errors
  }

  const prepBrief = await generateMeetingPrep({
    clientName: `${client.firstName} ${client.lastName}`,
    clientInfo: client,
    holdings: hlds,
    performance: perf,
    recentMeetings: recentMeetings.filter(m => m.status === "completed").slice(0, 3),
    tasks: tasks.filter(t => t.status !== "completed"),
    lifeEvents: lifeEvts,
    complianceItems: compliance,
    researchHighlights,
  }, prepConfig ? { systemPrompt: prepConfig.systemPrompt, userPromptTemplate: prepConfig.userPromptTemplate } : null);

  await storage.updateMeeting(meeting.id, { prepBrief });
  return NextResponse.json({ prepBrief });
} catch (err) {
    logger.error({ err }, "[meetings/[id]/prep] POST failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
