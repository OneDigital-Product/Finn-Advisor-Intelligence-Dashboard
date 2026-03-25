import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { analyzeTranscriptWithConfig } from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { logger } from "@server/lib/logger";

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
    const clientId = id;
    const client = await storage.getClient(clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized for this client" }, { status: 403 });

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

    const clientName = `${client.firstName} ${client.lastName}`;
    const tcConfig = await storage.getActiveTranscriptConfig();

    let analysis: any;
    if (tcConfig) {
      analysis = await analyzeTranscriptWithConfig(tcConfig.analysisPrompt, sanitizePromptInput(transcriptText), clientName);
    } else {
      analysis = await analyzeTranscriptWithConfig("", sanitizePromptInput(transcriptText), clientName);
    }

    const now = new Date();
    const meeting = await storage.createMeeting({
      advisorId: advisor.id,
      clientId: client.id,
      title: analysis.title || `Meeting with ${clientName}`,
      startTime: now.toISOString(),
      endTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      type: analysis.type || "review",
      status: "completed",
      location: "Uploaded Transcript",
      notes: analysis.summary || "",
      transcriptRaw: transcriptText,
      transcriptSummary: analysis.summary || "",
    });

    if (analysis.actionItems && Array.isArray(analysis.actionItems)) {
      for (const item of analysis.actionItems) {
        await storage.createTask({
          advisorId: advisor.id,
          clientId: client.id,
          title: item.description || item.title || "Follow-up item",
          description: `From meeting: ${meeting.title}`,
          priority: item.priority || "medium",
          status: "pending",
          dueDate: item.dueDate || null,
        });
      }
    }

    await storage.createActivity({
      advisorId: advisor.id,
      clientId: client.id,
      type: "meeting",
      subject: `Meeting logged: ${meeting.title}`,
      description: analysis.summary || `Transcript-based meeting with ${clientName}`,
      date: now.toISOString().split("T")[0],
    });

    return NextResponse.json({ meeting, analysis });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
