import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { summarizeTranscript } from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { logger } from "@server/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const meeting = await storage.getMeeting(id);
    if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
    if (meeting.advisorId !== session.userId) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    // Handle multipart form data or JSON body
    let transcriptText = "";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("text") as string | null;

      if (file) {
        const buffer = await file.arrayBuffer();
        transcriptText = new TextDecoder("utf-8").decode(buffer);
      } else if (text) {
        transcriptText = text;
      } else {
        return NextResponse.json({ message: "No transcript file or text provided" }, { status: 400 });
      }
    } else {
      const body = await request.json();
      if (body.text) {
        transcriptText = body.text;
      } else {
        return NextResponse.json({ message: "No transcript file or text provided" }, { status: 400 });
      }
    }

    if (transcriptText.length > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "Text exceeds 10MB limit" }, { status: 400 });
    }

    if (transcriptText.includes("WEBVTT")) {
      transcriptText = transcriptText
        .replace(/WEBVTT\n\n/g, "")
        .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/g, "")
        .replace(/^\d+\n/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    let clientName = "Unknown Client";
    if (meeting.clientId) {
      const client = await storage.getClient(meeting.clientId);
      if (client) clientName = `${client.firstName} ${client.lastName}`;
    }

    const summary = await summarizeTranscript(sanitizePromptInput(transcriptText), clientName);

    const updated = await storage.updateMeeting(id, {
      transcriptRaw: transcriptText,
      transcriptSummary: summary,
      notes: meeting.notes
        ? `${meeting.notes}\n\n---\n\n### Transcript Summary\n${summary}`
        : `### Transcript Summary\n${summary}`,
    });

    return NextResponse.json({ meeting: updated, summary });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
