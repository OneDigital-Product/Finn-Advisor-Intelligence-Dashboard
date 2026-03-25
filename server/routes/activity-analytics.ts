import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { sanitizeErrorMessage } from "../lib/error-utils";

function qstr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export function registerActivityAnalyticsRoutes(app: Express) {
  app.get("/api/analytics/activities/summary", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const startDate = qstr(req.query.startDate);
      const endDate = qstr(req.query.endDate);
      const clientId = qstr(req.query.clientId);

      const summary = await storage.getActivitySummary(advisor.id, {
        startDate,
        endDate,
        clientId,
      });

      const total = Object.values(summary).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        summary,
        total,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch activity summary") });
    }
  });

  app.get("/api/analytics/engagement/:clientId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const clientId = String(req.params.clientId);
      const engagement = await storage.getClientEngagement(advisor.id, clientId);

      res.json({ success: true, engagement });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch client engagement") });
    }
  });

  app.get("/api/analytics/advisor-productivity", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const startDate = qstr(req.query.startDate);
      const endDate = qstr(req.query.endDate);

      const productivity = await storage.getAdvisorProductivity(advisor.id, {
        startDate,
        endDate,
      });

      res.json({ success: true, productivity });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch advisor productivity") });
    }
  });

  app.get("/api/analytics/activity-trends", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const startDate = qstr(req.query.startDate);
      const endDate = qstr(req.query.endDate);
      const period = qstr(req.query.period);

      const trends = await storage.getActivityTrends(advisor.id, {
        startDate,
        endDate,
        period,
      });

      res.json({ success: true, trends });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch activity trends") });
    }
  });
}
