import type { Express } from "express";
import { requireAdvisor } from "./middleware";
import { getAllFlags, updateFlag, isFeatureEnabled, invalidateCache } from "../lib/feature-flags";
import { storage } from "../storage";
import { logger } from "../lib/logger";

export function registerFeatureFlagRoutes(app: Express) {
  app.get("/api/admin/flags", requireAdvisor, async (_req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (err) {
      logger.error({ err }, "Failed to fetch feature flags");
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  app.post("/api/admin/flags/:key", requireAdvisor, async (req, res) => {
    try {
      const key = req.params.key as string;
      const { enabled, rolloutPercentage } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }

      if (rolloutPercentage !== undefined && (rolloutPercentage < 0 || rolloutPercentage > 100)) {
        return res.status(400).json({ message: "rolloutPercentage must be 0-100" });
      }

      const result = await updateFlag(key, enabled, rolloutPercentage);
      if (!result) {
        return res.status(404).json({ message: "Flag not found" });
      }

      res.json(result);
    } catch (err) {
      logger.error({ err, key: (req.params.key as string) }, "Failed to update feature flag");
      res.status(500).json({ message: "Failed to update feature flag" });
    }
  });

  app.get("/api/flags/:key/status", async (req, res) => {
    try {
      const key = req.params.key as string;
      const userId = req.session?.userId;
      const enabled = await isFeatureEnabled(key, userId);
      res.json({ key, enabled });
    } catch (err) {
      logger.error({ err, key: (req.params.key as string) }, "Failed to check flag status");
      res.status(500).json({ message: "Failed to check flag status" });
    }
  });
}
