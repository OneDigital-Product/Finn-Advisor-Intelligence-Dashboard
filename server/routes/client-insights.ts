import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { generateClientInsights } from "../engines/client-insights-engine";

const alertStatusStore = new Map<string, { status: string; updatedAt: string }>();

export function registerClientInsightsRoutes(app: Express) {
  app.get("/api/client-insights", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const dashboard = await generateClientInsights(advisor.id);

      dashboard.alerts = dashboard.alerts.map(alert => {
        const stored = alertStatusStore.get(alert.id);
        if (stored) {
          return { ...alert, status: stored.status as typeof alert.status };
        }
        return alert;
      });

      res.json(dashboard);
    } catch (err: unknown) {
      logger.error({ err }, "[ClientInsights] Dashboard error");
      res.status(500).json({ error: "Failed to generate client insights dashboard" });
    }
  });

  app.patch("/api/client-insights/alerts/:alertId/status", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const alertId = req.params.alertId as string;
      const { status } = req.body as { status: string };

      if (!alertId.startsWith(advisor.id + "-")) {
        return res.status(403).json({ error: "Alert does not belong to this advisor" });
      }

      const validStatuses = ["open", "in-progress", "completed", "deferred"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }

      alertStatusStore.set(alertId, { status, updatedAt: new Date().toISOString() });
      logger.info({ alertId, status }, "[ClientInsights] Alert status updated");

      res.json({ alertId, status, updatedAt: alertStatusStore.get(alertId)!.updatedAt });
    } catch (err: unknown) {
      logger.error({ err }, "[ClientInsights] Alert status update error");
      res.status(500).json({ error: "Failed to update alert status" });
    }
  });
}
