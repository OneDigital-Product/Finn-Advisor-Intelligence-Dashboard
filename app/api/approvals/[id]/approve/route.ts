import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { applyApprovalChange } from "@server/engines/approval-engine";
import {
  runAllValidators,
  persistValidationResults,
} from "@server/engines/submission-validator";
import { AuditLogger } from "@server/integrations/cassidy/audit-logger";
import { logger } from "@server/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;
    const advisorId = session.userId;
    const { comment } = await request.json();

    const [item] = await db
      .select()
      .from(approvalItems)
      .where(eq(approvalItems.id, id));

    if (!item) {
      return NextResponse.json({ error: "Approval item not found" }, { status: 404 });
    }

    if (item.submittedBy !== advisorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
      const failedChecks = summary.results.filter((r: any) => r.status === "fail");
      return NextResponse.json({
        error: "Validation failed",
        message: `${failedChecks.length} validation check(s) failed. Resolve all issues before approving.`,
        failedChecks: failedChecks.map((c: any) => ({ module: c.module, ruleKey: c.ruleKey, message: c.message })),
      }, { status: 422 });
    }

    const updated = await applyApprovalChange(id, "approved", advisorId, comment);
    if (!updated) {
      return NextResponse.json({ error: "Approval item not found or not in pending status" }, { status: 404 });
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

    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error({ err: err }, "PATCH /api/approvals/:id/approve error");
    return NextResponse.json({ error: "Failed to approve item" }, { status: 500 });
  }
}
