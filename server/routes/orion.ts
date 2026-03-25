import type { Express } from "express";
import { logger } from "../lib/logger";
import { isOrionEnabled, validateConnection } from "../integrations/orion/client";
import { syncAllAccounts } from "../integrations/orion/portfolio-sync";
import { reconcileAccounts } from "../integrations/orion/reconciliation";
import { getPortfolioSyncSchedule } from "../scheduler";
import { requireAuth, requireAdvisor } from "./middleware";
import { storage } from "../storage";

export function registerOrionRoutes(app: Express) {
  app.get("/api/integrations/orion/status", requireAuth, async (_req, res) => {
    try {
      const enabled = isOrionEnabled();
      let authenticated = false;

      if (enabled) {
        authenticated = await validateConnection();
      }

      const syncLogs = await storage.getRecentOrionSyncLogs(10);
      const syncSchedule = getPortfolioSyncSchedule();

      res.json({
        enabled,
        authenticated,
        lastSync: syncLogs[0]?.syncedAt || null,
        recentSyncs: syncLogs,
        scheduledSync: {
          enabled: syncSchedule.enabled,
          intervalMs: syncSchedule.intervalMs,
          lastSyncAt: syncSchedule.lastSyncAt,
          nextSyncAt: syncSchedule.nextSyncAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to get Orion status" });
    }
  });

  app.post("/api/integrations/orion/sync", requireAuth, requireAdvisor, async (req, res) => {
    try {
      if (!isOrionEnabled()) {
        return res.status(400).json({ error: "Orion integration not enabled" });
      }

      const { full, accountIds } = req.query;
      const result = await syncAllAccounts({
        fullSync: full === "true",
        specificAccountIds: accountIds
          ? (accountIds as string).split(",")
          : undefined,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      logger.error({ err }, "API error");
      res.status(500).json({ error: "Sync failed" });
    }
  });

  app.post("/api/integrations/orion/reconcile", requireAuth, requireAdvisor, async (_req, res) => {
    try {
      if (!isOrionEnabled()) {
        return res.status(400).json({ error: "Orion integration not enabled" });
      }

      const report = await reconcileAccounts();
      res.json({ success: true, report });
    } catch (err: any) {
      logger.error({ err }, "API error");
      res.status(500).json({ error: "Reconciliation failed" });
    }
  });
}
