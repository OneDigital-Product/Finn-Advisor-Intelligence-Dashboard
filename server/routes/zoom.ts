import type { Express } from "express";
import { logger } from "../lib/logger";
import { isZoomEnabled, validateConnection } from "../integrations/zoom/client";
import { createZoomMeeting } from "../integrations/zoom/meetings";
import { handleRecordingComplete, verifyZoomSignature } from "../integrations/zoom/webhooks";
import { requireAuth, requireAdvisor } from "./middleware";

export function registerZoomRoutes(app: Express) {
  app.get("/api/integrations/zoom/status", requireAuth, async (_req, res) => {
    try {
      const enabled = isZoomEnabled();
      let authenticated = false;

      if (enabled) {
        authenticated = await validateConnection();
      }

      res.json({ enabled, authenticated });
    } catch (err: any) {
      logger.error({ err }, "Zoom status error");
      res.status(500).json({ error: "Failed to get Zoom status" });
    }
  });

  app.post("/api/integrations/zoom/meetings", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const { meetingId } = req.body;
      if (!meetingId) {
        return res.status(400).json({ error: "meetingId required" });
      }

      if (!isZoomEnabled()) {
        return res.status(400).json({ error: "Zoom integration not enabled" });
      }

      const result = await createZoomMeeting(meetingId);
      if (!result) {
        return res.status(500).json({ error: "Failed to create Zoom meeting" });
      }

      res.json({ success: true, ...result });
    } catch (err: any) {
      logger.error({ err }, "Create Zoom meeting error");
      res.status(500).json({ error: "Failed to create Zoom meeting" });
    }
  });

  app.post("/api/integrations/zoom/webhooks", async (req, res) => {
    try {
      const body = JSON.stringify(req.body);

      // Fail-closed: reject if no secret is configured (misconfiguration)
      if (!process.env.ZOOM_WEBHOOK_SECRET) {
        logger.warn("[Zoom Webhook] ZOOM_WEBHOOK_SECRET not configured — rejecting webhook");
        return res.status(403).json({ error: "Webhook secret not configured" });
      }

      if (!verifyZoomSignature(req as any, body)) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const event = req.body;

      if (event.event === "endpoint.url_validation") {
        const crypto = await import("crypto");
        const hashForValidation = crypto
          .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET || "")
          .update(event.payload?.plainToken || "")
          .digest("hex");
        return res.json({
          plainToken: event.payload?.plainToken,
          encryptedToken: hashForValidation,
        });
      }

      if (event.event === "recording.completed") {
        await handleRecordingComplete(event.payload || event);
      }

      res.json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Zoom webhook error");
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });
}
