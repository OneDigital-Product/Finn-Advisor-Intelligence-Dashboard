import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { AlertEngine, type AlertType } from "../engines/alert-engine";
import { storage } from "../storage";

const engine = new AlertEngine();

export function registerAlertGenerationRoutes(app: Express) {
  app.post("/api/alerts/generate", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { types } = req.body || {};
      const alertTypes = types as AlertType[] | undefined;

      const result = await engine.run(advisor.id, alertTypes);
      res.json({ success: true, ...result });
    } catch (err: any) {
      logger.error({ err }, "API error");
      res.status(500).json({ error: "Alert generation failed" });
    }
  });

  app.get("/api/alerts/dashboard", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const summary = await storage.getAlertDashboardSummary(advisor.id);
      res.json(summary);
    } catch (err: any) {
      logger.error({ err }, "API error");
      res.status(500).json({ error: "Failed to get dashboard summary" });
    }
  });

  app.patch("/api/alerts/:id/dismiss", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const result = await storage.dismissAlert((req.params.id as string), advisor.id);
      if (!result) return res.status(404).json({ message: "Alert not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });

  app.get("/api/alerts/config", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const config = await storage.getAlertConfig(advisor.id);
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to get alert config" });
    }
  });

  app.patch("/api/alerts/config", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { alertType, enabled, threshold } = req.body;
      if (!alertType) return res.status(400).json({ error: "alertType required" });

      const result = await storage.upsertAlertConfig(advisor.id, alertType, { enabled, threshold });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  app.post("/api/alerts/prune", requireAuth, requireAdvisor, async (_req, res) => {
    try {
      const pruned = await engine.pruneDismissedAlerts(30);
      res.json({ success: true, pruned });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to prune alerts" });
    }
  });
}
