import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { logger } from "@server/lib/logger";
import { custodialChanges, approvalItems } from "@shared/schema";
import { sql } from "drizzle-orm";

const patchSchema = z.object({
  action: z.enum(["match", "ignore"]),
  matchedClientId: z.string().optional(),
  matchedAccountId: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.action !== "match" || !!data.matchedClientId,
  { message: "matchedClientId is required for manual match", path: ["matchedClientId"] }
);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const [existing] = await db
      .select()
      .from(custodialChanges)
      .where(sql`${custodialChanges.id} = ${id}`)
      .limit(1);

    if (!existing) {
      return NextResponse.json({ message: "Custodial change not found" }, { status: 404 });
    }

    if (data.action === "ignore") {
      const [updated] = await db
        .update(custodialChanges)
        .set({ status: "ignored", notes: data.notes || "Manually ignored", processedAt: new Date() })
        .where(sql`${custodialChanges.id} = ${id}`)
        .returning();
      return NextResponse.json(updated);
    }

    if (data.action === "match") {
      const normalizedPayload = existing.normalizedPayload as Record<string, unknown>;
      const userId = auth.session.userId || "system";

      const [approvalItem] = await db
        .insert(approvalItems)
        .values({
          itemType: "custodial_change",
          entityType: "account",
          entityId: data.matchedAccountId || null,
          title: `${existing.source} ${existing.changeType}: Manual Match`,
          description: `Manually matched custodial change from ${existing.source}`,
          payload: { source: existing.source, changeType: existing.changeType, normalizedPayload, matchConfidence: "manual" },
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

      return NextResponse.json(updated);
    }
  } catch (err) {
    logger.error({ err }, "Error updating custodial change");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
