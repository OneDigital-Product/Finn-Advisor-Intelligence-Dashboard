import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@server/db";
import { logger } from "@server/lib/logger";
import { custodialChanges, approvalItems } from "@shared/schema";
import { sql } from "drizzle-orm";
import { normalizeCustodialPayload, matchCustodialChange } from "@server/engines/custodial-matcher";

const WEBHOOK_SECRET = process.env.CUSTODIAL_WEBHOOK_SECRET || "";

function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!WEBHOOK_SECRET) return false;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

const webhookBodySchema = z.object({
  source: z.string().min(1),
  changeType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") || undefined;

    if (!verifySignature(rawBody, signature)) {
      logger.warn("Custodial webhook signature verification failed");
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const parsed = webhookBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    }

    const { source, changeType, payload: rawPayload, idempotencyKey } = parsed.data;

    if (idempotencyKey) {
      const existing = await db
        .select()
        .from(custodialChanges)
        .where(sql`${custodialChanges.rawPayload}->>'idempotencyKey' = ${idempotencyKey}`)
        .limit(1);

      if (existing.length > 0) {
        logger.info({ idempotencyKey }, "Duplicate custodial webhook ignored");
        return NextResponse.json({ message: "Duplicate event", id: existing[0].id });
      }
    }

    const normalizedPayload = normalizeCustodialPayload(source, rawPayload);
    const matchResult = await matchCustodialChange(source, normalizedPayload);
    const rawWithKey = idempotencyKey ? { ...rawPayload, idempotencyKey } : rawPayload;

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
          payload: { source, changeType, normalizedPayload, matchConfidence: matchResult.confidence },
          status: "pending",
          priority: "normal",
          submittedBy: "system",
        })
        .returning();
      approvalItemId = approvalItem.id;
    }

    const status = matchResult.confidence === "high"
      ? "pending_approval"
      : matchResult.confidence !== "none" ? "pending_review" : "unmatched";

    const [change] = await db
      .insert(custodialChanges)
      .values({
        source, changeType, rawPayload: rawWithKey, normalizedPayload,
        matchedClientId: matchResult.matchedClientId,
        matchedAccountId: matchResult.matchedAccountId,
        status, approvalItemId,
        notes: matchResult.confidence !== "none"
          ? `Auto-matched with ${matchResult.confidence} confidence` : null,
      })
      .returning();

    logger.info({ changeId: change.id, source, changeType, confidence: matchResult.confidence, status }, "Custodial change processed");

    return NextResponse.json({
      id: change.id, status,
      matchConfidence: matchResult.confidence,
      matchedClientId: matchResult.matchedClientId,
      matchedAccountId: matchResult.matchedAccountId,
    }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Error processing custodial webhook");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
