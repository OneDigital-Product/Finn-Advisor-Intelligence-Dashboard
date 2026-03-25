import type { Express, Request, Response } from "express";
import { cassidyJobs } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { handleCassidyCallback } from "../../integrations/cassidy/callback-handler";
import { buildConversationContext, getConversationSummary } from "../../integrations/cassidy/conversation-context";
import { sanitizePromptInput } from "../../lib/prompt-sanitizer";
import crypto from "crypto";
import {
  storage, logger, requireAuth, rateLimiter, isUUID,
  AuditLogger, AuditEventType, jobEventBus, timeoutManager,
  dispatchCassidyJob, VALID_SOURCES, VALID_TASK_TYPES, validateBody,
  cassidyRequestSchema, submitIntakeSchema, resultRenderedSchema,
} from "./shared";
import { sanitizeForPrompt, sanitizeObjectStrings } from "../../openai";

export function registerCoreRoutes(app: Express) {
  app.post("/api/cassidy/request", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;

      const limitCheck = rateLimiter.checkLimit(advisorId);
      if (!limitCheck.allowed) {
        res.status(429).json({ error: "Rate limit exceeded", retry_after_seconds: limitCheck.retryAfterSeconds, limit_type: limitCheck.limitType });
        return;
      }

      const body = validateBody(cassidyRequestSchema, req, res);
      if (!body) return;
      
      const {
        advisor_request, conversation_id, advisor_name, session_id,
        source, client_id, household_id, metadata, task_type,
        timestamp: reqTimestamp, client_context, callback_url, page_context,
      } = body;

      const job_id = crypto.randomUUID();
      const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `${req.protocol}://${req.get("host")}/api/cassidy/callback`;

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
        advisorId: advisorId,
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

      res.status(202).json({
        job_id,
        status: "accepted",
        estimated_wait_ms: 5000,
      });
    } catch (err) {
      logger.error({ err }, "Error creating Cassidy request");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/cassidy/submit-intake", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;

      const limitCheck = rateLimiter.checkLimit(advisorId);
      if (!limitCheck.allowed) {
        res.status(429).json({ error: "Rate limit exceeded", retry_after_seconds: limitCheck.retryAfterSeconds, limit_type: limitCheck.limitType });
        return;
      }

      const body = validateBody(submitIntakeSchema, req, res);
      if (!body) return;
      const { input } = body;

      if (input.client_id) {
        const { clients } = await import("@shared/schema");
        const client = await storage.db
          .select()
          .from(clients)
          .where(and(eq(clients.id, input.client_id), eq(clients.advisorId, advisorId)))
          .limit(1);
        if (client.length === 0) {
          res.status(403).json({ error: "Client not found or not authorized" });
          return;
        }
      }

      if (input.household_id) {
        const { households } = await import("@shared/schema");
        const hh = await storage.db
          .select()
          .from(households)
          .where(and(eq(households.id, input.household_id), eq(households.advisorId, advisorId)))
          .limit(1);
        if (hh.length === 0) {
          res.status(403).json({ error: "Household not found or not authorized" });
          return;
        }
      }

      const job_id = crypto.randomUUID();
      const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `${req.protocol}://${req.get("host")}/api/cassidy/callback`;

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
        advisorId: advisorId,
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

      res.status(202).json({
        job_id,
        status: "accepted",
        estimated_wait_ms: 5000,
      });
    } catch (err) {
      logger.error({ err }, "Error creating intake request");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/cassidy/callback", handleCassidyCallback);

  app.get("/api/cassidy/stream/:job_id", requireAuth, (req: Request, res: Response) => {
    const job_id = req.params.job_id as string;
    const advisorId = req.session.userId!;

    if (!isUUID(job_id)) {
      res.status(400).json({ error: "Invalid job_id format" });
      return;
    }

    (async () => {
      try {
        const job = await storage.db
          .select()
          .from(cassidyJobs)
          .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
          .limit(1);

        if (job.length === 0) {
          res.status(404).json({ error: "Job not found" });
          return;
        }

        if (job[0].status === "completed") {
          const rp = job[0].responsePayload as Record<string, unknown> | null;
          const completedResponse: Record<string, unknown> = {
            type: "job_status_update",
            job_id,
            status: "completed",
            called_agent: rp?.called_agent,
            agent_trace: rp?.agent_trace,
            documents: rp?.documents || [],
            review_required: rp?.review_required ?? false,
            suggested_prompt_objects: rp?.suggested_prompt_objects || [],
            timestamp: job[0].completedAt?.toISOString(),
          };
          if (rp?.output) {
            completedResponse.output = rp.output;
          }
          if (rp?.fin_response !== undefined) {
            completedResponse.fin_response = rp.fin_response;
            completedResponse.fin_report = rp.fin_report;
            completedResponse.suggested_prompts = rp.suggested_prompts;
          }
          res.json(completedResponse);
          return;
        }

        if (job[0].status === "failed" || job[0].status === "timed_out") {
          res.json({
            type: "job_status_update",
            job_id,
            status: job[0].status,
            error: job[0].status === "timed_out"
              ? "Job timed out after 120 seconds"
              : "Job failed",
            timestamp: job[0].updatedAt?.toISOString(),
          });
          return;
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const unsubscribe = jobEventBus.subscribeToJob(job_id, (update) => {
          res.write(`data: ${JSON.stringify(update)}\n\n`);

          if (["completed", "failed", "timed_out"].includes(update.status)) {
            setTimeout(() => res.end(), 1000);
          }
        });

        req.on("close", () => {
          unsubscribe();
        });

        const clientTimeout = setTimeout(() => {
          if (!res.writableEnded) {
            res.end();
          }
        }, 150000);

        res.on("finish", () => {
          clearTimeout(clientTimeout);
        });
      } catch (err) {
        logger.error({ err }, "SSE stream setup error");
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to setup stream" });
        }
      }
    })();
  });

  app.post("/api/cassidy/result-rendered", requireAuth, async (req: Request, res: Response) => {
    try {
      const body = validateBody(resultRenderedSchema, req, res);
      if (!body) return;
      const { job_id, viewed_tabs } = body;
      const advisorId = req.session.userId!;

      const job = await storage.db
        .select()
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
        .limit(1);

      if (job.length > 0) {
        await AuditLogger.logEvent(job_id, AuditEventType.RESULT_RENDERED, {
          advisor_id: advisorId,
          client_id: job[0].clientId,
          viewed_tabs: Array.isArray(viewed_tabs) ? viewed_tabs : [viewed_tabs],
          timestamp: new Date().toISOString(),
        });
      }

      res.json({ status: "logged" });
    } catch (err) {
      logger.error({ err }, "Failed to log result rendered");
      res.status(500).json({ error: "Logging failed" });
    }
  });

  app.get("/api/cassidy/jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const jobs = await storage.db
        .select()
        .from(cassidyJobs)
        .where(eq(cassidyJobs.advisorId, advisorId))
        .orderBy(desc(cassidyJobs.createdAt))
        .limit(50);

      res.json(jobs);
    } catch (err) {
      logger.error({ err }, "Error fetching Cassidy jobs");
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/cassidy/jobs/:jobId", requireAuth, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.jobId as string;
      const advisorId = req.session.userId!;

      if (!isUUID(jobId)) {
        res.status(400).json({ error: "Invalid job_id format" });
        return;
      }

      const rows = await storage.db
        .select()
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, jobId), eq(cassidyJobs.advisorId, advisorId)))
        .limit(1);

      if (rows.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const job = rows[0];
      const rp = job.responsePayload as Record<string, unknown> | null;
      const finResp = rp?.fin_response || rp?.finResponse || null;
      const errorMsg = (job.status === "failed" || job.status === "timed_out")
        ? (typeof rp?.error === "string" ? rp.error : (job.status === "timed_out" ? "Request timed out. Please try again." : "Request failed. Please try again."))
        : null;
      res.json({
        job_id: jobId,
        status: job.status,
        task_type: job.taskType,
        client_id: job.clientId,
        output: rp?.output || finResp || null,
        fin_response: finResp,
        finResponse: finResp,
        error: errorMsg,
        called_agent: rp?.called_agent || null,
        calledMode: rp?.calledMode || rp?.called_mode || null,
        suggested_prompts: rp?.suggested_prompts || [],
        suggested_prompt_objects: rp?.suggested_prompt_objects || [],
        request_payload: job.requestPayload,
      });
    } catch (err) {
      logger.error({ err }, "Error fetching single job");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/cassidy/job-output/:job_id", requireAuth, async (req: Request, res: Response) => {
    try {
      const job_id = req.params.job_id as string;
      const advisorId = req.session.userId!;

      if (!isUUID(job_id)) {
        res.status(400).json({ error: "Invalid job_id format" });
        return;
      }

      const job = await storage.db
        .select()
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
        .limit(1);

      if (job.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const rp = job[0].responsePayload as Record<string, unknown> | null;
      res.json({
        job_id,
        status: job[0].status,
        task_type: job[0].taskType,
        client_id: job[0].clientId,
        output: rp?.output || null,
        request_payload: job[0].requestPayload,
      });
    } catch (err) {
      logger.error({ err }, "Error fetching job output");
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
