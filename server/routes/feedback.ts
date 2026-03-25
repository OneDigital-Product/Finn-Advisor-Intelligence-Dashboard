import type { Express } from "express";
import { requireAuth } from "./middleware";
import { requireAdvisor } from "./middleware";
import { storage } from "../storage";
import { logger } from "../lib/logger";

export function registerFeedbackRoutes(app: Express) {
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const { type, message, pageUrl } = req.body;

      if (!message || message.length < 10) {
        return res.status(400).json({ message: "Message must be at least 10 characters" });
      }

      if (message.length > 500) {
        return res.status(400).json({ message: "Message must be 500 characters or less" });
      }

      const validTypes = ["bug", "feature", "feedback"];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ message: "Type must be bug, feature, or feedback" });
      }

      const userId = req.session.userId;
      let email: string | undefined;
      if (req.session.userType === "advisor") {
        const advisor = await storage.getAdvisor(userId!);
        email = advisor?.email;
      } else {
        const associate = await storage.getAssociate(userId!);
        email = associate?.email;
      }

      await storage.createPilotFeedback({
        userId: userId || null,
        type,
        message,
        pageUrl: pageUrl || null,
        email: email || null,
      });

      logger.info({ userId, type }, "Pilot feedback received");
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Error saving feedback");
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  app.get("/api/admin/feedback", requireAdvisor, async (_req, res) => {
    try {
      const feedback = await storage.getPilotFeedback();
      res.json(feedback);
    } catch (err) {
      logger.error({ err }, "Error fetching feedback");
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get("/api/admin/feedback/stats", requireAdvisor, async (_req, res) => {
    try {
      const stats = await storage.getPilotFeedbackStats();
      res.json(stats);
    } catch (err) {
      logger.error({ err }, "Error fetching feedback stats");
      res.status(500).json({ message: "Failed to fetch feedback stats" });
    }
  });
}
