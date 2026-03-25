import type { Express } from "express";
import { requireAuth } from "./middleware";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { createCalendlyIntegration } from "../integrations/calendly";
import { encryptToken, decryptToken } from "../lib/crypto";

export function registerCalendlyRoutes(app: Express) {
  app.get("/api/integrations/calendly/status", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const advisor = await storage.getAdvisor(advisorId);
      res.json({ connected: !!advisor?.calendlyAccessToken });
    } catch (err) {
      logger.error({ err }, "GET /api/integrations/calendly/status error");
      res.status(500).json({ error: "Failed to check Calendly status" });
    }
  });

  app.get("/api/integrations/calendly/event-types", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const advisor = await storage.getAdvisor(advisorId);

      if (!advisor?.calendlyAccessToken) {
        return res.status(401).json({ error: "Calendly not configured", code: "NOT_CONFIGURED" });
      }

      const token = decryptToken(advisor.calendlyAccessToken);
      const calendly = createCalendlyIntegration(token);
      const eventTypes = await calendly.getEventTypes();

      res.json(eventTypes);
    } catch (err) {
      logger.error({ err }, "GET /api/integrations/calendly/event-types error");
      res.status(500).json({ error: "Failed to fetch event types" });
    }
  });

  app.get("/api/integrations/calendly/link/:eventTypeId", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const advisor = await storage.getAdvisor(advisorId);

      if (!advisor?.calendlyAccessToken) {
        return res.status(401).json({ error: "Calendly not configured" });
      }

      const token = decryptToken(advisor.calendlyAccessToken);
      const calendly = createCalendlyIntegration(token);
      const bookingUrl = await calendly.getEventTypeLink((req.params.eventTypeId as string));

      if (!bookingUrl) {
        return res.status(404).json({ error: "Event type not found" });
      }

      res.json({ bookingUrl });
    } catch (err) {
      logger.error({ err }, "GET /api/integrations/calendly/link/:eventTypeId error");
      res.status(500).json({ error: "Failed to get booking link" });
    }
  });

  app.post("/api/integrations/calendly/config", requireAuth, async (req, res) => {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: "accessToken is required" });
      }

      const calendly = createCalendlyIntegration(accessToken);
      const user = await calendly.getUser();

      const encrypted = encryptToken(accessToken);
      const advisorId = req.session.userId!;
      await storage.updateAdvisor(advisorId, {
        calendlyAccessToken: encrypted,
        calendlyUserId: user.id,
      });

      res.json({ message: "Calendly connected successfully", userName: user.name });
    } catch (err) {
      logger.error({ err }, "POST /api/integrations/calendly/config error");
      res.status(400).json({ error: "Failed to connect Calendly. Please check your access token." });
    }
  });

  app.delete("/api/integrations/calendly/config", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      await storage.updateAdvisor(advisorId, {
        calendlyAccessToken: null,
        calendlyUserId: null,
      });
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "DELETE /api/integrations/calendly/config error");
      res.status(500).json({ error: "Failed to disconnect Calendly" });
    }
  });
}
