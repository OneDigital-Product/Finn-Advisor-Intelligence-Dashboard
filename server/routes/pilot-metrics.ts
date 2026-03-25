import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { calculateAllGates, clearGateCache } from "../engines/pilot-metrics";
import { logger } from "../lib/logger";

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function requireAdvisor(req: Request, res: Response, next: Function) {
  if (!req.session?.userId || req.session?.userType !== "advisor") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function registerPilotMetricsRoutes(app: Express) {
  app.get("/api/admin/gates", requireAdvisor, async (_req: Request, res: Response) => {
    try {
      const snapshot = await calculateAllGates();
      res.json(snapshot);
    } catch (err) {
      logger.error({ err }, "Failed to calculate gates");
      res.status(500).json({ error: "Failed to calculate gates" });
    }
  });

  app.get("/api/admin/metrics", requireAdvisor, async (_req: Request, res: Response) => {
    try {
      const [loginEvents, surveyResponses, healthChecks] = await Promise.all([
        storage.getLoginEvents(30),
        storage.getSurveyResponses(30),
        storage.getHealthChecks(60),
      ]);

      const activeUsersByDay: Record<string, Set<string>> = {};
      for (const event of loginEvents) {
        const day = new Date(event.timestamp).toISOString().split("T")[0];
        if (!activeUsersByDay[day]) activeUsersByDay[day] = new Set();
        activeUsersByDay[day].add(event.userId);
      }
      const activeUsersTrend = Object.entries(activeUsersByDay)
        .map(([date, users]) => ({ date, count: users.size }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const npsByDay: Record<string, { sum: number; count: number }> = {};
      for (const resp of surveyResponses) {
        const day = resp.createdAt ? new Date(resp.createdAt).toISOString().split("T")[0] : "unknown";
        if (!npsByDay[day]) npsByDay[day] = { sum: 0, count: 0 };
        npsByDay[day].sum += resp.rating;
        npsByDay[day].count += 1;
      }
      const npsTrend = Object.entries(npsByDay)
        .map(([date, data]) => ({ date, nps: Math.round((data.sum / data.count) * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const uptimeByDay: Record<string, { success: number; total: number }> = {};
      for (const check of healthChecks) {
        const day = check.checkedAt ? new Date(check.checkedAt).toISOString().split("T")[0] : "unknown";
        if (!uptimeByDay[day]) uptimeByDay[day] = { success: 0, total: 0 };
        uptimeByDay[day].total += 1;
        if (check.status === 200) uptimeByDay[day].success += 1;
      }
      const uptimeTrend = Object.entries(uptimeByDay)
        .map(([date, data]) => ({ date, uptime: data.total > 0 ? Math.round((data.success / data.total) * 10000) / 100 : 0 }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({ activeUsersTrend, npsTrend, uptimeTrend });
    } catch (err) {
      logger.error({ err }, "Failed to fetch metrics");
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  app.post("/api/admin/gates/:gate/signoff", requireAdvisor, async (req: Request, res: Response) => {
    try {
      const gate = req.params.gate as string;
      const { signedOffBy, title, reason } = req.body;

      if (!signedOffBy || !title) {
        return res.status(400).json({ error: "signedOffBy and title are required" });
      }

      const signoff = await storage.createGateSignoff({
        gate,
        signedOffBy,
        title,
        reason: reason || null,
      });

      clearGateCache();
      res.json(signoff);
    } catch (err) {
      logger.error({ err }, "Failed to create gate signoff");
      res.status(500).json({ error: "Failed to create gate signoff" });
    }
  });

  app.get("/api/admin/signoffs", requireAdvisor, async (_req: Request, res: Response) => {
    try {
      const signoffs = await storage.getGateSignoffs();
      res.json(signoffs);
    } catch (err) {
      logger.error({ err }, "Failed to fetch signoffs");
      res.status(500).json({ error: "Failed to fetch signoffs" });
    }
  });

  app.post("/api/survey", requireAuth, async (req: Request, res: Response) => {
    try {
      const { rating, comment, pageUrl } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      const response = await storage.createSurveyResponse({
        userId: req.session!.userId!,
        rating,
        comment: comment || null,
        pageUrl: pageUrl || null,
      });

      res.json(response);
    } catch (err) {
      logger.error({ err }, "Failed to submit survey");
      res.status(500).json({ error: "Failed to submit survey" });
    }
  });
}
