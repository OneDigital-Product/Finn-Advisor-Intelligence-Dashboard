import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { sanitizeForPrompt, sanitizeObjectStrings } from "@server/openai";
import crypto from "crypto";
import {
  storage, logger, rateLimiter, timeoutManager, dispatchCassidyJob,
  AuditLogger, AuditEventType, cassidyRequestSchema,
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
    const parsed = cassidyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const {
      advisor_request, conversation_id, advisor_name, session_id,
      source, client_id, household_id, metadata, task_type,
      timestamp: reqTimestamp, client_context, callback_url, page_context,
    } = parsed.data;

    const job_id = crypto.randomUUID();
    const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `/api/cassidy/callback`;

    const payload = {
      advisor_request: sanitizePromptInput(sanitizeForPrompt(advisor_request, 10000)),
      conversation_id: conversation_id || crypto.randomUUID(),
      advisor_name: sanitizeForPrompt(advisor_name || "Advisor", 200),
      session_id: session_id || crypto.randomUUID(),
      source: source || "dashboard",
      client_id: client_id || null,
      household_id: household_id || null,
      metadata: sanitizeObjectStrings(metadata || {}),
      task_type,
      timestamp: reqTimestamp || new Date().toISOString(),
      client_context: sanitizeObjectStrings(client_context || {}),
      callback_url: callback_url || callbackBaseUrl,
      job_id,
      page_context: page_context || undefined,
    };

    await storage.db.insert(cassidyJobs).values({
      jobId: job_id,
      advisorId,
      clientId: client_id || null,
      householdId: household_id || null,
      taskType: task_type,
      status: "pending",
      requestPayload: payload,
    });

    timeoutManager.startTimeout(job_id);

    await AuditLogger.logEvent(job_id, AuditEventType.REQUEST_SENT, {
      advisor_id: advisorId,
      client_id: client_id || null,
      household_id: household_id || null,
      task_type,
      request_preview: advisor_request.substring(0, 200),
      source: source || "dashboard",
      timestamp: new Date().toISOString(),
    });

    await dispatchCassidyJob(job_id, payload, "Cassidy");

    return NextResponse.json(
      { job_id, status: "accepted", estimated_wait_ms: 5000 },
      { status: 202 }
    );
  } catch (err) {
    logger.error({ err }, "Error creating Cassidy request");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
