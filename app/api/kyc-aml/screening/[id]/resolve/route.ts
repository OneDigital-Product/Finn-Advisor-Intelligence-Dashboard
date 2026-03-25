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
    const { resolution, notes } = await request.json();
    if (!resolution) return NextResponse.json({ message: "Resolution is required" }, { status: 400 });

    const record = (await storage.getAmlScreeningResultsByAdvisor(advisor.id)).find(r => r.id === id);
    if (!record) return NextResponse.json({ message: "Screening result not found" }, { status: 404 });

    const updated = await storage.updateAmlScreeningResult(id, {
      resolution,
      notes,
      resolvedBy: advisor.name,
      resolvedAt: new Date().toISOString().split("T")[0],
      matchStatus: resolution === "true_match" ? "confirmed_match" : "false_positive",
    });

    if (updated) {
      await storage.createKycAuditLog({
        clientId: updated.clientId,
        advisorId: advisor.id,
        action: "screening_resolved",
        entityType: "aml_screening",
        entityId: updated.id,
        details: { resolution, notes, matchConfidence: updated.matchConfidence },
        performedBy: advisor.name,
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "Screening resolve error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
