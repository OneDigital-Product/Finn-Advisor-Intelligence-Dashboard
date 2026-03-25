import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, clients, candidateFacts, meetings, calculatorRuns } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import crypto from "crypto";
import {
  storage, logger, rateLimiter, timeoutManager, dispatchCassidyJob,
  AuditLogger, AuditEventType, generateReportSchema,
} from "@server/routes/cassidy/shared";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = generateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { report_type, advisor_instruction, client_id, meeting_id } = parsed.data;

    const limitCheck = rateLimiter.checkLimit(advisorId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retry_after_seconds: limitCheck.retryAfterSeconds, limit_type: limitCheck.limitType },
        { status: 429 }
      );
    }

    const [client] = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client not found or not authorized" }, { status: 404 });
    }

    const approvedFacts = await storage.db
      .select()
      .from(candidateFacts)
      .where(
        and(
          eq(candidateFacts.clientId, client_id),
          inArray(candidateFacts.status, ["approved", "edited"]),
        ),
      );

    let meetingSummary: string | null = null;
    if (meeting_id) {
      const [meeting] = await storage.db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, meeting_id), eq(meetings.advisorId, advisorId)))
        .limit(1);
      if (meeting) {
        meetingSummary = meeting.transcriptSummary || meeting.notes || null;
      }
    } else {
      const recentMeetings = await storage.db
        .select()
        .from(meetings)
        .where(and(eq(meetings.clientId, client_id), eq(meetings.advisorId, advisorId)))
        .orderBy(desc(meetings.updatedAt))
        .limit(1);
      if (recentMeetings.length > 0) {
        meetingSummary = recentMeetings[0].transcriptSummary || recentMeetings[0].notes || null;
      }
    }

    let calculatorResults: Array<{ calculator_type: string; results: unknown }> | null = null;
    const recentCalcRuns = await storage.db
      .select()
      .from(calculatorRuns)
      .where(eq(calculatorRuns.clientId, client_id))
      .orderBy(desc(calculatorRuns.createdAt))
      .limit(3);
    if (recentCalcRuns.length > 0) {
      calculatorResults = recentCalcRuns.map((r) => ({
        calculator_type: r.calculatorType,
        results: r.results,
      }));
    }

    const clientContext = {
      name: `${client.firstName} ${client.lastName}`,
      employment_status: client.occupation || "unknown",
      risk_tolerance: (client as Record<string, unknown>).riskTolerance || "unknown",
      age: client.dateOfBirth
        ? Math.floor((Date.now() - new Date(client.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
    };

    const jobId = crypto.randomUUID();
    const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `/api/cassidy/callback`;

    const payload = {
      job_id: jobId,
      task_type: "report_generation",
      callback_url: callbackBaseUrl,
      input: {
        job_id: jobId,
        client_id,
        advisor_id: advisorId,
        report_type,
        advisor_instruction,
        client_context: clientContext,
        approved_facts: approvedFacts.map((f) => ({
          fact_type: f.factType,
          fact_label: f.factLabel,
          fact_value: f.factValue,
          confidence: f.confidence,
        })),
        calculator_results: calculatorResults,
        meeting_summary: meetingSummary,
        template_definition: null,
        knowledge_constraints: null,
      },
      agent: {
        name: "report_writer_agent",
        version: "1.0",
      },
    };

    await storage.db.insert(cassidyJobs).values({
      jobId,
      advisorId,
      clientId: client_id,
      householdId: null,
      taskType: "report_generation",
      status: "pending",
      requestPayload: payload,
    });

    timeoutManager.startTimeout(jobId);

    await dispatchCassidyJob(jobId, payload, "Report generation");

    await AuditLogger.logEvent(jobId, AuditEventType.REQUEST_SENT, {
      task_type: "report_generation",
      report_type,
      client_id,
      approved_facts_count: approvedFacts.length,
      has_meeting_summary: !!meetingSummary,
      has_calculator_results: !!calculatorResults,
    });

    return NextResponse.json(
      { job_id: jobId, status: "generating", estimated_duration_ms: 7000 },
      { status: 202 }
    );
  } catch (err) {
    logger.error({ err }, "Report generation error");
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
