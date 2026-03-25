import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, clients, households } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { sanitizeForPrompt, sanitizeObjectStrings } from "@server/openai";
import crypto from "crypto";
import {
  storage, logger, rateLimiter, timeoutManager, dispatchCassidyJob,
  AuditLogger, AuditEventType, submitIntakeSchema,
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
    const parsed = submitIntakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { input } = parsed.data;

    if (input.client_id) {
      const client = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, input.client_id), eq(clients.advisorId, advisorId)))
        .limit(1);
      if (client.length === 0) {
        return NextResponse.json({ error: "Client not found or not authorized" }, { status: 403 });
      }
    }

    if (input.household_id) {
      const hh = await storage.db
        .select()
        .from(households)
        .where(and(eq(households.id, input.household_id), eq(households.advisorId, advisorId)))
        .limit(1);
      if (hh.length === 0) {
        return NextResponse.json({ error: "Household not found or not authorized" }, { status: 403 });
      }
    }

    const job_id = crypto.randomUUID();
    const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `/api/cassidy/callback`;

    const payload = {
      job_id,
      task_type: "intake_extraction",
      callback_url: callbackBaseUrl,
      input: {
        input_id: input.input_id || crypto.randomUUID(),
        input_type: input.input_type,
        client_id: input.client_id,
        household_id: input.household_id || null,
        advisor_id: advisorId,
        raw_text: sanitizePromptInput(sanitizeForPrompt(input.raw_text, 20000)),
        source_metadata: {
          meeting_date: input.meeting_date || null,
          related_entities: sanitizeObjectStrings(input.related_entities || []),
        },
      },
      agent: {
        name: "intake_agent",
        version: "1.0",
      },
    };

    await storage.db.insert(cassidyJobs).values({
      jobId: job_id,
      advisorId,
      clientId: input.client_id || null,
      householdId: input.household_id || null,
      taskType: "intake_extraction",
      status: "pending",
      requestPayload: payload,
    });

    timeoutManager.startTimeout(job_id);

    await AuditLogger.logEvent(job_id, AuditEventType.REQUEST_SENT, {
      advisor_id: advisorId,
      client_id: input.client_id || null,
      household_id: input.household_id || null,
      task_type: "intake_extraction",
      input_type: input.input_type,
      request_preview: input.raw_text.substring(0, 200),
      source: "dashboard",
      timestamp: new Date().toISOString(),
    });

    await dispatchCassidyJob(job_id, payload, "Cassidy intake");

    return NextResponse.json(
      { job_id, status: "accepted", estimated_wait_ms: 5000 },
      { status: 202 }
    );
  } catch (err) {
    logger.error({ err }, "Error creating intake request");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
