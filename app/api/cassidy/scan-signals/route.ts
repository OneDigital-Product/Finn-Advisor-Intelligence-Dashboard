import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, clients, detectedSignals, meetings } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";
import crypto from "crypto";
import {
  storage, logger, timeoutManager, dispatchCassidyJob,
  AuditLogger, AuditEventType, scanSignalsSchema,
} from "@server/routes/cassidy/shared";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = scanSignalsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { meetingId, clientId } = parsed.data;

    const [meeting] = await storage.db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.advisorId, advisorId)))
      .limit(1);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.clientId !== clientId) {
      return NextResponse.json({ error: "Meeting does not belong to the specified client" }, { status: 400 });
    }

    if (!meeting.transcriptRaw && !meeting.transcriptSummary && !meeting.notes) {
      return NextResponse.json(
        { error: "Meeting must have a transcript, summary, or notes to scan for signals" },
        { status: 400 }
      );
    }

    const [client] = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const priorSignals = await storage.db
      .select()
      .from(detectedSignals)
      .where(and(
        eq(detectedSignals.clientId, clientId),
        eq(detectedSignals.advisorId, advisorId),
        gte(detectedSignals.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
      ));

    const job_id = crypto.randomUUID();
    const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `/api/cassidy/callback`;

    const payload = {
      advisor_request: "Scan meeting for life events, material changes, and workflow triggers",
      conversation_id: crypto.randomUUID(),
      advisor_name: "Advisor",
      session_id: crypto.randomUUID(),
      source: "dashboard",
      client_id: clientId,
      task_type: "signal_detection",
      timestamp: new Date().toISOString(),
      callback_url: callbackBaseUrl,
      job_id,
      client_context: {},
      metadata: { meetingId, clientId, advisorId },
      input: {
        meeting_id: meetingId,
        client_id: clientId,
        advisor_id: advisorId,
        transcript_text: meeting.transcriptRaw || null,
        meeting_summary: meeting.transcriptSummary || null,
        meeting_notes: meeting.notes || null,
        prior_signals: priorSignals.map((s) => ({
          signal_type: s.signalType,
          detected_date: s.createdAt?.toISOString(),
          status: s.status,
        })),
      },
    };

    await storage.db.insert(cassidyJobs).values({
      jobId: job_id,
      advisorId,
      clientId,
      taskType: "signal_detection",
      status: "pending",
      requestPayload: payload,
    });

    timeoutManager.startTimeout(job_id);

    await AuditLogger.logEvent(job_id, AuditEventType.REQUEST_SENT, {
      advisor_id: advisorId,
      client_id: clientId,
      task_type: "signal_detection",
      meeting_id: meetingId,
      timestamp: new Date().toISOString(),
    });

    await dispatchCassidyJob(job_id, payload, "Signal detection");

    logger.info({ jobId: job_id, meetingId, clientId }, "Signal detection scan initiated");
    return NextResponse.json({ job_id, status: "scanning" }, { status: 202 });
  } catch (err) {
    logger.error({ err }, "Error initiating signal scan");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
