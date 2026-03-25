import type { Express } from "express";
import { requireAuth } from "./middleware";
import { logger } from "../lib/logger";
import { sseEventBus } from "../lib/sse-event-bus";
import { db } from "../db";
import { approvalItems, approvalRules, validationResults } from "@shared/schema";
import { insertApprovalItemSchema } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  evaluateAutoApprove,
  applyApprovalChange,
  getApprovalRulesForType,
} from "../engines/approval-engine";
import {
  runAllValidators,
  persistValidationResults,
} from "../engines/submission-validator";
import { AuditLogger } from "../integrations/cassidy/audit-logger";

export function registerApprovalRoutes(app: Express) {
  app.post("/api/approvals", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const parsed = insertApprovalItemSchema.safeParse({
        ...req.body,
        submittedBy: advisorId,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      }

      const payload = (parsed.data.payload || {}) as Record<string, unknown>;
      const validationCtx = {
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId || undefined,
        payload,
        clientId: (payload.clientId as string) || parsed.data.entityId || undefined,
      };

      let validationSummary;
      try {
        validationSummary = await runAllValidators(validationCtx);
      } catch (validationErr) {
        logger.error({ err: validationErr }, "Pre-submission validation failed (non-blocking)");
        validationSummary = null;
      }

      const rules = await getApprovalRulesForType(parsed.data.itemType);
      const autoResult = evaluateAutoApprove(parsed.data, rules);

      const validationPassed = validationSummary ? validationSummary.passed : true;
      const effectiveAutoApproved = autoResult.autoApproved && validationPassed;

      const [item] = await db
        .insert(approvalItems)
        .values({
          ...parsed.data,
          status: effectiveAutoApproved ? "approved" : "pending",
          reviewedBy: effectiveAutoApproved ? "system" : null,
          reviewedAt: effectiveAutoApproved ? new Date() : null,
          comments: effectiveAutoApproved
            ? autoResult.reason
            : autoResult.autoApproved && !validationPassed
              ? "Auto-approval blocked by validation failures"
              : null,
        })
        .returning();

      if (validationSummary) {
        try {
          await persistValidationResults(
            item.id,
            validationSummary,
            advisorId,
            parsed.data.entityType,
            parsed.data.entityId
          );
        } catch (persistErr) {
          logger.error({ err: persistErr, itemId: item.id }, "Failed to persist validation results");
        }
      }

      logger.info(
        {
          itemId: item.id,
          autoApproved: effectiveAutoApproved,
          validationPassed,
          failCount: validationSummary?.failCount || 0,
        },
        "Approval item created"
      );

      sseEventBus.publishToUser(advisorId, "approval:new", {
        itemId: item.id,
        itemType: item.itemType,
        priority: item.priority,
        status: item.status,
        autoApproved: autoResult.autoApproved,
      });

      res.status(201).json({ ...item, autoApproved: autoResult.autoApproved });
    } catch (err: any) {
      logger.error({ err }, "POST /api/approvals error");
      res.status(500).json({ error: "Failed to create approval item" });
    }
  });

  app.get("/api/approvals", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const { itemType, status, priority } = req.query;

      // Scope to the requesting advisor's approvals to prevent cross-tenant leakage
      let conditions: any[] = [eq(approvalItems.submittedBy, advisorId)];
      if (itemType) conditions.push(eq(approvalItems.itemType, itemType as string));
      if (status) conditions.push(eq(approvalItems.status, status as string));
      if (priority) conditions.push(eq(approvalItems.priority, priority as string));

      const items = await db
        .select()
        .from(approvalItems)
        .where(and(...conditions))
        .orderBy(desc(approvalItems.createdAt))
        .limit(100);

      res.json(items);
    } catch (err: any) {
      logger.error({ err }, "GET /api/approvals error");
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  app.get("/api/approvals/stats", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;

      const result = await db
        .select({
          status: approvalItems.status,
          count: sql<number>`count(*)::int`,
        })
        .from(approvalItems)
        .where(eq(approvalItems.submittedBy, advisorId))
        .groupBy(approvalItems.status);

      const stats: Record<string, number> = {};
      for (const row of result) {
        stats[row.status] = row.count;
      }

      const urgentResult = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(approvalItems)
        .where(
          and(
            eq(approvalItems.submittedBy, advisorId),
            eq(approvalItems.status, "pending"),
            eq(approvalItems.priority, "urgent")
          )
        );

      res.json({
        ...stats,
        total: Object.values(stats).reduce((a, b) => a + b, 0),
        urgent: urgentResult[0]?.count ?? 0,
      });
    } catch (err: any) {
      logger.error({ err }, "GET /api/approvals/stats error");
      res.status(500).json({ error: "Failed to fetch approval stats" });
    }
  });

  app.get("/api/approvals/:id", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const id = req.params.id as string;

      const [item] = await db
        .select()
        .from(approvalItems)
        .where(and(eq(approvalItems.id, id), eq(approvalItems.submittedBy, advisorId)));

      if (!item) {
        return res.status(404).json({ error: "Approval item not found" });
      }

      res.json(item);
    } catch (err: any) {
      logger.error({ err }, "GET /api/approvals/:id error");
      res.status(500).json({ error: "Failed to fetch approval item" });
    }
  });

  app.patch("/api/approvals/:id/approve", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const id = req.params.id as string;
      const { comment } = req.body;

      const [item] = await db
        .select()
        .from(approvalItems)
        .where(eq(approvalItems.id, id));

      if (!item) {
        return res.status(404).json({ error: "Approval item not found" });
      }

      if (item.submittedBy !== advisorId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const payload = (item.payload || {}) as Record<string, unknown>;
      const validationCtx = {
        entityType: item.entityType,
        entityId: item.entityId || undefined,
        payload,
        clientId: (payload.clientId as string) || item.entityId || undefined,
      };
      const summary = await runAllValidators(validationCtx);
      await persistValidationResults(id, summary, advisorId, item.entityType, item.entityId);

      if (!summary.passed) {
        const failedChecks = summary.results.filter(r => r.status === "fail");
        return res.status(422).json({
          error: "Validation failed",
          message: `${failedChecks.length} validation check(s) failed. Resolve all issues before approving.`,
          failedChecks: failedChecks.map(c => ({ module: c.module, ruleKey: c.ruleKey, message: c.message })),
        });
      }

      const updated = await applyApprovalChange(id, "approved", advisorId, comment);
      if (!updated) {
        return res.status(404).json({ error: "Approval item not found or not in pending status" });
      }

      await AuditLogger.logEvent(id, "approval_decision", {
        action: "approved",
        item_type: item.itemType,
        entity_type: item.entityType,
        entity_id: item.entityId,
        advisor_id: advisorId,
        comment: comment || null,
        timestamp: new Date().toISOString(),
      });

      res.json(updated);
    } catch (err: any) {
      logger.error({ err }, "PATCH /api/approvals/:id/approve error");
      res.status(500).json({ error: "Failed to approve item" });
    }
  });

  app.patch("/api/approvals/:id/reject", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const id = req.params.id as string;
      const { comment } = req.body;

      // Verify ownership before allowing rejection
      const [existing] = await db
        .select()
        .from(approvalItems)
        .where(eq(approvalItems.id, id));
      if (!existing) {
        return res.status(404).json({ error: "Approval item not found" });
      }
      if (existing.submittedBy !== advisorId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await applyApprovalChange(id, "rejected", advisorId, comment);
      if (!updated) {
        return res.status(404).json({ error: "Approval item not found or not in pending status" });
      }

      await AuditLogger.logEvent(id, "approval_decision", {
        action: "rejected",
        advisor_id: advisorId,
        comment: comment || null,
        timestamp: new Date().toISOString(),
      });

      res.json(updated);
    } catch (err: any) {
      logger.error({ err }, "PATCH /api/approvals/:id/reject error");
      res.status(500).json({ error: "Failed to reject item" });
    }
  });
}
