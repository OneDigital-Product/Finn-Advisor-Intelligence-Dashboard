import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const meeting = await storage.getMeeting(id);
    if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
    if (meeting.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    if (!meeting.clientId)
      return NextResponse.json({ error: "No client associated" }, { status: 400 });
    const client = await storage.getClient(meeting.clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const advisorData = await storage.getAdvisor(advisor.id);
    const rawContent = meeting.transcriptSummary || meeting.notes || "";
    if (!rawContent)
      return NextResponse.json(
        { error: "No meeting content to generate email from" },
        { status: 400 }
      );
    const content = sanitizePromptInput(rawContent);

    const { generateFollowUpEmail } = await import("@server/openai");
    const emailBody = await generateFollowUpEmail({
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email || "",
      meetingNotes: content,
      advisorName: advisorData?.name || "Your Advisor",
    });

    await storage.updateMeeting(meeting.id, { followUpEmail: emailBody });

    return NextResponse.json({
      success: true,
      email: {
        to: client.email || "",
        subject: `Follow-up: ${meeting.title}`,
        body: emailBody,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "[MeetingProcess] Email error");
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
