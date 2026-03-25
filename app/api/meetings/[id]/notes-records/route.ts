import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const meeting = await storage.getMeeting(id);
    if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
    if (meeting.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const notes = await storage.getMeetingNotesByMeeting(id);
    return NextResponse.json(notes);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "Failed to fetch meeting notes" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const meeting = await storage.getMeeting(id);
    if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
    if (meeting.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { noteText } = body;
    if (!noteText || typeof noteText !== "string") {
      return NextResponse.json({ message: "noteText is required" }, { status: 400 });
    }

    let summary: string | null = null;
    let actionItems: string[] = [];
    try {
      const { extractActionItems } = await import("../../../../../server/openai");
      const clientName = meeting.clientId
        ? await storage.getClient(meeting.clientId).then(c => c ? `${c.firstName} ${c.lastName}` : "Client")
        : "Client";
      const aiResult = await extractActionItems(noteText, clientName);
      if (typeof aiResult === "string") {
        summary = aiResult;
      } else if (aiResult && typeof aiResult === "object") {
        const resultObj = aiResult as Record<string, unknown>;
        summary = typeof resultObj.summary === "string" ? resultObj.summary : null;
        actionItems = Array.isArray(resultObj.actionItems) ? resultObj.actionItems.filter((i): i is string => typeof i === "string") : [];
      }
    } catch {
    }

    const note = await storage.createMeetingNote({
      meetingId: meeting.id,
      advisorId: advisor.id,
      noteText,
      summary,
      actionItems,
    });

    if (actionItems.length > 0 && meeting.clientId) {
      try {
        for (const item of actionItems) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);
          await storage.createTask({
            advisorId: advisor.id,
            clientId: meeting.clientId,
            meetingId: meeting.id,
            title: item,
            description: `Action item from meeting notes: ${meeting.title}`,
            dueDate: dueDate.toISOString().split("T")[0],
            priority: "medium",
            status: "pending",
            type: "follow_up",
          });
        }
      } catch (taskErr) {
        logger.warn({ err: taskErr }, "Failed to create tasks from action items");
      }
    }

    return NextResponse.json(note);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "Failed to create meeting note" }, { status: 500 });
  }
}
