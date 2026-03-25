import { storage } from "../../storage";
import { cassidyJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { RateLimiter } from "../../integrations/cassidy/rate-limiter";
import { callCassidyWorkflow } from "../../integrations/cassidy/webhook-client";
import { jobEventBus } from "../../integrations/cassidy/event-bus";
import { timeoutManager } from "../../integrations/cassidy/timeout-manager";
import { AuditLogger, AuditEventType } from "../../integrations/cassidy/audit-logger";
import { chat as cassidyChat } from "../../lib/cassidy";
import { chatCompletion } from "../../ai-core";
import { logger } from "../../lib/logger";
import { validateBody } from "../../lib/validation";
import { requireAuth } from "../middleware";
import { z } from "zod";

export { storage, logger, AuditLogger, AuditEventType, jobEventBus, timeoutManager, callCassidyWorkflow, validateBody, requireAuth };

export const rateLimiter = new RateLimiter();

export const VALID_SOURCES = ["dashboard", "email", "mobile", "api", "copilot"] as const;
export const VALID_TASK_TYPES = ["query", "analysis", "report", "recommendation", "compliance_check", "intake_extraction", "investor_profile_draft", "signal_detection", "report_generation"] as const;
export const VALID_INPUT_TYPES_CONST = ["transcript", "summary", "dictation", "notes", "crm_note", "jumpai", "email"] as const;

export const cassidyRequestSchema = z.object({
  advisor_request: z.string().min(1, "advisor_request is required"),
  conversation_id: z.string().uuid("conversation_id must be a valid UUID"),
  advisor_name: z.string().optional(),
  session_id: z.string().optional(),
  source: z.enum(VALID_SOURCES, { errorMap: () => ({ message: `source must be one of: ${VALID_SOURCES.join(", ")}` }) }),
  client_id: z.string().nullable().optional(),
  household_id: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  task_type: z.enum(VALID_TASK_TYPES, { errorMap: () => ({ message: `task_type must be one of: ${VALID_TASK_TYPES.join(", ")}` }) }),
  timestamp: z.string().optional(),
  client_context: z.record(z.unknown()).optional(),
  callback_url: z.string().optional(),
  page_context: z.object({
    route: z.string(),
    section: z.string(),
    clientId: z.string().nullable(),
    clientName: z.string().nullable(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.source !== "copilot" && !data.advisor_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "advisor_name is required", path: ["advisor_name"] });
  }
});

export const submitIntakeSchema = z.object({
  input: z.object({
    raw_text: z.string().min(50, "raw_text must be at least 50 characters"),
    input_type: z.enum(VALID_INPUT_TYPES_CONST, { errorMap: () => ({ message: `input_type must be one of: ${VALID_INPUT_TYPES_CONST.join(", ")}` }) }),
    client_id: z.string().min(1, "client_id is required"),
    household_id: z.string().nullable().optional(),
    input_id: z.string().optional(),
    meeting_date: z.string().nullable().optional(),
    related_entities: z.array(z.unknown()).optional(),
  }),
});

export const resultRenderedSchema = z.object({
  job_id: z.string().min(1, "job_id is required"),
  viewed_tabs: z.union([z.array(z.string()), z.string()]).optional(),
});

export const submitProfileDraftSchema = z.object({
  client_id: z.string().min(1, "client_id is required"),
  household_id: z.string().nullable().optional(),
  profile_mode: z.enum(["individual", "legal_entity"], { errorMap: () => ({ message: "profile_mode must be 'individual' or 'legal_entity'" }) }),
});

export const profileCommitSchema = z.object({
  job_id: z.string().min(1, "job_id is required"),
  client_id: z.string().min(1, "client_id is required"),
  profile_mode: z.enum(["individual", "legal_entity"], { errorMap: () => ({ message: "profile_mode must be 'individual' or 'legal_entity'" }) }),
  answer_actions: z.array(z.object({
    question_id: z.string(),
    action: z.string(),
    custom_answer: z.unknown().optional(),
    reasoning: z.string().optional(),
  })),
});

export const factReviewActionSchema = z.object({
  fact_index: z.number().int().min(0),
  action: z.enum(["approve", "edit", "reject"]),
  fact_value: z.string().optional(),
  normalized_value: z.unknown().optional(),
  editor_note: z.string().optional(),
});

export const completeFactReviewSchema = z.object({
  job_id: z.string().uuid("job_id must be a valid UUID"),
  actions: z.array(factReviewActionSchema),
});

export const scanSignalsSchema = z.object({
  meetingId: z.string().min(1, "meetingId is required"),
  clientId: z.string().min(1, "clientId is required"),
});

export const updateSignalStatusSchema = z.object({
  status: z.enum(["actioned", "dismissed", "pending"]),
});

export const signalActionSchema = z.object({
  action_type: z.string().min(1, "action_type is required"),
});

export const VALID_REPORT_TYPES = [
  "meeting_summary", "planning_summary", "client_recap", "internal_note",
  "narrative", "case_consulting", "strategic_recs", "financial_plan_summary",
] as const;

export const generateReportSchema = z.object({
  report_type: z.enum(VALID_REPORT_TYPES, { errorMap: () => ({ message: "Invalid report type" }) }),
  advisor_instruction: z.string().min(50, "Instruction must be at least 50 characters").max(500, "Instruction must be at most 500 characters"),
  client_id: z.string().min(1, "client_id is required"),
  meeting_id: z.string().optional(),
});

export const updateReportDraftSchema = z.object({
  status: z.enum(["draft", "reviewed"]).optional(),
  edits: z.string().max(50000, "Edits must be under 50,000 characters").optional(),
});

export const saveVersionSchema = z.object({
  edits: z.string().min(1, "Draft text cannot be empty").max(50000, "Draft text exceeds maximum length"),
  edit_summary: z.string().max(500, "Edit summary must be under 500 characters").optional(),
});

export const conversationTurnSchema = z.object({
  client_id: z.string().optional(),
  role: z.enum(["advisor", "fin"], { errorMap: () => ({ message: "Role must be 'advisor' or 'fin'" }) }),
  content: z.string().min(1, "content is required"),
  job_id: z.string().optional(),
  suggested_prompts: z.unknown().optional(),
  execution_time_ms: z.number().optional(),
  parent_turn_id: z.string().optional(),
});

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface AuditEvent {
  eventType: string;
  event_type?: string;
  eventData?: Record<string, unknown>;
  event_data?: Record<string, unknown>;
  timestamp?: string | Date;
}

export function getEventLabel(type: string): string {
  const labels: Record<string, string> = {
    request_sent: "Request sent",
    routing_decision: "Routed to agent",
    agent_called: "Agent processing",
    agent_responded: "Agent completed",
    synthesis_complete: "Synthesis done",
    callback_received: "Results received",
    result_rendered: "Results viewed",
  };
  return labels[type] || type;
}

export function formatEventDetail(event: AuditEvent): string {
  const data = event.eventData || event.event_data;
  switch (event.eventType || event.event_type) {
    case "request_sent":
      return `Task: ${(data as Record<string, unknown>)?.task_type || "unknown"}`;
    case "routing_decision":
      return `Agent: ${(data as Record<string, unknown>)?.primary_agent || "unknown"}`;
    case "callback_received":
      return `Length: ${(data as Record<string, unknown>)?.response_length || "?"} chars`;
    case "result_rendered":
      return `Tabs: ${((data as Record<string, unknown>)?.viewed_tabs as string[] || []).join(", ") || "summary"}`;
    default:
      return "";
  }
}

export function getEventActor(type: string): string {
  if (type === "request_sent" || type === "result_rendered") return "advisor";
  return "cassidy";
}

export function normalizeV2Response(raw: Record<string, any>): Record<string, any> {
  const output = raw.output || raw;
  const isV2 = output.structured === true || output.finResponse !== undefined || output.calledAgent !== undefined;
  if (!isV2) return raw;

  const suggestedPrompts = Array.isArray(output.suggestedPrompts)
    ? output.suggestedPrompts.map((p: any) =>
        typeof p === "string" ? p : (p.prompt || p.title || String(p))
      )
    : [];

  return {
    ...raw,
    fin_response: output.finResponse || raw.fin_response,
    fin_report: output.finReport || raw.fin_report,
    suggested_prompts: suggestedPrompts.length > 0 ? suggestedPrompts : raw.suggested_prompts,
    called_agent: output.calledAgent || raw.called_agent,
    review_required: output.reviewRequired ?? raw.review_required ?? false,
    documents: output.documents || raw.documents || [],
    agent_trace: raw.agent_trace || (output.trace ? {
      routing_decision: output.trace.routingContext || "",
      primary_agent: output.calledAgent || "",
      secondary_agents: [],
      context: {
        intent: output.trace.routingContext || "",
        client_segment: "",
        recommended_next_steps: suggestedPrompts,
        warnings: output.trace.warnings || "",
      },
    } : undefined),
    suggested_prompt_objects: Array.isArray(output.suggestedPrompts)
      ? output.suggestedPrompts.filter((p: any) => typeof p === "object" && p.title)
      : [],
  };
}

export async function dispatchCassidyJob(
  jobId: string,
  payload: Record<string, unknown>,
  errorLabel: string,
): Promise<void> {
  const webhookUrl =
    process.env.CASSIDY_ORCHESTRATION_WEBHOOK_URL ||
    process.env.CASSIDY_WEBHOOK_URL;
  const apiKey = process.env.CASSIDY_API_KEY;

  if (webhookUrl && apiKey) {
    callCassidyWorkflow(payload, apiKey, webhookUrl)
      .then(async (result: any) => {
        const isInlineResult = result.structured === true || result.finResponse !== undefined;

        if (isInlineResult) {
          const normalized = normalizeV2Response(result);
          const responsePayload: Record<string, any> = {
            called_agent: normalized.called_agent,
            agent_trace: normalized.agent_trace,
            fin_response: normalized.fin_response,
            fin_report: normalized.fin_report,
            suggested_prompts: normalized.suggested_prompts,
            documents: normalized.documents,
            review_required: normalized.review_required,
            suggested_prompt_objects: normalized.suggested_prompt_objects,
          };

          timeoutManager.clearTimeout(jobId);

          await storage.db
            .update(cassidyJobs)
            .set({
              status: "completed",
              responsePayload,
              calledAgent: normalized.called_agent || null,
              cassidyRequestId: result.cassidy_request_id || null,
              agentTrace: normalized.agent_trace || null,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(cassidyJobs.jobId, jobId));

          jobEventBus.publishJobUpdate({
            type: "job_status_update",
            job_id: jobId,
            status: "completed",
            called_agent: normalized.called_agent,
            agent_trace: normalized.agent_trace,
            fin_response: normalized.fin_response,
            fin_report: normalized.fin_report,
            suggested_prompts: normalized.suggested_prompts,
            documents: normalized.documents,
            timestamp: new Date().toISOString(),
          } as any);

          await AuditLogger.logEvent(jobId, AuditEventType.CALLBACK_RECEIVED, {
            called_agent: normalized.called_agent,
            response_length: JSON.stringify(responsePayload).length,
            inline_result: true,
            timestamp: new Date().toISOString(),
          });

          logger.info({ jobId, calledAgent: normalized.called_agent, inline: true }, "Cassidy v2.0 inline result processed");
        } else {
          await storage.db
            .update(cassidyJobs)
            .set({
              status: "in_progress",
              cassidyRequestId: result.cassidy_request_id,
              updatedAt: new Date(),
            })
            .where(eq(cassidyJobs.jobId, jobId));
        }
      })
      .catch(async (err) => {
        logger.warn({ err, jobId }, `${errorLabel} webhook failed, falling back to direct Cassidy API`);
        await fallbackToDirectApi(jobId, payload, errorLabel);
      });
  } else if (apiKey) {
    logger.info({ jobId }, "No webhook URL configured, using direct Cassidy API");
    fallbackToDirectApi(jobId, payload, errorLabel).catch((err) => {
      logger.error({ err, jobId }, "Direct Cassidy API fallback also failed");
    });
  } else {
    logger.warn({ jobId }, "CASSIDY_API_KEY not configured, falling back to OpenAI");
    fallbackToOpenAI(jobId, payload, errorLabel).catch((err) => {
      logger.error({ err, jobId }, "OpenAI fallback also failed");
    });
  }
}

async function fallbackToDirectApi(
  jobId: string,
  payload: Record<string, unknown>,
  errorLabel: string,
): Promise<void> {
  try {
    const advisorRequest = (payload.advisor_request as string) || "";
    const finResponse = await cassidyChat(advisorRequest);

    const responsePayload: Record<string, any> = {
      called_agent: "finn_direct",
      fin_response: finResponse,
      suggested_prompts: [],
      suggested_prompt_objects: [],
      source: "direct_api_fallback",
    };

    timeoutManager.clearTimeout(jobId);

    await storage.db
      .update(cassidyJobs)
      .set({
        status: "completed",
        responsePayload,
        calledAgent: "finn_direct",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cassidyJobs.jobId, jobId));

    jobEventBus.publishJobUpdate({
      type: "job_status_update",
      job_id: jobId,
      status: "completed",
      called_agent: "finn_direct",
      fin_response: finResponse,
      timestamp: new Date().toISOString(),
    });

    logger.info({ jobId }, "Cassidy direct API fallback succeeded");
  } catch (directErr) {
    logger.warn({ err: directErr, jobId }, `${errorLabel} direct API fallback failed, trying OpenAI`);
    await fallbackToOpenAI(jobId, payload, errorLabel);
  }
}

function buildOpenAISystemPrompt(payload: Record<string, unknown>): string {
  const pageContext = payload.page_context as { route?: string; section?: string; clientId?: string; clientName?: string } | undefined;
  const clientContext = payload.client_context as Record<string, unknown> | undefined;

  let contextBlock = "You are Finn, an AI copilot for financial advisors. You help with client questions, compliance, planning, and general advisory tasks. Be concise, professional, and actionable.";

  if (pageContext) {
    contextBlock += `\n\nThe advisor is currently viewing: ${pageContext.section || pageContext.route || "Dashboard"}.`;
    if (pageContext.clientId) {
      contextBlock += ` Client ID: ${pageContext.clientId}.`;
    }
    if (pageContext.clientName) {
      contextBlock += ` Client name: ${pageContext.clientName}.`;
    }
  }

  if (clientContext && Object.keys(clientContext).length > 0) {
    contextBlock += `\n\nClient context: ${JSON.stringify(clientContext)}`;
  }

  return contextBlock;
}

async function fallbackToOpenAI(
  jobId: string,
  payload: Record<string, unknown>,
  errorLabel: string,
): Promise<void> {
  try {
    const advisorRequest = (payload.advisor_request as string) || "";
    const systemPrompt = buildOpenAISystemPrompt(payload);
    const finResponse = await chatCompletion(systemPrompt, advisorRequest, true, 2048);

    const responsePayload: Record<string, any> = {
      called_agent: "finn_openai_fallback",
      fin_response: finResponse,
      suggested_prompts: [],
      suggested_prompt_objects: [],
      source: "openai_fallback",
    };

    timeoutManager.clearTimeout(jobId);

    await storage.db
      .update(cassidyJobs)
      .set({
        status: "completed",
        responsePayload,
        calledAgent: "finn_openai_fallback",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cassidyJobs.jobId, jobId));

    jobEventBus.publishJobUpdate({
      type: "job_status_update",
      job_id: jobId,
      status: "completed",
      called_agent: "finn_openai_fallback",
      fin_response: finResponse,
      timestamp: new Date().toISOString(),
    });

    logger.info({ jobId }, "OpenAI fallback succeeded");
  } catch (openaiErr) {
    logger.error({ err: openaiErr, jobId }, `${errorLabel} OpenAI fallback also failed`);
    timeoutManager.clearTimeout(jobId);

    const errorMessage = "I'm sorry, I couldn't process your request right now. Please try again in a moment.";

    await storage.db
      .update(cassidyJobs)
      .set({
        status: "failed",
        responsePayload: { error: errorMessage },
        updatedAt: new Date(),
      })
      .where(eq(cassidyJobs.jobId, jobId));

    jobEventBus.publishJobUpdate({
      type: "job_status_update",
      job_id: jobId,
      status: "failed",
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
