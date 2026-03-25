import type { Express, Request } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { sanitizeErrorMessage } from "../lib/error-utils";
import { salesforceSyncLog } from "@shared/schema";
import { sql } from "drizzle-orm";
import { db } from "../db";

const VALID_ACTIVITY_TYPES = [
  "call", "email", "meeting", "note", "task_completed", "portfolio_update",
  "document_shared", "recommendation_made", "trade_executed", "transfer_processed",
  "account_created", "status_change",
];

const MUTABLE_ACTIVITY_FIELDS = [
  "clientId", "type", "subject", "description", "date", "duration",
  "relatedEntityType", "relatedEntityId", "metadata",
];

function qs(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function pickFields(body: Record<string, any>, allowed: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) result[key] = body[key];
  }
  return result;
}

export function registerActivityHistoryRoutes(app: Express) {
  app.post("/api/activities", requireAuth, requireAdvisor, async (req: Request, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const { clientId, type, subject, description, duration, relatedEntityType, relatedEntityId, metadata, date } = req.body;

      if (!clientId || !type || !subject) {
        return res.status(400).json({ error: "Missing required fields: clientId, type, subject" });
      }

      if (!VALID_ACTIVITY_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(", ")}` });
      }

      const activity = await storage.createActivity({
        advisorId: advisor.id,
        clientId,
        type,
        subject,
        description: description || undefined,
        date: date || new Date().toISOString().split("T")[0],
        duration: duration || undefined,
        relatedEntityType: relatedEntityType || undefined,
        relatedEntityId: relatedEntityId || undefined,
        metadata: metadata || undefined,
        salesforceSyncStatus: "pending",
      });

      await storage.createAuditLogEntry({
        action: "create",
        entityType: "activity",
        entityId: activity.id,
        advisorId: advisor.id,
        newValue: activity as any,
        description: `Created activity: ${type} - ${subject}`,
        timestamp: new Date(),
        status: "success",
      });

      try {
        await db.insert(salesforceSyncLog).values({
          recordType: "activity",
          recordId: activity.id,
          action: "create",
          status: "pending",
          syncedAt: new Date(),
        });
      } catch (_e) {}

      res.json({ success: true, activity });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to create activity") });
    }
  });

  app.get("/api/activities", requireAuth, async (req: Request, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const result = await storage.getActivitiesByFilters({
        advisorId: advisor.id,
        clientId: qs(req.query.clientId),
        type: qs(req.query.type),
        startDate: qs(req.query.startDate),
        endDate: qs(req.query.endDate),
        limit: parseInt(qs(req.query.limit) || "50"),
        offset: parseInt(qs(req.query.offset) || "0"),
      });

      const limit = parseInt(qs(req.query.limit) || "50");
      const offset = parseInt(qs(req.query.offset) || "0");

      res.json({
        success: true,
        activities: result.activities,
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.activities.length < result.total,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch activities") });
    }
  });

  app.get("/api/activities/export/:clientId", requireAuth, async (req: Request, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const clientId = String(req.params.clientId);
      const format = qs(req.query.format) || "csv";

      const result = await storage.getActivitiesByFilters({
        advisorId: advisor.id,
        clientId,
      });
      const acts = result.activities;

      let exportData: string;
      let contentType: string;
      let fileName: string;

      if (format === "json") {
        exportData = JSON.stringify(acts, null, 2);
        contentType = "application/json";
        fileName = `activities-${clientId}-${Date.now()}.json`;
      } else {
        const headers = ["Date", "Type", "Subject", "Description", "Duration (min)"];
        const rows = acts.map((a: any) => [
          a.date,
          a.type,
          a.subject,
          a.description || "",
          String(a.duration || ""),
        ]);
        exportData = [headers, ...rows].map((row: string[]) => row.map(cell => `"${cell}"`).join(",")).join("\n");
        contentType = "text/csv";
        fileName = `activities-${clientId}-${Date.now()}.csv`;
      }

      await storage.createExportHistoryRecord({
        advisorId: advisor.id,
        entityType: "activities",
        entityId: clientId,
        format,
        fileName,
        recordCount: acts.length,
        fileSize: exportData.length,
        exportTime: new Date(),
      });

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(exportData);
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to export activities") });
    }
  });

  app.get("/api/activities/client/:clientId", requireAuth, async (req: Request, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const clientId = String(req.params.clientId);
      const typesStr = qs(req.query.types);
      const limit = parseInt(qs(req.query.limit) || "50");
      const offset = parseInt(qs(req.query.offset) || "0");

      const result = await storage.getActivitiesByFilters({
        advisorId: advisor.id,
        clientId,
        type: typesStr ? typesStr.split(",")[0] : undefined,
        startDate: qs(req.query.startDate),
        endDate: qs(req.query.endDate),
        limit,
        offset,
      });

      res.json({
        success: true,
        activities: result.activities,
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.activities.length < result.total,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch client activities") });
    }
  });

  app.get("/api/activities/:id", requireAuth, async (req: Request, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const id = String(req.params.id);
      const activity = await storage.getActivity(id);

      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      if (activity.advisorId !== advisor.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      let syncLogEntry = null;
      try {
        const results = await db.select().from(salesforceSyncLog).where(sql`${salesforceSyncLog.recordId} = ${id}`);
        syncLogEntry = results[0] || null;
      } catch (_e) {}

      res.json({ success: true, activity, syncLog: syncLogEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch activity") });
    }
  });

  app.put("/api/activities/:id", requireAuth, requireAdvisor, async (req: Request, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const id = String(req.params.id);
      const existing = await storage.getActivity(id);

      if (!existing) {
        return res.status(404).json({ error: "Activity not found" });
      }

      if (existing.advisorId !== advisor.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const safeUpdates = pickFields(req.body, MUTABLE_ACTIVITY_FIELDS);
      const updated = await storage.updateActivity(id, {
        ...safeUpdates,
        salesforceSyncStatus: "pending",
      });

      await storage.createAuditLogEntry({
        action: "update",
        entityType: "activity",
        entityId: id,
        advisorId: advisor.id,
        oldValue: existing as any,
        newValue: (updated || null) as any,
        description: `Updated activity: ${existing.type} - ${existing.subject}`,
        timestamp: new Date(),
        status: "success",
      });

      res.json({ success: true, activity: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to update activity") });
    }
  });

  app.delete("/api/activities/:id", requireAuth, requireAdvisor, async (req: Request, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "No advisor session" });

      const id = String(req.params.id);
      const existing = await storage.getActivity(id);

      if (!existing) {
        return res.status(404).json({ error: "Activity not found" });
      }

      if (existing.advisorId !== advisor.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteActivity(id);

      await storage.createAuditLogEntry({
        action: "delete",
        entityType: "activity",
        entityId: id,
        advisorId: advisor.id,
        oldValue: existing as any,
        description: `Deleted activity: ${existing.type} - ${existing.subject}`,
        timestamp: new Date(),
        status: "success",
      });

      res.json({ success: true, message: "Activity deleted" });
    } catch (error: any) {
      res.status(400).json({ success: false, error: sanitizeErrorMessage(error, "Failed to delete activity") });
    }
  });
}
