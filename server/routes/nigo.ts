import type { Express } from "express";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../lib/logger";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { nigoItems, accounts, clients } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { runFullValidation } from "../engines/pre-case-validator";
import { storage } from "../storage";

const createNigoSchema = z.object({
  clientId: z.string().optional(),
  accountId: z.string().optional(),
  custodian: z.string().min(1, "Custodian is required"),
  nigoType: z.string().min(1, "NIGO type is required"),
  description: z.string().min(1, "Description is required"),
  resolutionGuidance: z.string().optional(),
  rmdAmount: z.coerce.number().optional(),
  rmdYear: z.coerce.number().int().optional(),
});

const updateNigoSchema = z.object({
  status: z.enum(["pending", "in_review", "resolved", "escalated"]).optional(),
  resolutionGuidance: z.string().optional(),
  rmdAmount: z.coerce.number().optional(),
  rmdYear: z.coerce.number().int().optional(),
});

export function registerNigoRoutes(app: Express) {
  app.get("/api/nigo", requireAuth, async (req, res) => {
    try {
      const { status, custodian } = req.query;
      let conditions: any[] = [];
      if (status && status !== "all") conditions.push(eq(nigoItems.status, status as string));
      if (custodian && custodian !== "all") conditions.push(eq(nigoItems.custodian, custodian as string));

      const results = await db
        .select()
        .from(nigoItems)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(nigoItems.createdAt))
        .limit(200);

      res.json(results);
    } catch (err: any) {
      logger.error({ err }, "GET /api/nigo error");
      res.status(500).json({ message: "Failed to fetch NIGO items" });
    }
  });

  app.post("/api/nigo", requireAuth, async (req, res) => {
    try {
      const parsed = createNigoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const [item] = await db
        .insert(nigoItems)
        .values({
          ...parsed.data,
          clientId: parsed.data.clientId || null,
          accountId: parsed.data.accountId || null,
          rmdAmount: parsed.data.rmdAmount ? String(parsed.data.rmdAmount) : null,
          rmdYear: parsed.data.rmdYear || null,
          resolutionGuidance: parsed.data.resolutionGuidance || null,
          status: "pending",
          submittedAt: new Date(),
        })
        .returning();

      res.status(201).json(item);
    } catch (err: any) {
      logger.error({ err }, "POST /api/nigo error");
      res.status(500).json({ message: "Failed to create NIGO item" });
    }
  });

  app.patch("/api/nigo/:id", requireAuth, async (req, res) => {
    try {
      const parsed = updateNigoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (parsed.data.status) {
        updates.status = parsed.data.status;
        if (parsed.data.status === "resolved") updates.resolvedAt = new Date();
      }
      if (parsed.data.resolutionGuidance !== undefined) updates.resolutionGuidance = parsed.data.resolutionGuidance;
      if (parsed.data.rmdAmount !== undefined) updates.rmdAmount = String(parsed.data.rmdAmount);
      if (parsed.data.rmdYear !== undefined) updates.rmdYear = parsed.data.rmdYear;

      const [updated] = await db
        .update(nigoItems)
        .set(updates)
        .where(eq(nigoItems.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ message: "NIGO item not found" });
      res.json(updated);
    } catch (err: any) {
      logger.error({ err }, "PATCH /api/nigo/:id error");
      res.status(500).json({ message: "Failed to update NIGO item" });
    }
  });

  app.get("/api/nigo/stats", requireAuth, async (req, res) => {
    try {
      const statusStats = await db
        .select({
          status: nigoItems.status,
          count: sql<number>`count(*)::int`,
        })
        .from(nigoItems)
        .groupBy(nigoItems.status);

      const custodianStats = await db
        .select({
          custodian: nigoItems.custodian,
          count: sql<number>`count(*)::int`,
          pendingCount: sql<number>`count(*) filter (where ${nigoItems.status} = 'pending')::int`,
          rmdTotal: sql<string>`coalesce(sum(${nigoItems.rmdAmount}), 0)::text`,
        })
        .from(nigoItems)
        .groupBy(nigoItems.custodian);

      const rmdByYear = await db
        .select({
          rmdYear: nigoItems.rmdYear,
          custodian: nigoItems.custodian,
          totalRmd: sql<string>`coalesce(sum(${nigoItems.rmdAmount}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(nigoItems)
        .where(sql`${nigoItems.rmdAmount} is not null and ${nigoItems.rmdYear} is not null`)
        .groupBy(nigoItems.rmdYear, nigoItems.custodian)
        .orderBy(nigoItems.rmdYear);

      res.json({
        byStatus: statusStats,
        byCustodian: custodianStats,
        rmdAggregation: rmdByYear,
      });
    } catch (err: any) {
      logger.error({ err }, "GET /api/nigo/stats error");
      res.status(500).json({ message: "Failed to fetch NIGO stats" });
    }
  });

  app.post("/api/clients/:clientId/validate", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient(req.params.clientId);
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const validationResult = await runFullValidation(req.params.clientId);

      const { preCaseValidations } = await import("@shared/schema");
      const [saved] = await db
        .insert(preCaseValidations)
        .values({
          clientId: req.params.clientId,
          advisorId: advisor.id,
          validationType: "full",
          overallResult: validationResult.overallResult,
          modules: validationResult.modules,
        })
        .returning();

      res.json({ ...validationResult, id: saved.id });
    } catch (err: any) {
      logger.error({ err }, "POST /api/clients/:clientId/validate error");
      res.status(500).json({ message: "Failed to run validation" });
    }
  });

  app.get("/api/clients/:clientId/validations", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });

      const client = await storage.getClient(req.params.clientId);
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const { preCaseValidations } = await import("@shared/schema");
      const results = await db
        .select()
        .from(preCaseValidations)
        .where(eq(preCaseValidations.clientId, req.params.clientId))
        .orderBy(desc(preCaseValidations.createdAt))
        .limit(10);

      res.json(results);
    } catch (err: any) {
      logger.error({ err }, "GET /api/clients/:clientId/validations error");
      res.status(500).json({ message: "Failed to fetch validations" });
    }
  });
}
