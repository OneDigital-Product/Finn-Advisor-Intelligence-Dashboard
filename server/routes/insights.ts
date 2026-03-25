import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { generateInsightsForAdvisor, generateInsightsForClient, pruneExpiredInsights } from "../engines/insights-engine";
import { storage } from "../storage";

export function registerInsightsRoutes(app: Express) {
  app.post("/api/insights/generate", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      await pruneExpiredInsights();
      const summary = await generateInsightsForAdvisor(advisor.id);
      res.json(summary);
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Generate error");
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.get("/api/insights/dashboard", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const dashboard = await storage.getInsightsDashboard(advisor.id);
      res.json(dashboard);
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Dashboard error");
      res.status(500).json({ error: "Failed to fetch insights dashboard" });
    }
  });

  app.get("/api/insights/book-wide", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const limit = Math.min(parseInt(String(req.query.limit)) || 50, 200);
      const offset = parseInt(String(req.query.offset)) || 0;
      const dismissed = (req.query.dismissed as string) === "true";

      const insights = await storage.getInsightsByAdvisor(advisor.id, { limit, offset, dismissed });
      res.json({ insights, limit, offset });
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Book-wide error");
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.get("/api/insights/opportunities", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const result = await storage.getInsightOpportunities(advisor.id);
      res.json(result);
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Opportunities error");
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/clients/:id/insights", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.id as string));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      const type = req.query.type as string | undefined;
      const severity = req.query.severity as string | undefined;
      const insights = await storage.getInsightsByClient((req.params.id as string), { type, severity });
      res.json({ insights });
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Client insights error");
      res.status(500).json({ error: "Failed to fetch client insights" });
    }
  });

  app.post("/api/clients/:id/insights/generate", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.id as string));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      const summary = await generateInsightsForClient((req.params.id as string), advisor.id);
      res.json(summary);
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Client generate error");
      res.status(500).json({ error: "Failed to generate client insights" });
    }
  });

  app.patch("/api/insights/:id/read", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const insight = await storage.getInsightById((req.params.id as string));
      if (!insight) return res.status(404).json({ error: "Insight not found" });
      if (insight.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      await storage.markInsightRead((req.params.id as string));
      res.json({ success: true });
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Mark read error");
      res.status(500).json({ error: "Failed to mark insight as read" });
    }
  });

  app.patch("/api/insights/:id/dismiss", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const insight = await storage.getInsightById((req.params.id as string));
      if (!insight) return res.status(404).json({ error: "Insight not found" });
      if (insight.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      await storage.dismissInsight((req.params.id as string));
      res.json({ success: true });
    } catch (err: any) {
      logger.error({ err: err }, "[Insights] Dismiss error");
      res.status(500).json({ error: "Failed to dismiss insight" });
    }
  });
}
