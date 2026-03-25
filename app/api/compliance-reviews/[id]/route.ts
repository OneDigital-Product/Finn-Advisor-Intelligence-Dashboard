import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["approved", "changes_requested"],
  changes_requested: ["submitted"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const review = await storage.getComplianceReview(id);
    if (!review) return NextResponse.json({ message: "Review not found" }, { status: 404 });

    const { status, advisorNotes, reviewerNotes, reviewerName } = await request.json();
    const updates: any = {};

    if (advisorNotes !== undefined) updates.advisorNotes = advisorNotes;
    if (reviewerNotes !== undefined) updates.reviewerNotes = reviewerNotes;
    if (reviewerName !== undefined) updates.reviewerName = reviewerName;

    if (status && status !== review.status) {
      const allowed = VALID_STATUS_TRANSITIONS[review.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json({ message: `Cannot transition from '${review.status}' to '${status}'` }, { status: 400 });
      }
      updates.status = status;
      const now = new Date().toISOString().split("T")[0];
      let eventDesc = "";

      if (status === "submitted") {
        updates.submittedAt = now;
        eventDesc = "Review submitted for compliance team review";
      } else if (status === "under_review") {
        updates.reviewedAt = now;
        eventDesc = `Review picked up by ${reviewerName || "Compliance Team"}`;
      } else if (status === "approved") {
        updates.completedAt = now;
        eventDesc = `Review approved by ${reviewerName || review.reviewerName || "Compliance Team"}`;
        if (review.reviewItems) {
          const itemIds = JSON.parse(review.reviewItems);
          for (const itemId of itemIds) {
            await storage.updateComplianceItem(itemId, {
              status: "current",
              completedDate: now,
            });
          }
        }
      } else if (status === "changes_requested") {
        eventDesc = `Changes requested by ${reviewerName || review.reviewerName || "Compliance Team"}`;
      }

      if (eventDesc) {
        await storage.createComplianceReviewEvent({
          reviewId: review.id,
          eventType: status,
          description: eventDesc,
          createdBy: reviewerName || advisor.name,
        });
      }
    }

    const updated = await storage.updateComplianceReview(id, updates);
    const events = await storage.getComplianceReviewEvents(id);
    return NextResponse.json({ ...updated, events });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
