import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { computeAllEngagementScores } from "../engines/engagement-scoring";
import { detectAllIntentSignals } from "../engines/intent-signal-engine";
import { generateNextBestActions } from "../engines/next-best-action-engine";
import { getClient as getSalesforceClient, isSalesforceEnabled } from "../integrations/salesforce/client";
import { isValidSalesforceId } from "../integrations/salesforce/validate-salesforce-id";
import { insertEngagementEventSchema } from "@shared/schema";

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerEngagementRoutes(app: Express) {
  app.post("/api/engagement/events", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const parsed = insertEngagementEventSchema.safeParse({ ...req.body, advisorId: advisor.id });
      if (!parsed.success) return res.status(400).json({ error: "Invalid event data", details: parsed.error.issues });

      const event = await storage.createEngagementEvent(parsed.data);
      res.json(event);
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Create event error");
      res.status(500).json({ error: "Failed to create engagement event" });
    }
  });

  app.get("/api/engagement/events", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const limit = Math.min(parseInt(String(req.query.limit)) || 100, 500);
      const events = await storage.getEngagementEventsByAdvisor(advisor.id, limit);
      res.json({ events });
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Get events error");
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/clients/:id/engagement/events", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient(p(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      const limit = Math.min(parseInt(String(req.query.limit)) || 50, 200);
      const events = await storage.getEngagementEventsByClient(p(req.params.id), limit);
      res.json({ events });
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Client events error");
      res.status(500).json({ error: "Failed to fetch client engagement events" });
    }
  });

  app.get("/api/engagement/scores", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const scores = await storage.getEngagementScoresByAdvisor(advisor.id);
      res.json({ scores });
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Get scores error");
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  });

  app.post("/api/engagement/scores/compute", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const result = await computeAllEngagementScores(advisor.id);
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Compute scores error");
      res.status(500).json({ error: "Failed to compute engagement scores" });
    }
  });

  app.get("/api/engagement/intent-signals", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const signals = await storage.getActiveIntentSignals(advisor.id);
      res.json({ signals });
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Get signals error");
      res.status(500).json({ error: "Failed to fetch intent signals" });
    }
  });

  app.post("/api/engagement/intent-signals/detect", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const result = await detectAllIntentSignals(advisor.id);
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Detect signals error");
      res.status(500).json({ error: "Failed to detect intent signals" });
    }
  });

  app.patch("/api/engagement/intent-signals/:id/deactivate", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const signals = await storage.getActiveIntentSignals(advisor.id);
      const signal = signals.find(s => s.id === p(req.params.id));
      if (!signal) return res.status(404).json({ error: "Signal not found or not authorized" });

      await storage.deactivateIntentSignal(p(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Deactivate signal error");
      res.status(500).json({ error: "Failed to deactivate signal" });
    }
  });

  app.get("/api/engagement/actions", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const status = req.query.status as string | undefined;
      const actions = await storage.getNextBestActions(advisor.id, status || "pending");
      res.json({ actions });
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Get actions error");
      res.status(500).json({ error: "Failed to fetch actions" });
    }
  });

  app.post("/api/engagement/actions/generate", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      await computeAllEngagementScores(advisor.id);
      await detectAllIntentSignals(advisor.id);
      const result = await generateNextBestActions(advisor.id);
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Generate actions error");
      res.status(500).json({ error: "Failed to generate next-best-actions" });
    }
  });

  app.patch("/api/engagement/actions/:id/complete", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const pending = await storage.getNextBestActions(advisor.id);
      const existing = pending.find(a => a.id === p(req.params.id));
      if (!existing) return res.status(404).json({ error: "Action not found or not authorized" });

      const action = await storage.completeNextBestAction(p(req.params.id));
      if (!action) return res.status(404).json({ error: "Action not found" });

      if (isSalesforceEnabled()) {
        try {
          const conn = await getSalesforceClient();
          if (conn) {
            const client = await storage.getClient(action.clientId);
            if (client?.salesforceContactId && isValidSalesforceId((client.salesforceContactId))) {
              const sfTask = await conn.sobject("Task").create({
                WhoId: client.salesforceContactId,
                Subject: action.title,
                Description: action.description,
                Status: "Completed",
                Priority: action.priority > 80 ? "High" : "Normal",
                ActivityDate: new Date().toISOString().split("T")[0],
              });
              if (sfTask.success) {
                await storage.updateNextBestAction(action.id, {
                  salesforceActivityId: sfTask.id,
                });
              }
            }
          }
        } catch (sfErr) {
          logger.error({ err: sfErr }, "[Engagement] Salesforce sync failed for completed action");
        }
      }

      res.json(action);
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Complete action error");
      res.status(500).json({ error: "Failed to complete action" });
    }
  });

  app.patch("/api/engagement/actions/:id/dismiss", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const pending = await storage.getNextBestActions(advisor.id);
      const existing = pending.find(a => a.id === p(req.params.id));
      if (!existing) return res.status(404).json({ error: "Action not found or not authorized" });

      const action = await storage.dismissNextBestAction(p(req.params.id));
      if (!action) return res.status(404).json({ error: "Action not found" });
      res.json(action);
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Dismiss action error");
      res.status(500).json({ error: "Failed to dismiss action" });
    }
  });

  app.get("/api/engagement/dashboard", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const [scores, signals, actions, events] = await Promise.all([
        storage.getEngagementScoresByAdvisor(advisor.id),
        storage.getActiveIntentSignals(advisor.id),
        storage.getNextBestActions(advisor.id, "pending"),
        storage.getEngagementEventsByAdvisor(advisor.id, 50),
      ]);

      const clients = await storage.getClients(advisor.id);
      const clientMap = new Map(clients.map(c => [c.id, c]));

      const enrichedScores = scores.map(s => ({
        ...s,
        clientName: (() => {
          const c = clientMap.get(s.clientId);
          return c ? `${c.firstName} ${c.lastName}` : "Unknown";
        })(),
        segment: clientMap.get(s.clientId)?.segment || "C",
      }));

      const enrichedSignals = signals.map(s => ({
        ...s,
        clientName: (() => {
          const c = clientMap.get(s.clientId);
          return c ? `${c.firstName} ${c.lastName}` : "Unknown";
        })(),
      }));

      const enrichedActions = actions.map(a => ({
        ...a,
        clientName: (() => {
          const c = clientMap.get(a.clientId);
          return c ? `${c.firstName} ${c.lastName}` : "Unknown";
        })(),
        segment: clientMap.get(a.clientId)?.segment || "C",
      }));

      const enrichedEvents = events.map(e => ({
        ...e,
        clientName: (() => {
          const c = clientMap.get(e.clientId);
          return c ? `${c.firstName} ${c.lastName}` : "Unknown";
        })(),
      }));

      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((s, sc) => s + sc.compositeScore, 0) / scores.length)
        : 0;

      const highEngagement = scores.filter(s => s.compositeScore >= 70).length;
      const lowEngagement = scores.filter(s => s.compositeScore < 30).length;

      res.json({
        summary: {
          avgEngagementScore: avgScore,
          highEngagement,
          lowEngagement,
          activeSignals: signals.length,
          pendingActions: actions.length,
          totalEvents: events.length,
        },
        scores: enrichedScores,
        signals: enrichedSignals,
        actions: enrichedActions,
        recentEvents: enrichedEvents,
      });
    } catch (err: any) {
      logger.error({ err }, "[Engagement] Dashboard error");
      res.status(500).json({ error: "Failed to fetch engagement dashboard" });
    }
  });
}
