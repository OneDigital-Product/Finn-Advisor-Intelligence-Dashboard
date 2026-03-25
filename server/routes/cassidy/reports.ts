import type { Express, Request, Response } from "express";
import { cassidyJobs, clients, candidateFacts, meetings, reportArtifacts, calculatorRuns, conversationTurns } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import * as reportStorage from "../../integrations/cassidy/report-storage";
import crypto from "crypto";
import { sanitizeErrorMessage } from "../../lib/error-utils";
import {
  storage, logger, requireAuth, rateLimiter,
  AuditLogger, AuditEventType, timeoutManager, dispatchCassidyJob,
  validateBody, generateReportSchema, updateReportDraftSchema, saveVersionSchema, conversationTurnSchema,
} from "./shared";

export function registerReportsRoutes(app: Express) {
  app.post("/api/cassidy/generate-report", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      
      const body = validateBody(generateReportSchema, req, res);
      if (!body) return;
      const { report_type, advisor_instruction, client_id, meeting_id } = body;

      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const limitCheck = rateLimiter.checkLimit(advisorId);
      if (!limitCheck.allowed) {
        res.status(429).json({ error: "Rate limit exceeded", retry_after_seconds: limitCheck.retryAfterSeconds, limit_type: limitCheck.limitType });
        return;
      }

      const [client] = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (!client) {
        res.status(404).json({ error: "Client not found or not authorized" });
        return;
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
      const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `${req.protocol}://${req.get("host")}/api/cassidy/callback`;

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

      res.status(202).json({
        job_id: jobId,
        status: "generating",
        estimated_duration_ms: 7000,
      });
    } catch (err) {
      logger.error({ err }, "Report generation error");
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/cassidy/report-drafts/:draftId", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const draftId = req.params.draftId as string;

      const [draft] = await storage.db
        .select()
        .from(reportArtifacts)
        .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
        .limit(1);

      if (!draft) {
        res.status(404).json({ error: "Draft not found" });
        return;
      }

      res.json({ draft });
    } catch (err) {
      logger.error({ err }, "Get report draft error");
      res.status(500).json({ error: "Failed to retrieve draft" });
    }
  });

  app.get("/api/cassidy/report-drafts/client/:clientId", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const clientId = req.params.clientId as string;

      const [client] = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (!client) {
        res.status(404).json({ error: "Client not found or not authorized" });
        return;
      }

      const limitNum = Math.min(Math.max(parseInt(req.query.limit as string || "20") || 20, 1), 100);
      const offsetNum = Math.max(parseInt(req.query.offset as string || "0") || 0, 0);

      const drafts = await storage.db
        .select()
        .from(reportArtifacts)
        .where(and(eq(reportArtifacts.clientId, clientId), eq(reportArtifacts.advisorId, advisorId)))
        .orderBy(desc(reportArtifacts.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      res.json({ drafts, limit: limitNum, offset: offsetNum });
    } catch (err) {
      logger.error({ err }, "Get client report drafts error");
      res.status(500).json({ error: "Failed to retrieve drafts" });
    }
  });

  app.patch("/api/cassidy/report-drafts/:draftId", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const draftId = req.params.draftId as string;
      
      const body = validateBody(updateReportDraftSchema, req, res);
      if (!body) return;
      const { status, edits } = body;

      const [existing] = await storage.db
        .select()
        .from(reportArtifacts)
        .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Draft not found" });
        return;
      }

      if (existing.status === "approved") {
        res.status(400).json({ error: "Cannot modify approved draft" });
        return;
      }

      if (existing.status === "discarded") {
        res.status(400).json({ error: "Cannot modify discarded draft" });
        return;
      }

      const updateFields: Record<string, unknown> = { updatedAt: new Date() };

      if (status) {
        const validStatuses = ["draft", "reviewed"];
        if (!validStatuses.includes(status)) {
          res.status(400).json({ error: "Use dedicated approve/discard endpoints for status changes" });
          return;
        }
        updateFields.status = status;
      }

      if (edits) {
        updateFields.fullDraftText = edits;
        updateFields.version = (existing.version || 1) + 1;
      }

      if (!status && !edits) {
        res.status(400).json({ error: "No updates provided" });
        return;
      }

      const [updated] = await storage.db
        .update(reportArtifacts)
        .set(updateFields)
        .where(eq(reportArtifacts.id, draftId))
        .returning();

      res.json({ draft: updated });
    } catch (err) {
      logger.error({ err }, "Update report draft error");
      res.status(500).json({ error: "Failed to update draft" });
    }
  });

  app.post("/api/cassidy/report-drafts/:draftId/save-version", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const draftId = req.params.draftId as string;
      
      const body = validateBody(saveVersionSchema, req, res);
      if (!body) return;
      const { edits, edit_summary } = body;

      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const draft = await reportStorage.saveDraftVersion(draftId, advisorId, edits, edit_summary);
      res.json({ draft, version: draft.version });
    } catch (err: unknown) {
      logger.error({ err }, "Save version error");
      const safeMsg = sanitizeErrorMessage(err, "Failed to save version");
      if ((err as Error).message === "Draft not found") {
        res.status(404).json({ error: safeMsg });
        return;
      }
      if ((err as Error).message?.includes("Cannot edit")) {
        res.status(400).json({ error: safeMsg });
        return;
      }
      res.status(500).json({ error: safeMsg });
    }
  });

  app.get("/api/cassidy/report-drafts/:draftId/versions", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const draftId = req.params.draftId as string;

      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const versions = await reportStorage.getDraftVersions(draftId, advisorId);
      res.json({ versions });
    } catch (err: unknown) {
      logger.error({ err }, "Get versions error");
      const safeMsg = sanitizeErrorMessage(err, "Failed to retrieve versions");
      if ((err as Error).message === "Draft not found") {
        res.status(404).json({ error: safeMsg });
        return;
      }
      res.status(500).json({ error: safeMsg });
    }
  });

  app.get("/api/cassidy/report-drafts/:draftId/diff", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const draftId = req.params.draftId as string;
      const v1 = parseInt(req.query.v1 as string);
      const v2 = parseInt(req.query.v2 as string);

      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      if (!v1 || !v2 || isNaN(v1) || isNaN(v2)) {
        res.status(400).json({ error: "v1 and v2 query parameters required" });
        return;
      }

      const diff = await reportStorage.getVersionDiff(draftId, advisorId, v1, v2);
      res.json(diff);
    } catch (err: unknown) {
      logger.error({ err }, "Get diff error");
      const safeMsg = sanitizeErrorMessage(err, "Failed to retrieve diff");
      if ((err as Error).message?.includes("not found")) {
        res.status(404).json({ error: safeMsg });
        return;
      }
      res.status(500).json({ error: safeMsg });
    }
  });

  app.post("/api/cassidy/report-drafts/:draftId/approve", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const draftId = req.params.draftId as string;

      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const draft = await reportStorage.approveDraft(draftId, advisorId);
      res.json({ draft, message: "Draft approved" });
    } catch (err: unknown) {
      logger.error({ err }, "Approve draft error");
      const safeMsg = sanitizeErrorMessage(err, "Failed to approve draft");
      if ((err as Error).message === "Draft not found") {
        res.status(404).json({ error: safeMsg });
        return;
      }
      if ((err as Error).message === "Draft already approved") {
        res.status(400).json({ error: safeMsg });
        return;
      }
      res.status(500).json({ error: safeMsg });
    }
  });

  app.post("/api/cassidy/report-drafts/:draftId/discard", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const draftId = req.params.draftId as string;

      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      await reportStorage.discardDraft(draftId, advisorId);
      res.json({ message: "Draft discarded" });
    } catch (err: unknown) {
      logger.error({ err }, "Discard draft error");
      const safeMsg = sanitizeErrorMessage(err, "Failed to discard draft");
      if ((err as Error).message === "Draft not found") {
        res.status(404).json({ error: safeMsg });
        return;
      }
      if ((err as Error).message?.includes("Cannot discard")) {
        res.status(400).json({ error: safeMsg });
        return;
      }
      res.status(500).json({ error: safeMsg });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const conversationId = crypto.randomUUID();
      res.json({
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, "Create conversation error");
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.post("/api/conversations/:conversationId/turns", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const conversationId = req.params.conversationId as string;
      
      const body = validateBody(conversationTurnSchema, req, res);
      if (!body) return;
      const { client_id, role, content, job_id, suggested_prompts, execution_time_ms, parent_turn_id } = body;

      const existingTurns = await storage.db
        .select()
        .from(conversationTurns)
        .where(eq(conversationTurns.conversationId, conversationId));

      const turnNumber = existingTurns.length + 1;

      const turn = await storage.db
        .insert(conversationTurns)
        .values({
          conversationId,
          sessionId: req.session.id || crypto.randomUUID(),
          advisorId,
          clientId: client_id || null,
          turnNumber,
          role,
          content,
          jobId: job_id || null,
          suggestedPrompts: suggested_prompts || null,
          executionTimeMs: execution_time_ms || null,
          parentTurnId: parent_turn_id || null,
        })
        .returning();

      res.json({
        turn_id: turn[0].id,
        turn_number: turnNumber,
        created_at: turn[0].createdAt,
      });
    } catch (err) {
      logger.error({ err }, "Add conversation turn error");
      res.status(500).json({ error: "Failed to add conversation turn" });
    }
  });

  app.get("/api/conversations/:conversationId", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const conversationId = req.params.conversationId as string;

      const turns = await storage.db
        .select()
        .from(conversationTurns)
        .where(and(
          eq(conversationTurns.conversationId, conversationId),
          eq(conversationTurns.advisorId, advisorId)
        ))
        .orderBy(conversationTurns.turnNumber);

      if (turns.length === 0) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      res.json({
        conversation_id: conversationId,
        turn_count: turns.length,
        turns: turns.map((t) => ({
          id: t.id,
          turn_number: t.turnNumber,
          role: t.role,
          content: t.content,
          job_id: t.jobId,
          suggested_prompts: t.suggestedPrompts,
          execution_time_ms: t.executionTimeMs,
          parent_turn_id: t.parentTurnId,
          created_at: t.createdAt,
        })),
      });
    } catch (err) {
      logger.error({ err }, "Fetch conversation error");
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.get("/api/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const allTurns = await storage.db
        .select()
        .from(conversationTurns)
        .where(eq(conversationTurns.advisorId, advisorId))
        .orderBy(desc(conversationTurns.createdAt));

      const conversationMap = new Map<string, {
        conversationId: string;
        clientId: string | null;
        turnCount: number;
        firstTurnContent: string;
        lastTurnAt: Date;
        createdAt: Date;
      }>();

      for (const turn of allTurns) {
        if (!conversationMap.has(turn.conversationId)) {
          conversationMap.set(turn.conversationId, {
            conversationId: turn.conversationId,
            clientId: turn.clientId,
            turnCount: 0,
            firstTurnContent: "",
            lastTurnAt: turn.createdAt,
            createdAt: turn.createdAt,
          });
        }
        const conv = conversationMap.get(turn.conversationId)!;
        conv.turnCount++;
        if (turn.role === "advisor" && !conv.firstTurnContent) {
          conv.firstTurnContent = turn.content.substring(0, 80);
        }
        if (turn.createdAt > conv.lastTurnAt) {
          conv.lastTurnAt = turn.createdAt;
        }
        if (turn.createdAt < conv.createdAt) {
          conv.createdAt = turn.createdAt;
        }
      }

      const conversations = Array.from(conversationMap.values())
        .sort((a, b) => b.lastTurnAt.getTime() - a.lastTurnAt.getTime())
        .slice(0, 20);

      res.json({
        conversations: conversations.map((c) => ({
          conversation_id: c.conversationId,
          client_id: c.clientId,
          turn_count: c.turnCount,
          title: c.firstTurnContent || "Conversation",
          last_turn_at: c.lastTurnAt,
          created_at: c.createdAt,
        })),
      });
    } catch (err) {
      logger.error({ err }, "List conversations error");
      res.status(500).json({ error: "Failed to list conversations" });
    }
  });
}
