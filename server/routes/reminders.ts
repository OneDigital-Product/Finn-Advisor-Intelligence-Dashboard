import type { Express } from "express";
import { requireAuth } from "./middleware";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { checkAndCreateReminders, getProfileReminders } from "../engines/reminder-engine";

export function registerReminderRoutes(app: Express) {
  app.get("/api/reminders/check", requireAuth, async (req, res) => {
    try {
      const { days, includeExpired } = req.query;
      const advisorId = req.session.userId!;

      const daysArray = days
        ? String(days).split(",").map(Number).filter((n) => !isNaN(n))
        : [30, 60, 90];

      const result = await checkAndCreateReminders(
        storage,
        advisorId,
        daysArray,
        includeExpired !== "false"
      );

      res.json({
        ...result,
        summary: `Created ${result.createdTasks} reminder tasks, skipped ${result.skippedDuplicates} duplicates`,
      });
    } catch (err) {
      logger.error({ err }, "GET /api/reminders/check error");
      res.status(500).json({ error: "Failed to check reminders" });
    }
  });

  app.get("/api/reminders/pending", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const reminders = await getProfileReminders(storage, advisorId);
      res.json(reminders);
    } catch (err) {
      logger.error({ err }, "GET /api/reminders/pending error");
      res.status(500).json({ error: "Failed to fetch pending reminders" });
    }
  });
}
