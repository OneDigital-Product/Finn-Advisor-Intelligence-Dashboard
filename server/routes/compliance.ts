import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["approved", "changes_requested"],
  changes_requested: ["submitted"],
};

export function registerComplianceRoutes(app: Express) {
  app.get("/api/compliance", async (req, res) => {
    const advisor = await getSessionAdvisor(req);
    if (!advisor) return res.status(404).json({ message: "No advisor found" });

    const [allCompliance, allActivities, allClients] = await Promise.all([
      storage.getComplianceItems(advisor.id),
      storage.getActivities(advisor.id),
      storage.getClients(advisor.id),
    ]);

    const complianceWithClients = await Promise.all(
      allCompliance.map(async (item) => {
        const client = await storage.getClient(item.clientId);
        return { ...item, clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown" };
      })
    );

    const overdue = complianceWithClients.filter(c => c.status === "overdue");
    const expiring = complianceWithClients.filter(c => c.status === "expiring_soon");
    const current = complianceWithClients.filter(c => c.status === "current");
    const pending = complianceWithClients.filter(c => c.status === "pending");

    const totalItems = allCompliance.length;
    const healthScore = totalItems > 0
      ? Math.round(((current.length + pending.length * 0.5) / totalItems) * 100)
      : 100;

    res.json({
      items: complianceWithClients,
      overdue,
      expiringSoon: expiring,
      current,
      pending,
      healthScore,
      auditTrail: allActivities.slice(0, 20).map(a => ({
        ...a,
        clientName: allClients.find(c => c.id === a.clientId)
          ? `${allClients.find(c => c.id === a.clientId)!.firstName} ${allClients.find(c => c.id === a.clientId)!.lastName}`
          : null,
      })),
    });
  });

  app.get("/api/clients/:clientId/compliance-reviews", async (req, res) => {
    try {
      const reviews = await storage.getComplianceReviews(req.params.clientId);
      const reviewsWithEvents = await Promise.all(
        reviews.map(async (r) => {
          const events = await storage.getComplianceReviewEvents(r.id);
          return { ...r, events };
        })
      );
      res.json(reviewsWithEvents);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/compliance-reviews", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const { title, advisorNotes, reviewItems } = req.body;
      const review = await storage.createComplianceReview({
        clientId: (req.params.clientId as string),
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
      res.json({ ...review, events });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/compliance-reviews/:id", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const review = await storage.getComplianceReview((req.params.id as string));
      if (!review) return res.status(404).json({ message: "Review not found" });

      const { status, advisorNotes, reviewerNotes, reviewerName } = req.body;
      const updates: any = {};

      if (advisorNotes !== undefined) updates.advisorNotes = advisorNotes;
      if (reviewerNotes !== undefined) updates.reviewerNotes = reviewerNotes;
      if (reviewerName !== undefined) updates.reviewerName = reviewerName;

      if (status && status !== review.status) {
        const allowed = VALID_STATUS_TRANSITIONS[review.status] || [];
        if (!allowed.includes(status)) {
          return res.status(400).json({ message: `Cannot transition from '${review.status}' to '${status}'` });
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

      const updated = await storage.updateComplianceReview((req.params.id as string), updates);
      const events = await storage.getComplianceReviewEvents((req.params.id as string));
      res.json({ ...updated, events });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/compliance-reviews/:id/events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getComplianceReviewEvents((req.params.id as string));
      res.json(events);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/compliance-items/:id", requireAdvisor, async (req, res) => {
    try {
      const { status, completedDate } = req.body;
      const updated = await storage.updateComplianceItem((req.params.id as string), { status, completedDate });
      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
