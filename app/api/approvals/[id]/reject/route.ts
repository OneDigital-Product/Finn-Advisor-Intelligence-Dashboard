import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { applyApprovalChange } from "@server/engines/approval-engine";
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

    // Verify ownership before allowing rejection
    const [existing] = await db
      .select()
      .from(approvalItems)
      .where(eq(approvalItems.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Approval item not found" }, { status: 404 });
    }
    if (existing.submittedBy !== advisorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updated = await applyApprovalChange(id, "rejected", advisorId, comment);
    if (!updated) {
      return NextResponse.json({ error: "Approval item not found or not in pending status" }, { status: 404 });
    }

    await AuditLogger.logEvent(id, "approval_decision", {
      action: "rejected",
      advisor_id: advisorId,
      comment: comment || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error({ err: err }, "PATCH /api/approvals/:id/reject error");
    return NextResponse.json({ error: "Failed to reject item" }, { status: 500 });
  }
}
