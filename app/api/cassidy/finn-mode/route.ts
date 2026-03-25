import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { CASSIDY_SUBROUTER_URL, VALID_FINN_MODES } from "@server/lib/cassidy";
import { callSubAgentRouter } from "@server/integrations/cassidy/webhook-client";
import { sanitizeForPrompt } from "@server/openai";
import { chatCompletion } from "@server/ai-core";
import crypto from "crypto";
import {
  storage, logger, rateLimiter, AuditLogger, AuditEventType, validateBody,
} from "@server/routes/cassidy/shared";
import { z } from "zod";

const finnModeSchema = z.object({
  message: z.string().min(1, "message is required"),
  selected_mode: z.enum(
    VALID_FINN_MODES.filter((m) => m !== "conversation") as [string, ...string[]],
    {
      errorMap: () => ({
        message: `selected_mode must be one of: ${VALID_FINN_MODES.filter((m) => m !== "conversation").join(", ")}`,
      }),
    }
  ),
  client_name: z.string().optional(),
  conversation_id: z.string().optional(),
  client_id: z.string().nullable().optional(),
  page_context: z
    .object({
      route: z.string(),
      section: z.string(),
      clientId: z.string().nullable(),
      clientName: z.string().nullable(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;

    const limitCheck = rateLimiter.checkLimit(advisorId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retry_after_seconds: limitCheck.retryAfterSeconds,
          limit_type: limitCheck.limitType,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = finnModeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const { message, selected_mode, client_name, conversation_id, client_id, page_context } =
      parsed.data;

    const apiKey = process.env.CASSIDY_API_KEY;
    const cassidyAvailable = !!(apiKey && CASSIDY_SUBROUTER_URL);

    const job_id = crypto.randomUUID();

    const payload = {
      job_id,
      advisor_request: sanitizePromptInput(sanitizeForPrompt(message, 10000)),
      selected_mode,
      client_name: client_name ? sanitizeForPrompt(client_name, 200) : undefined,
      conversation_id: conversation_id || crypto.randomUUID(),
      source: "copilot",
      timestamp: new Date().toISOString(),
      page_context: page_context || undefined,
    };

    await storage.db.insert(cassidyJobs).values({
      jobId: job_id,
      advisorId,
      clientId: client_id || null,
      householdId: null,
      taskType: `finn_mode_${selected_mode}`,
      status: "pending",
      requestPayload: payload,
    });

    await AuditLogger.logEvent(job_id, AuditEventType.REQUEST_SENT, {
      advisor_id: advisorId,
      task_type: `finn_mode_${selected_mode}`,
      selected_mode,
      request_preview: message.substring(0, 200),
      source: "copilot",
      timestamp: new Date().toISOString(),
    });

    let finResponse: string | undefined;
    let resolvedMode = selected_mode;
    let source = "sub_agent_router";
    let suggestedPrompts: string[] = [];

    if (cassidyAvailable) {
      let result;
      try {
        result = await callSubAgentRouter(payload, apiKey!, CASSIDY_SUBROUTER_URL);
      } catch (err) {
        logger.warn(
          { err, jobId: job_id, mode: selected_mode },
          "Sub-agent router call failed, trying OpenAI fallback"
        );
        result = null;
      }

      if (result) {
        finResponse = result.finResponse || result.fin_response;
        const calledMode = result.calledMode || result.called_mode;

        if (!finResponse || typeof finResponse !== "string" || finResponse.trim().length === 0) {
          logger.warn(
            { jobId: job_id, mode: selected_mode, responseKeys: Object.keys(result) },
            "Sub-agent router returned invalid response, trying OpenAI fallback"
          );
          finResponse = undefined;
        } else {
          if (!calledMode || typeof calledMode !== "string") {
            logger.warn(
              { jobId: job_id, mode: selected_mode },
              "Sub-agent router response missing calledMode, using requested mode"
            );
          }
          resolvedMode = calledMode || selected_mode;
          source = result.source || "sub_agent_router";
          suggestedPrompts = result.suggested_prompts || [];
        }
      }
    }

    if (!finResponse) {
      try {
        logger.info({ jobId: job_id, mode: selected_mode }, "Using OpenAI fallback for finn-mode");
        const modeInstructions: Record<string, string> = {
          email: "Draft a professional email based on the advisor's request.",
          cheat_sheet: "Create a concise cheat sheet or quick-reference summary.",
          pdf: "Generate a well-structured document suitable for PDF export.",
          brand: "Help with branding, messaging, or marketing content.",
          builder: "Help build or structure a plan, workflow, or process.",
        };
        let systemPrompt =
          "You are Finn, an AI copilot for financial advisors. Be concise, professional, and actionable.";
        systemPrompt += `\n\nMode: ${selected_mode}. ${modeInstructions[selected_mode] || "Assist the advisor with their request."}`;
        if (page_context) {
          systemPrompt += `\n\nThe advisor is currently viewing: ${page_context.section || page_context.route || "Dashboard"}.`;
          if (page_context.clientId)
            systemPrompt += ` Client ID: ${page_context.clientId}.`;
          if (page_context.clientName)
            systemPrompt += ` Client name: ${page_context.clientName}.`;
        }
        if (client_name) systemPrompt += `\n\nClient name: ${client_name}`;
        finResponse = await chatCompletion(systemPrompt, message, true, 2048);
        source = "openai_fallback";
        resolvedMode = selected_mode;
      } catch (fallbackErr) {
        logger.error(
          { err: fallbackErr, jobId: job_id, mode: selected_mode },
          "OpenAI fallback also failed for finn-mode"
        );
        await storage.db
          .update(cassidyJobs)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(cassidyJobs.jobId, job_id));

        return NextResponse.json(
          { error: "Unable to process your request right now. Please try again.", job_id },
          { status: 502 }
        );
      }
    }

    const responsePayload = {
      fin_response: finResponse,
      called_mode: resolvedMode,
      source,
      suggested_prompts: suggestedPrompts,
    };

    await storage.db
      .update(cassidyJobs)
      .set({
        status: "completed",
        responsePayload,
        calledAgent: `finn_${resolvedMode}`,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cassidyJobs.jobId, job_id));

    await AuditLogger.logEvent(job_id, AuditEventType.CALLBACK_RECEIVED, {
      called_mode: resolvedMode,
      source,
      response_length: finResponse.length,
      inline_result: true,
      timestamp: new Date().toISOString(),
    });

    logger.info({ jobId: job_id, calledMode: resolvedMode, source }, "Finn mode result processed");

    return NextResponse.json({
      job_id,
      status: "completed",
      fin_response: finResponse,
      called_mode: resolvedMode,
      source,
      suggested_prompts: suggestedPrompts,
    });
  } catch (err) {
    logger.error({ err }, "Error processing finn-mode request");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
