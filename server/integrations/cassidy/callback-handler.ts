import type { Request, Response } from "express";
import { storage } from "../../storage";
import { cassidyJobs, detectedSignals, reportArtifacts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { verifySignature } from "./signature-verifier";
import { jobEventBus, type JobUpdate } from "./event-bus";
import { timeoutManager } from "./timeout-manager";
import { AuditLogger, AuditEventType } from "./audit-logger";
import { executeChain } from "./chain-executor";
import { logger } from "../../lib/logger";
import { sseEventBus } from "../../lib/sse-event-bus";
import { normalizeV2Response } from "../../routes/cassidy/shared";
import crypto from "crypto";

export interface CassidyCallbackPayload {
  job_id: string;
  cassidy_request_id: string;
  fin_response?: string;
  fin_report?: string;
  suggested_prompts?: string[];
  called_agent: string;
  agent_trace?: {
    routing_decision: string;
    primary_agent: string;
    secondary_agents: string[];
    context: {
      intent: string;
      client_segment: string;
      recommended_next_steps: string[];
    };
  };
  secondary_agents?: Array<{
    agentName: string;
    agentPrompt: string;
  }>;
  output?: Record<string, any>;
  timestamp: string;
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function handleCassidyCallback(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers["x-cassidy-signature"] as string;
    const apiKey = process.env.CASSIDY_API_KEY;

    if (!signature || !apiKey) {
      res.status(401).json({ error: "Missing signature or API key" });
      return;
    }

    const rawBody = (req as any).rawBody as Buffer;
    if (rawBody && !verifySignature(rawBody, signature, apiKey)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const rawBody2 = req.body as Record<string, any>;
    const normalized = normalizeV2Response(rawBody2);

    const job_id = normalized.job_id || rawBody2.job_id;
    const cassidy_request_id = normalized.cassidy_request_id || rawBody2.cassidy_request_id;
    const fin_response = normalized.fin_response || rawBody2.fin_response;
    const fin_report = normalized.fin_report || rawBody2.fin_report;
    const suggested_prompts = normalized.suggested_prompts || rawBody2.suggested_prompts;
    const called_agent = normalized.called_agent || rawBody2.called_agent;
    const agent_trace = normalized.agent_trace || rawBody2.agent_trace;
    const secondary_agents = rawBody2.secondary_agents;
    const output = rawBody2.output;
    const timestamp = rawBody2.timestamp;
    const documents = normalized.documents || [];
    const review_required = normalized.review_required ?? false;
    const suggested_prompt_objects = normalized.suggested_prompt_objects || [];

    if (!job_id) {
      res.status(400).json({ error: "Missing job_id" });
      return;
    }

    if (!isUUID(job_id)) {
      res.status(400).json({ error: "Invalid job_id format" });
      return;
    }

    const existingJob = await storage.db
      .select()
      .from(cassidyJobs)
      .where(eq(cassidyJobs.jobId, job_id))
      .limit(1);

    if (existingJob.length === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const responsePayload: Record<string, any> = {
      called_agent,
      agent_trace,
      documents,
      review_required,
      suggested_prompt_objects,
    };

    if (output) {
      responsePayload.output = output;
    }
    if (fin_response !== undefined) {
      responsePayload.fin_response = fin_response;
      responsePayload.fin_report = fin_report;
      responsePayload.suggested_prompts = suggested_prompts;
    }

    await storage.db
      .update(cassidyJobs)
      .set({
        status: "completed",
        responsePayload,
        calledAgent: called_agent,
        cassidyRequestId: cassidy_request_id,
        agentTrace: agent_trace || null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cassidyJobs.jobId, job_id));

    timeoutManager.clearTimeout(job_id);

    if (existingJob[0].taskType === "signal_detection" && output?.signals && Array.isArray(output.signals)) {
      try {
        const rp = existingJob[0].requestPayload as any;
        const meta = rp?.metadata || rp?.input || {};
        const meetingId = meta.meetingId || meta.meeting_id;
        const clientIdForSignal = meta.clientId || meta.client_id || existingJob[0].clientId;
        const advisorIdForSignal = meta.advisorId || meta.advisor_id || existingJob[0].advisorId;

        if (meetingId && clientIdForSignal && advisorIdForSignal) {
          const signalsToInsert = output.signals.map((s: any) => ({
            jobId: job_id,
            clientId: clientIdForSignal,
            meetingId,
            advisorId: advisorIdForSignal,
            signalType: s.signal_type || s.signalType || "unknown",
            description: s.description || "",
            confidence: s.confidence || "MEDIUM",
            materiality: s.materiality || "IMPORTANT",
            sourceSnippet: s.source_snippet || s.sourceSnippet || null,
            dateReference: s.date_reference || s.dateReference || null,
            recommendedActions: s.recommended_actions || s.recommendedActions || null,
            status: "pending",
            reviewRequired: s.review_required ?? s.reviewRequired ?? false,
            duplicateLikelihood: s.duplicate_likelihood || s.duplicateLikelihood || null,
            reasoning: s.reasoning || null,
          }));

          if (signalsToInsert.length > 0) {
            await storage.db.insert(detectedSignals).values(signalsToInsert);
            logger.info({ jobId: job_id, signalCount: signalsToInsert.length }, "Stored detected signals from callback");
          }
        }
      } catch (signalErr) {
        logger.error({ err: signalErr, jobId: job_id }, "Failed to store detected signals from callback");
      }
    }

    let reportDraftId: string | null = null;
    if (existingJob[0].taskType === "report_generation" && output) {
      try {
        const clientIdForReport = existingJob[0].clientId;
        const advisorIdForReport = existingJob[0].advisorId;

        if (clientIdForReport && advisorIdForReport) {
          reportDraftId = crypto.randomUUID();
          await storage.db.insert(reportArtifacts).values({
            id: reportDraftId,
            jobId: job_id,
            clientId: clientIdForReport,
            advisorId: advisorIdForReport,
            reportType: output.report_type || "general",
            reportName: output.draft_title || "Report Draft",
            draftTitle: output.draft_title || "Report Draft",
            fullDraftText: output.full_draft_text || "",
            draftSections: output.draft_sections || [],
            includedSources: output.included_sources || [],
            assumptionNotes: output.assumption_notes || [],
            missingInfoFlags: output.missing_info_flags || [],
            confidenceSummary: output.confidence_summary || null,
            wordCount: output.word_count || null,
            content: output.draft_sections || [],
            status: "draft",
            version: 1,
            createdBy: advisorIdForReport,
          });
          logger.info({ jobId: job_id, draftId: reportDraftId }, "Stored report draft from callback");
        }
      } catch (reportErr) {
        logger.error({ err: reportErr, jobId: job_id }, "Failed to store report draft from callback");
        await storage.db
          .update(cassidyJobs)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(cassidyJobs.jobId, job_id));
        jobEventBus.publishJobUpdate({
          type: "job_status_update",
          job_id,
          status: "failed",
          error: "Report draft persistence failed",
          timestamp: new Date().toISOString(),
        });
        res.json({ status: "error", message: "Draft persistence failed" });
        return;
      }
    }

    const eventUpdate: JobUpdate = {
      type: "job_status_update",
      job_id,
      status: "completed",
      called_agent,
      agent_trace,
      timestamp: timestamp || new Date().toISOString(),
      ...(output ? { output } : {}),
      ...(fin_response !== undefined ? { fin_response, fin_report, suggested_prompts } : {}),
      ...(reportDraftId ? { draft_id: reportDraftId } : {}),
    };

    jobEventBus.publishJobUpdate(eventUpdate);

    sseEventBus.publishToUser(existingJob[0].advisorId, "cassidy:job_completed", {
      jobId: job_id,
      calledAgent: called_agent,
      taskType: existingJob[0].taskType,
      clientId: existingJob[0].clientId,
      ...(reportDraftId ? { draftId: reportDraftId } : {}),
    });

    await AuditLogger.logEvent(job_id, AuditEventType.CALLBACK_RECEIVED, {
      cassidy_request_id,
      called_agent,
      response_length: JSON.stringify(responsePayload).length,
      timestamp: new Date().toISOString(),
    });

    if (agent_trace) {
      await AuditLogger.logEvent(job_id, AuditEventType.ROUTING_DECISION, {
        primary_agent: agent_trace.primary_agent,
        secondary_agents: agent_trace.secondary_agents,
        routing_logic: agent_trace.routing_decision,
        client_segment: agent_trace.context?.client_segment,
        intent: agent_trace.context?.intent,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ jobId: job_id, calledAgent: called_agent }, "Cassidy callback processed");

    const incomingSecondaryAgents = secondary_agents
      || (output?.secondary_agents as Array<{ agentName: string; agentPrompt: string }> | undefined);

    if (incomingSecondaryAgents && Array.isArray(incomingSecondaryAgents) && incomingSecondaryAgents.length > 0) {
      const requestPayload = existingJob[0].requestPayload as any;
      executeChain({
        jobId: job_id,
        advisorId: existingJob[0].advisorId,
        clientId: existingJob[0].clientId || "",
        householdId: existingJob[0].householdId || "",
        originalRequest: requestPayload?.advisor_request || "",
        secondaryAgents: incomingSecondaryAgents,
      }).catch((chainErr) => {
        logger.error({ err: chainErr, jobId: job_id }, "Chain execution failed");
        jobEventBus.publishJobUpdate({
          type: "chain_complete",
          job_id,
          status: "failed",
          error: chainErr instanceof Error ? chainErr.message : String(chainErr),
          timestamp: new Date().toISOString(),
        });
      });
      logger.info({ jobId: job_id, agentCount: incomingSecondaryAgents.length }, "Chain execution queued");
    }

    res.status(202).json({
      status: "received",
      message: "Results processed and queued for delivery",
    });
  } catch (err) {
    logger.error({ err }, "Cassidy callback error");
    res.status(500).json({ error: "Internal server error" });
  }
}
