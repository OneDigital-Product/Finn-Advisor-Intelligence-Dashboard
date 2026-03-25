import type { Express, Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { isMicrosoftEnabled, validateConnection, ensureValidToken, TokenRefreshError } from "../integrations/microsoft/client";
import { syncMeetingToOutlook, syncOutlookEventsToApp, cancelOutlookEvent } from "../integrations/microsoft/calendar";
import { sendFollowUpEmail, isEmailEnabled } from "../integrations/microsoft/email";
import { sanitizeErrorMessage } from "../lib/error-utils";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";

async function requireMicrosoftToken(req: Request, res: Response, next: NextFunction) {
  try {
    const session = req.session as unknown as Record<string, unknown>;
    const accessToken = await ensureValidToken(session);
    (req as any).microsoftAccessToken = accessToken;
    next();
  } catch (err) {
    if (err instanceof TokenRefreshError) {
      const statusCode = err.requiresReauth ? 401 : 503;
      return res.status(statusCode).json({
        error: sanitizeErrorMessage(err, "Microsoft authentication failed"),
        requiresReauth: err.requiresReauth,
      });
    }
    next(err);
  }
}

export function registerMicrosoftRoutes(app: Express) {
  app.get("/api/integrations/microsoft/status", requireAuth, async (req, res) => {
    try {
      const enabled = isMicrosoftEnabled();
      const emailEnabled = isEmailEnabled();
      const session = req.session as unknown as Record<string, unknown>;
      let authenticated = false;

      if (enabled && session.microsoftAccessToken) {
        try {
          const validToken = await ensureValidToken(session);
          authenticated = await validateConnection(validToken);
        } catch (err) {
          if (err instanceof TokenRefreshError) {
            authenticated = false;
          } else {
            throw err;
          }
        }
      }

      res.json({
        enabled,
        authenticated,
        emailEnabled,
        emailProvider: process.env.SENDGRID_API_KEY
          ? "sendgrid"
          : process.env.SMTP_ENABLED === "true"
            ? "smtp"
            : "none",
      });
    } catch (err: any) {
      logger.error({ err }, "Microsoft status error");
      res.status(500).json({ error: "Failed to get Microsoft status" });
    }
  });

  app.post("/api/integrations/microsoft/calendar/sync", requireAuth, requireAdvisor, requireMicrosoftToken, async (req, res) => {
    try {
      const accessToken = (req as any).microsoftAccessToken as string;
      const { direction = "outbound" } = req.query;
      const advisor = await getSessionAdvisor(req);

      if (direction === "inbound") {
        if (!advisor) {
          return res.status(401).json({ error: "No advisor session" });
        }
        const result = await syncOutlookEventsToApp(accessToken, advisor.id);
        res.json({ success: true, ...result });
      } else {
        res.json({ success: true, synced: 0, failed: 0 });
      }
    } catch (err: any) {
      logger.error({ err }, "API error");
      res.status(500).json({ error: "Calendar sync failed" });
    }
  });

  app.post("/api/integrations/microsoft/calendar/sync-meeting/:meetingId", requireAuth, requireAdvisor, requireMicrosoftToken, async (req, res) => {
    try {
      const accessToken = (req as any).microsoftAccessToken as string;
      const { meetingId } = req.params;
      const result = await syncMeetingToOutlook(meetingId, accessToken);
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "Meeting sync error");
      res.status(500).json({ error: "Failed to sync meeting to Outlook" });
    }
  });

  app.post("/api/integrations/microsoft/calendar/cancel-event/:meetingId", requireAuth, requireAdvisor, requireMicrosoftToken, async (req, res) => {
    try {
      const accessToken = (req as any).microsoftAccessToken as string;
      const { meetingId } = req.params;
      const result = await cancelOutlookEvent(meetingId, accessToken);
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "Cancel event error");
      res.status(500).json({ error: "Failed to cancel Outlook event" });
    }
  });

  app.post("/api/integrations/microsoft/test-email", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const { recipientEmail } = req.body;
      if (!recipientEmail) {
        return res.status(400).json({ error: "recipientEmail required" });
      }

      const result = await sendFollowUpEmail({
        clientName: "Test User",
        clientEmail: recipientEmail,
        advisorName: "Test Advisor",
        meetingNotes: "This is a test email from the Advisor Intelligence Suite.",
      });

      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "Test email error");
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  app.post("/api/microsoft/outlook/resolve-conflict", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const { meetingId, resolution } = req.body;
      if (!meetingId || !["keep_local", "use_remote"].includes(resolution)) {
        return res.status(400).json({ error: "meetingId and resolution (keep_local | use_remote) are required" });
      }

      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });

      const advisor = await getSessionAdvisor(req);
      if (!advisor || meeting.advisorId !== advisor.id) return res.status(403).json({ error: "Forbidden" });

      const session = req.session as unknown as Record<string, unknown>;
      const accessToken = session.microsoftAccessToken as string | undefined;

      if (resolution === "keep_local") {
        if (!accessToken) {
          return res.status(401).json({ error: "Microsoft not authenticated" });
        }
        if (!meeting.outlookEventId) {
          return res.status(400).json({ error: "No Outlook event linked to this meeting" });
        }
        try {
          const { getGraphClient } = await import("../integrations/microsoft/client");
          const client = await getGraphClient(accessToken);
          if (!client) {
            return res.status(503).json({ error: "Could not connect to Microsoft Graph" });
          }
          await client.api(`/me/events/${meeting.outlookEventId}`).patch({
            subject: meeting.title,
            start: { dateTime: meeting.startTime, timeZone: "UTC" },
            end: { dateTime: meeting.endTime, timeZone: "UTC" },
            location: meeting.location ? { displayName: meeting.location } : undefined,
          });
        } catch (pushErr: any) {
          logger.error({ err: pushErr }, "Failed to push local state to Outlook");
          return res.status(500).json({ error: "Failed to push local changes to Outlook" });
        }
        await storage.updateMeetingOutlookSyncStatus(meetingId, "synced");
        res.json({ success: true, resolution: "keep_local", meeting });
      } else {
        if (!accessToken) {
          return res.status(401).json({ error: "Microsoft not authenticated" });
        }

        if (!meeting.outlookEventId) {
          return res.status(400).json({ error: "No Outlook event linked to this meeting" });
        }

        const { getGraphClient } = await import("../integrations/microsoft/client");
        const client = await getGraphClient(accessToken);
        if (!client) {
          return res.status(503).json({ error: "Could not connect to Microsoft Graph" });
        }

        const remoteEvent = await client.api(`/me/events/${meeting.outlookEventId}`).get();
        await storage.updateMeeting(meetingId, {
          title: remoteEvent.subject,
          startTime: remoteEvent.start.dateTime,
          endTime: remoteEvent.end.dateTime,
          location: remoteEvent.location?.displayName || null,
        });
        await storage.updateMeetingOutlookSyncStatus(meetingId, "synced");
        const updated = await storage.getMeeting(meetingId);
        res.json({ success: true, resolution: "use_remote", meeting: updated });
      }
    } catch (err: any) {
      logger.error({ err }, "Outlook conflict resolution error");
      res.status(500).json({ error: "Failed to resolve conflict" });
    }
  });
}
