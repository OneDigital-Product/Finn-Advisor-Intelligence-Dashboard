import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { runAllValidators, persistValidationResults } from "@server/engines/submission-validator";
import { logger } from "@server/lib/logger";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const runBy = auth.session.userId || "system";

    const [item] = await db
      .select()
      .from(approvalItems)
      .where(eq(approvalItems.id, id));

    if (!item) {
      return NextResponse.json({ error: "Approval item not found" }, { status: 404 });
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

    return NextResponse.json({
      approvalItemId: id,
      ...summary,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[Validation] Approve validate error:");
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
