import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, clients, households, candidateFacts } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import {
  storage, logger, rateLimiter, timeoutManager, dispatchCassidyJob,
  AuditLogger, AuditEventType, submitProfileDraftSchema,
} from "@server/routes/cassidy/shared";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;

    const limitCheck = rateLimiter.checkLimit(advisorId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retry_after_seconds: limitCheck.retryAfterSeconds, limit_type: limitCheck.limitType },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = submitProfileDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { client_id, household_id, profile_mode } = parsed.data;

    const client = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found or not authorized" }, { status: 403 });
    }

    if (household_id) {
      const hh = await storage.db
        .select()
        .from(households)
        .where(and(eq(households.id, household_id), eq(households.advisorId, advisorId)))
        .limit(1);
      if (hh.length === 0) {
        return NextResponse.json({ error: "Household not found or not authorized" }, { status: 403 });
      }
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

    if (approvedFacts.length === 0) {
      return NextResponse.json(
        { error: "No approved facts found. Please complete the review process first." },
        { status: 400 }
      );
    }

    const job_id = crypto.randomUUID();
    const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `/api/cassidy/callback`;

    const payload = {
      job_id,
      task_type: "investor_profile_draft",
      callback_url: callbackBaseUrl,
      input: {
        job_id,
        client_id,
        household_id: household_id || null,
        advisor_id: advisorId,
        profile_mode,
        approved_facts: approvedFacts.map((f) => ({
          fact_type: f.factType,
          fact_label: f.factLabel,
          fact_value: f.factValue,
          normalized_value: f.normalizedValue,
          confidence: f.confidence,
          source_snippet: f.sourceSnippet,
        })),
      },
      agent: {
        name: "investor_profile_agent",
        version: "1.0",
      },
    };

    await storage.db.insert(cassidyJobs).values({
      jobId: job_id,
      advisorId,
      clientId: client_id,
      householdId: household_id || null,
      taskType: "investor_profile_draft",
      status: "pending",
      requestPayload: payload,
    });

    timeoutManager.startTimeout(job_id);

    await AuditLogger.logEvent(job_id, AuditEventType.REQUEST_SENT, {
      advisor_id: advisorId,
      client_id,
      household_id: household_id || null,
      task_type: "investor_profile_draft",
      profile_mode,
      approved_facts_count: approvedFacts.length,
      source: "dashboard",
      timestamp: new Date().toISOString(),
    });

    await dispatchCassidyJob(job_id, payload, "Cassidy profile draft");

    return NextResponse.json(
      { job_id, status: "accepted", approved_facts_count: approvedFacts.length, estimated_wait_ms: 8000 },
      { status: 202 }
    );
  } catch (err) {
    logger.error({ err }, "Error creating profile draft request");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
