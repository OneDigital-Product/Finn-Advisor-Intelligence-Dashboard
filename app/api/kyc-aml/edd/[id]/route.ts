import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const { status, findings, riskAssessment, recommendation, collectedDocuments } = await request.json();
    const updates: any = {};

    if (status) updates.status = status;
    if (findings !== undefined) updates.findings = findings;
    if (riskAssessment !== undefined) updates.riskAssessment = riskAssessment;
    if (recommendation !== undefined) updates.recommendation = recommendation;
    if (collectedDocuments) updates.collectedDocuments = collectedDocuments;

    if (status === "completed") {
      updates.completedAt = new Date().toISOString().split("T")[0];
      updates.completedBy = advisor.name;
    }

    const updated = await storage.updateEddRecord(id, updates);

    if (updated) {
      await storage.createKycAuditLog({
        clientId: updated.clientId,
        advisorId: advisor.id,
        action: `edd_${status || "updated"}`,
        entityType: "edd_record",
        entityId: updated.id,
        details: { status, findings: findings?.substring(0, 100) },
        performedBy: advisor.name,
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "EDD update error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
