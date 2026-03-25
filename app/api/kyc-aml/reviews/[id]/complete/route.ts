import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { calculateNextReviewDate } from "@server/engines/kyc-risk-engine";
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
    const { notes } = await request.json();
    const schedule = await storage.getKycReviewSchedulesByAdvisor(advisor.id);
    const review = schedule.find(s => s.id === id);
    if (!review) return NextResponse.json({ message: "Review schedule not found" }, { status: 404 });

    const now = new Date().toISOString().split("T")[0];
    const nextDate = calculateNextReviewDate(review.riskTier, now);

    const updated = await storage.updateKycReviewSchedule(id, {
      status: "completed",
      completedAt: now,
      completedBy: advisor.name,
      notes,
      lastReviewDate: now,
    });

    await storage.createKycReviewSchedule({
      clientId: review.clientId,
      advisorId: advisor.id,
      riskTier: review.riskTier,
      lastReviewDate: now,
      nextReviewDate: nextDate,
      reviewFrequencyMonths: review.reviewFrequencyMonths,
      status: "scheduled",
    });

    await storage.createKycAuditLog({
      clientId: review.clientId,
      advisorId: advisor.id,
      action: "review_completed",
      entityType: "kyc_review",
      entityId: id,
      details: { completedAt: now, nextReviewDate: nextDate, notes },
      performedBy: advisor.name,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "Review complete error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
