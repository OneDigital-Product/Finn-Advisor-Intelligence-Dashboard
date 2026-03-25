import type { Express } from "express";
import crypto from "crypto";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../lib/logger";
import { requireAuth } from "./middleware";
import { validateBody, validateParams } from "../lib/validation";
import { custodialChanges, approvalItems } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  normalizeCustodialPayload,
  matchCustodialChange,
} from "../engines/custodial-matcher";

const WEBHOOK_SECRET = process.env.CUSTODIAL_WEBHOOK_SECRET || "";

function verifySignature(
  payload: string,
  signature: string | undefined
): boolean {
  // Fail-closed: if no secret configured, reject (don't silently allow all)
  if (!WEBHOOK_SECRET) return false;
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

const webhookBodySchema = z.object({
  source: z.string().min(1, "source is required"),
  changeType: z.string().min(1, "changeType is required"),
  payload: z.record(z.string(), z.unknown()).refine((val) => val !== null && val !== undefined, {
    message: "payload is required",
  }),
  idempotencyKey: z.string().optional(),
});

const custodialChangeIdParamsSchema = z.object({
  id: z.string().min(1, "id is required"),
});

const patchCustodialChangeBodySchema = z.object({
  action: z.enum(["match", "ignore"], {
    errorMap: () => ({ message: "Invalid action. Use 'match' or 'ignore'" }),
  }),
  matchedClientId: z.string().optional(),
  matchedAccountId: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.action !== "match" || !!data.matchedClientId,
  { message: "matchedClientId is required for manual match", path: ["matchedClientId"] }
);

export function registerCustodialRoutes(app: Express) {
  app.post("/api/webhooks/custodial", async (req, res) => {
    try {
      const rawBody =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const signature = req.headers["x-signature"] as string | undefined;

      if (!verifySignature(rawBody, signature)) {
        logger.warn("Custodial webhook signature verification failed");
        return res.status(401).json({ message: "Invalid signature" });
      }

      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      req.body = body;

      const data = validateBody(webhookBodySchema, req, res);
      if (!data) return;

      const { source, changeType, payload: rawPayload, idempotencyKey } = data;

      if (idempotencyKey) {
        const existing = await db
          .select()
          .from(custodialChanges)
          .where(
            sql`${custodialChanges.rawPayload}->>'idempotencyKey' = ${idempotencyKey}`
          )
          .limit(1);

        if (existing.length > 0) {
          logger.info({ idempotencyKey }, "Duplicate custodial webhook ignored");
          return res.status(200).json({
            message: "Duplicate event",
            id: existing[0].id,
          });
        }
      }

      const normalizedPayload = normalizeCustodialPayload(source, rawPayload);

      const matchResult = await matchCustodialChange(source, normalizedPayload);

      const rawWithKey = idempotencyKey
        ? { ...rawPayload, idempotencyKey }
        : rawPayload;

      let approvalItemId: string | null = null;

      if (matchResult.confidence === "high") {
        const [approvalItem] = await db
          .insert(approvalItems)
          .values({
            itemType: "custodial_change",
            entityType: "account",
            entityId: matchResult.matchedAccountId,
            title: `${source} ${changeType}: ${normalizedPayload.accountNumber || "unknown account"}`,
            description: `Custodial change from ${source}: ${normalizedPayload.description || changeType}`,
            payload: {
              source,
              changeType,
              normalizedPayload,
              matchConfidence: matchResult.confidence,
            },
            status: "pending",
            priority: "normal",
            submittedBy: "system",
          })
          .returning();

        approvalItemId = approvalItem.id;
      }

      const status =
        matchResult.confidence === "high"
          ? "pending_approval"
          : matchResult.confidence !== "none"
            ? "pending_review"
            : "unmatched";

      const [change] = await db
        .insert(custodialChanges)
        .values({
          source,
          changeType,
          rawPayload: rawWithKey,
          normalizedPayload,
          matchedClientId: matchResult.matchedClientId,
          matchedAccountId: matchResult.matchedAccountId,
          status,
          approvalItemId,
          notes: matchResult.confidence !== "none"
            ? `Auto-matched with ${matchResult.confidence} confidence`
            : null,
        })
        .returning();

      logger.info(
        {
          changeId: change.id,
          source,
          changeType,
          confidence: matchResult.confidence,
          status,
        },
        "Custodial change processed"
      );

      res.status(201).json({
        id: change.id,
        status,
        matchConfidence: matchResult.confidence,
        matchedClientId: matchResult.matchedClientId,
        matchedAccountId: matchResult.matchedAccountId,
      });
    } catch (err) {
      logger.error({ err }, "Error processing custodial webhook");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/custodial-changes", requireAuth, async (req, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;

      let query = db
        .select()
        .from(custodialChanges)
        .orderBy(desc(custodialChanges.createdAt));

      if (statusFilter && statusFilter !== "all") {
        const results = await db
          .select()
          .from(custodialChanges)
          .where(eq(custodialChanges.status, statusFilter))
          .orderBy(desc(custodialChanges.createdAt));
        return res.json(results);
      }

      const results = await query;
      res.json(results);
    } catch (err) {
      logger.error({ err }, "Error fetching custodial changes");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/custodial-changes/:id", requireAuth, validateParams(custodialChangeIdParamsSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const data = validateBody(patchCustodialChangeBodySchema, req, res);
      if (!data) return;

      const [existing] = await db
        .select()
        .from(custodialChanges)
        .where(sql`${custodialChanges.id} = ${id}`)
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Custodial change not found" });
      }

      if (data.action === "ignore") {
        const [updated] = await db
          .update(custodialChanges)
          .set({
            status: "ignored",
            notes: data.notes || "Manually ignored",
            processedAt: new Date(),
          })
          .where(sql`${custodialChanges.id} = ${id}`)
          .returning();

        return res.json(updated);
      }

      if (data.action === "match") {
        const normalizedPayload = existing.normalizedPayload as Record<string, unknown>;
        const userId = req.session.userId || "system";

        const [approvalItem] = await db
          .insert(approvalItems)
          .values({
            itemType: "custodial_change",
            entityType: "account",
            entityId: data.matchedAccountId || null,
            title: `${existing.source} ${existing.changeType}: Manual Match`,
            description: `Manually matched custodial change from ${existing.source}`,
            payload: {
              source: existing.source,
              changeType: existing.changeType,
              normalizedPayload,
              matchConfidence: "manual",
            },
            status: "pending",
            priority: "normal",
            submittedBy: userId,
          } as any)
          .returning();

        const [updated] = await db
          .update(custodialChanges)
          .set({
            matchedClientId: data.matchedClientId!,
            matchedAccountId: data.matchedAccountId || null,
            status: "pending_approval",
            approvalItemId: approvalItem.id,
            notes: data.notes || "Manually matched",
            processedAt: new Date(),
          })
          .where(sql`${custodialChanges.id} = ${id}`)
          .returning();

        return res.json(updated);
      }
    } catch (err) {
      logger.error({ err }, "Error updating custodial change");
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
