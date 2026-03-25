import type { Express, Request, Response } from "express";
import { cassidyJobs, advisors, clients } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { buildTraceTimeline, getFullTrace } from "../../integrations/cassidy/trace-builder";
import { getChainStats } from "../../integrations/cassidy/chain-executor";
import { sanitizeErrorMessage } from "../../lib/error-utils";
import {
  storage, logger, requireAuth,
  AuditLogger, getEventLabel, formatEventDetail, getEventActor,
} from "./shared";

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/cassidy-audit/:job_id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userType = req.session.userType!;
      if (userType !== "advisor") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      const job_id = req.params.job_id as string;
      const advisorId = req.session.userId!;

      const job = await storage.db
        .select()
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
        .limit(1);

      if (job.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const advisor = await storage.db
        .select()
        .from(advisors)
        .where(eq(advisors.id, job[0].advisorId))
        .limit(1);

      let clientName = "Unknown";
      if (job[0].clientId) {
        const client = await storage.db
          .select()
          .from(clients)
          .where(eq(clients.id, job[0].clientId))
          .limit(1);
        if (client.length > 0) {
          clientName = `${client[0].firstName} ${client[0].lastName}`;
        }
      }

      const auditTrail = await AuditLogger.getJobAuditTrail(job_id);

      const timeline = auditTrail.map((event) => {
        const auditEvent = {
          eventType: event.eventType,
          eventData: event.eventData as Record<string, unknown>,
          timestamp: event.timestamp ?? undefined,
        };
        return {
          timestamp: event.timestamp,
          event: getEventLabel(event.eventType),
          detail: formatEventDetail(auditEvent),
          actor: getEventActor(event.eventType),
          data: event.eventData,
        };
      });

      res.json({
        job_id,
        advisor_name: advisor[0]?.name || "Unknown",
        client_name: clientName,
        task_type: job[0].taskType,
        status: job[0].status,
        created_at: job[0].createdAt,
        completed_at: job[0].completedAt,
        timeline,
        raw_events: auditTrail,
      });
    } catch (err) {
      logger.error({ err }, "Error fetching audit trail");
      res.status(500).json({ error: "Failed to fetch audit trail" });
    }
  });

  app.get("/api/admin/cassidy-audit", requireAuth, async (req: Request, res: Response) => {
    try {
      const userType = req.session.userType!;
      if (userType !== "advisor") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      const advisorId = req.session.userId!;
      const { job_id, event_type, start_date, end_date } = req.query;
      const limit = req.query.limit as string || "100";

      const results = await AuditLogger.searchAuditLogs({
        advisorId,
        jobId: job_id as string | undefined,
        eventType: event_type && event_type !== "all" ? (event_type as string) : undefined,
        startDate: start_date ? new Date(start_date as string) : undefined,
        endDate: end_date ? new Date(end_date as string) : undefined,
        limit: parseInt(limit as string, 10) || 100,
      });

      res.json(results);
    } catch (err) {
      logger.error({ err }, "Error searching audit logs");
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/cassidy/jobs/:jobId/trace", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const jobId = req.params.jobId as string;
      const jobCheck = await storage.db
        .select({ id: cassidyJobs.id })
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, jobId), eq(cassidyJobs.advisorId, advisorId)))
        .then((r) => r[0]);
      if (!jobCheck) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      const timeline = await buildTraceTimeline(jobId);
      res.json({ job_id: jobId, ...timeline });
    } catch (err: unknown) {
      logger.error({ err }, "Build trace error");
      if ((err as Error).message?.includes("not found")) {
        res.status(404).json({ error: sanitizeErrorMessage(err, "Job not found") });
        return;
      }
      res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to build trace") });
    }
  });

  app.get("/api/cassidy/jobs/:jobId/trace/full", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const jobId = req.params.jobId as string;
      const jobCheck = await storage.db
        .select({ id: cassidyJobs.id })
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, jobId), eq(cassidyJobs.advisorId, advisorId)))
        .then((r) => r[0]);
      if (!jobCheck) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      const trace = await getFullTrace(jobId);
      res.json(trace);
    } catch (err: unknown) {
      logger.error({ err }, "Get full trace error");
      if ((err as Error).message?.includes("not found")) {
        res.status(404).json({ error: sanitizeErrorMessage(err, "Job not found") });
        return;
      }
      res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to get full trace") });
    }
  });

  app.get("/api/cassidy/review-queue", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      res.json({
        pendingFacts: [],
        pendingProfiles: [],
        pendingReports: [],
        pendingSignals: [],
        totalCount: 0,
      });
    } catch (err) {
      logger.error({ err }, "Get review queue error");
      res.status(500).json({ error: "Failed to get review queue" });
    }
  });

  app.get("/api/cassidy/jobs/:jobId/chain-stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const jobId = req.params.jobId as string;
      const jobCheck = await storage.db
        .select({ id: cassidyJobs.id })
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, jobId), eq(cassidyJobs.advisorId, advisorId)))
        .then((r) => r[0]);
      if (!jobCheck) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      const stats = await getChainStats(jobId);
      res.json({ job_id: jobId, ...stats });
    } catch (err) {
      logger.error({ err }, "Get chain stats error");
      res.status(500).json({ error: "Failed to get chain stats" });
    }
  });
}
