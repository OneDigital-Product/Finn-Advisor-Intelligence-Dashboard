import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "./middleware";
import { logger } from "../lib/logger";
import { db } from "../db";
import { validationRules, validationResults, approvalItems } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  runAllValidators,
  runModuleValidation,
  persistValidationResults,
  DEFAULT_VALIDATION_RULES,
  VALIDATION_MODULES,
} from "../engines/submission-validator";

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerValidationRoutes(app: Express) {
  app.post("/api/validations/run", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        approvalItemId: z.string().optional(),
        entityType: z.string().min(1),
        entityId: z.string().optional(),
        clientId: z.string().optional(),
        accountId: z.string().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
        module: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      }

      const { approvalItemId, entityType, entityId, clientId, accountId, payload, module } = parsed.data;
      const runBy = req.session.userId || "system";

      const ctx = { entityType, entityId, payload, clientId: clientId || entityId, accountId };

      const summary = module
        ? await runModuleValidation(module, ctx)
        : await runAllValidators(ctx);

      if (approvalItemId) {
        await persistValidationResults(approvalItemId, summary, runBy, entityType, entityId);
      }

      res.json({
        approvalItemId: approvalItemId || null,
        ...summary,
      });
    } catch (err: any) {
      logger.error({ err }, "POST /api/validations/run error");
      res.status(500).json({ error: "Validation run failed" });
    }
  });

  app.post("/api/approvals/:id/validate", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const runBy = req.session.userId || "system";

      const [item] = await db
        .select()
        .from(approvalItems)
        .where(eq(approvalItems.id, id));

      if (!item) {
        return res.status(404).json({ error: "Approval item not found" });
      }

      const payload = (item.payload || {}) as Record<string, unknown>;
      const ctx = {
        entityType: item.entityType,
        entityId: item.entityId,
        payload,
        clientId: (payload.clientId as string) || item.entityId || undefined,
        accountId: (payload.accountId as string) || undefined,
      };

      const summary = await runAllValidators(ctx);

      await persistValidationResults(id, summary, runBy, item.entityType, item.entityId);

      res.json({
        approvalItemId: id,
        ...summary,
      });
    } catch (err: any) {
      logger.error({ err }, "POST /api/approvals/:id/validate error");
      res.status(500).json({ error: "Validation failed" });
    }
  });

  app.get("/api/approvals/:id/validation-results", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const { history } = req.query;

      if (history === "true") {
        const allResults = await db
          .select()
          .from(validationResults)
          .where(eq(validationResults.approvalItemId, id))
          .orderBy(desc(validationResults.createdAt));

        return res.json({ approvalItemId: id, results: allResults });
      }

      const latestRunRow = await db
        .select({ runId: validationResults.runId })
        .from(validationResults)
        .where(eq(validationResults.approvalItemId, id))
        .orderBy(desc(validationResults.createdAt))
        .limit(1);

      if (latestRunRow.length === 0) {
        return res.json({
          approvalItemId: id,
          passed: false,
          totalChecks: 0,
          passCount: 0,
          failCount: 0,
          warnCount: 0,
          results: [],
          runId: null,
        });
      }

      const latestRunId = latestRunRow[0].runId;
      const results = await db
        .select()
        .from(validationResults)
        .where(and(
          eq(validationResults.approvalItemId, id),
          eq(validationResults.runId, latestRunId)
        ))
        .orderBy(validationResults.module, validationResults.ruleKey);

      const passCount = results.filter(r => r.status === "pass").length;
      const failCount = results.filter(r => r.status === "fail").length;
      const warnCount = results.filter(r => r.status === "warn").length;

      res.json({
        approvalItemId: id,
        runId: latestRunId,
        passed: failCount === 0 && results.length > 0,
        totalChecks: results.length,
        passCount,
        failCount,
        warnCount,
        results,
      });
    } catch (err: any) {
      logger.error({ err }, "GET /api/approvals/:id/validation-results error");
      res.status(500).json({ error: "Failed to fetch validation results" });
    }
  });

  app.get("/api/validation-rules", requireAuth, async (req, res) => {
    try {
      const { module } = req.query;
      let conditions: any[] = [];
      if (module && module !== "all") {
        conditions.push(eq(validationRules.module, module as string));
      }

      const rules = await db
        .select()
        .from(validationRules)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(validationRules.module, validationRules.ruleKey);

      res.json(rules);
    } catch (err: any) {
      logger.error({ err }, "GET /api/validation-rules error");
      res.status(500).json({ error: "Failed to fetch validation rules" });
    }
  });

  app.patch("/api/validation-rules/:id", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const schema = z.object({
        enabled: z.boolean().optional(),
        severity: z.enum(["error", "warn", "info"]).optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        label: z.string().optional(),
        description: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      }

      const [updated] = await db
        .update(validationRules)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(validationRules.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Validation rule not found" });
      }

      res.json(updated);
    } catch (err: any) {
      logger.error({ err }, "PATCH /api/validation-rules/:id error");
      res.status(500).json({ error: "Failed to update validation rule" });
    }
  });

  app.post("/api/validation-rules/seed", requireAuth, async (req, res) => {
    try {
      const existing = await db.select({ count: sql<number>`count(*)::int` }).from(validationRules);
      if ((existing[0]?.count || 0) > 0) {
        return res.json({ message: "Rules already exist", count: existing[0].count });
      }

      const rows = DEFAULT_VALIDATION_RULES.map(r => ({
        ...r,
        enabled: true,
        config: {},
      }));

      await db.insert(validationRules).values(rows);
      res.json({ message: "Default validation rules seeded", count: rows.length });
    } catch (err: any) {
      logger.error({ err }, "POST /api/validation-rules/seed error");
      res.status(500).json({ error: "Failed to seed validation rules" });
    }
  });

  app.get("/api/validation-modules", requireAuth, async (_req, res) => {
    res.json(VALIDATION_MODULES);
  });
}
