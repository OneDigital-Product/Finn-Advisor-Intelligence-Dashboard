import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { sanitizeErrorMessage } from "../lib/error-utils";

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 30;

function qs(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function registerLoginEventRoutes(app: Express) {
  app.post("/api/login-events", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const { logoutTime, loginEventId } = req.body;

      if (logoutTime && loginEventId) {
        const updated = await storage.recordLogout(loginEventId);
        if (!updated) {
          return res.status(404).json({ error: "Login event not found" });
        }
        if (updated.userId !== advisor.id) {
          return res.status(403).json({ error: "Unauthorized" });
        }
        return res.json({ success: true, message: "Logout recorded", loginEvent: updated });
      }

      const loginEvent = await storage.recordLoginEvent({
        userId: advisor.id,
        userType: "advisor",
        userName: advisor.name,
        userEmail: advisor.email,
        ipAddress: req.ip || undefined,
        deviceInfo: req.get("user-agent") || undefined,
        mfaStatus: req.body.mfaUsed || false,
        status: "success",
      });

      res.json({ success: true, loginEvent });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to record login event") });
    }
  });

  app.post("/api/login-events/failed", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const { reason } = req.body;
      const ipAddress = req.ip || "unknown";

      const existing = await storage.getFailedLoginAttempts({ advisorId: advisor.id, ipAddress });
      const recentAttempt = existing.find(a =>
        a.blockedUntil && new Date(a.blockedUntil) > new Date()
      );

      if (recentAttempt) {
        return res.status(429).json({
          error: "Account temporarily blocked due to too many failed attempts",
          blockedUntil: recentAttempt.blockedUntil,
        });
      }

      const currentCount = existing.length > 0 ? (existing[0].count || 0) + 1 : 1;
      const blockedUntil = currentCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000)
        : undefined;

      const attempt = await storage.createFailedLoginAttempt({
        advisorId: advisor.id,
        ipAddress,
        reason: reason || "invalid_credentials",
        count: currentCount,
        lastAttemptTime: new Date(),
        blockedUntil: blockedUntil || undefined,
      });

      const isSuspicious = currentCount >= MAX_FAILED_ATTEMPTS;

      res.json({
        success: true,
        attempt,
        suspicious: isSuspicious,
        blocked: !!blockedUntil,
        blockedUntil: blockedUntil || null,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to record failed login attempt") });
    }
  });

  app.get("/api/login-events/:advisorId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const advisorId = String(req.params.advisorId);
      if (advisorId !== advisor.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const limitStr = qs(req.query.limit) || "50";
      const offsetStr = qs(req.query.offset) || "0";

      const result = await storage.getLoginEventsByAdvisor(
        advisorId,
        parseInt(limitStr),
        parseInt(offsetStr)
      );

      res.json({
        success: true,
        loginEvents: result.events,
        total: result.total,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch login events") });
    }
  });

  app.get("/api/login-events/failed/list", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const limitStr = qs(req.query.limit) || "50";
      const offsetStr = qs(req.query.offset) || "0";

      const failedAttempts = await storage.getFailedLoginAttempts({
        advisorId: advisor.id,
        limit: parseInt(limitStr),
        offset: parseInt(offsetStr),
      });

      res.json({ success: true, failedAttempts });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch failed login attempts") });
    }
  });
}
