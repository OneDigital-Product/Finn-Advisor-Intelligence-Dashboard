import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import {
  getComplianceTasksByHousehold,
  getComplianceCasesByHousehold,
} from "@server/integrations/salesforce/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientId = id;
    const reviews = await storage.getComplianceReviews(clientId);
    // Batch fetch all events in one query instead of N+1 (was: 1 query per review)
    const reviewIds = reviews.map(r => r.id);
    const allEvents = await storage.getComplianceReviewEventsByReviewIds(reviewIds);
    const eventsByReview = new Map<string, typeof allEvents>();
    for (const event of allEvents) {
      const existing = eventsByReview.get(event.reviewId) || [];
      existing.push(event);
      eventsByReview.set(event.reviewId, existing);
    }
    const reviewsWithEvents = reviews.map(r => ({
      ...r,
      events: eventsByReview.get(r.id) || [],
    }));

    // ── Enrich with SF compliance tasks & cases when client ID is a SF ID ──
    let sfComplianceTasks: any[] = [];
    let sfComplianceCases: any[] = [];
    if (isSalesforceEnabled() && isValidSalesforceId(clientId)) {
      const [tasksResult, casesResult] = await Promise.allSettled([
        getComplianceTasksByHousehold(clientId),
        getComplianceCasesByHousehold(clientId),
      ]);
      sfComplianceTasks = (tasksResult.status === "fulfilled" ? tasksResult.value : []).map((t: any) => ({
        id: t.Id,
        subject: t.Subject,
        status: t.Status,
        dueDate: t.ActivityDate,
        priority: t.Priority,
        source: "salesforce",
      }));
      sfComplianceCases = (casesResult.status === "fulfilled" ? casesResult.value : []).map((c: any) => ({
        id: c.Id,
        subject: c.Subject,
        status: c.Status,
        type: c.Type,
        priority: c.Priority,
        createdDate: c.CreatedDate,
        closedDate: c.ClosedDate || null,
        source: "salesforce",
      }));
    }

    return NextResponse.json({
      reviews: reviewsWithEvents,
      sfComplianceTasks,
      sfComplianceCases,
      hasSfData: sfComplianceTasks.length > 0 || sfComplianceCases.length > 0,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;
    const clientId = id;
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { title, advisorNotes, reviewItems } = await request.json();
    const review = await storage.createComplianceReview({
      clientId,
      advisorId: advisor.id,
      title: title || "Annual Compliance Review",
      advisorNotes: advisorNotes || null,
      reviewItems: reviewItems ? JSON.stringify(reviewItems) : null,
      status: "draft",
      reviewerName: null,
      reviewerNotes: null,
      submittedAt: null,
      reviewedAt: null,
      completedAt: null,
    });
    await storage.createComplianceReviewEvent({
      reviewId: review.id,
      eventType: "created",
      description: "Compliance review created",
      createdBy: advisor.name,
    });
    const events = await storage.getComplianceReviewEvents(review.id);
    return NextResponse.json({ ...review, events });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
