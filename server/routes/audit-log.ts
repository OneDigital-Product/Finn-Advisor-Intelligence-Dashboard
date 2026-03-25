import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { sanitizeErrorMessage } from "../lib/error-utils";

function qs(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function registerAuditLogRoutes(app: Express) {
  app.get("/api/audit-log", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const action = qs(req.query.action);
      const entityType = qs(req.query.entityType);
      const entityId = qs(req.query.entityId);
      const startDate = qs(req.query.startDate);
      const endDate = qs(req.query.endDate);
      const limitStr = qs(req.query.limit) || "50";
      const offsetStr = qs(req.query.offset) || "0";

      const result = await storage.getAuditLog({
        action,
        entityType,
        entityId,
        advisorId: advisor.id,
        startDate,
        endDate,
        limit: parseInt(limitStr),
        offset: parseInt(offsetStr),
      });

      res.json({
        success: true,
        logs: result.logs,
        total: result.total,
        limit: parseInt(limitStr),
        offset: parseInt(offsetStr),
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch audit log") });
    }
  });

  app.get("/api/audit-log/entity/:type/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const type = String(req.params.type);
      const id = String(req.params.id);
      const allLogs = await storage.getAuditLogByEntity(type, id);
      const logs = allLogs.filter(l => l.advisorId === advisor.id);
      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch entity audit log") });
    }
  });

  app.get("/api/audit-log/user/:advisorId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const advisorId = String(req.params.advisorId);
      if (advisorId !== advisor.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const logs = await storage.getAuditLogByAdvisor(advisorId);
      res.json({ success: true, logs, count: logs.length });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch advisor audit log") });
    }
  });

  app.post("/api/audit-log/report", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const { startDate, endDate, entityTypes, actions } = req.body;

      const result = await storage.getAuditLog({
        startDate,
        endDate,
        advisorId: advisor.id,
        limit: 10000,
      });

      let logs = result.logs;

      if (entityTypes && entityTypes.length > 0) {
        logs = logs.filter((l: any) => entityTypes.includes(l.entityType));
      }
      if (actions && actions.length > 0) {
        logs = logs.filter((l: any) => actions.includes(l.action));
      }

      const actionsByType: Record<string, number> = {};
      const actionsByEntity: Record<string, number> = {};
      for (const log of logs) {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
        actionsByEntity[log.entityType] = (actionsByEntity[log.entityType] || 0) + 1;
      }

      res.json({
        success: true,
        report: {
          generatedAt: new Date(),
          period: { startDate, endDate },
          totalActions: logs.length,
          actionsByType,
          actionsByEntity,
          logs,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to generate audit report") });
    }
  });
}
