import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { AuditLogger } from "../integrations/cassidy/audit-logger";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(1000).optional(),
});

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerProfileUpdateRoutes(app: Express) {
  app.get("/api/profile-updates/pending", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const status = (req.query.status as string) || "pending";
      const updates = await storage.getPendingProfileUpdates(advisor.id, status);

      const enriched = await Promise.all(
        updates.map(async (u) => {
          const client = await storage.getClient(u.clientId);
          return {
            ...u,
            clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
          };
        })
      );

      res.json(enriched);
    } catch (err) {
      logger.error({ err }, "Error fetching pending profile updates");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/clients/:clientId/profile-updates", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient(p(req.params.clientId));
      if (!client || client.advisorId !== advisor.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = await storage.getPendingProfileUpdatesByClient(p(req.params.clientId));
      res.json(updates);
    } catch (err) {
      logger.error({ err }, "Error fetching client profile updates");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/profile-updates/:id/review", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const body = validateBody(reviewSchema, req, res);
      if (!body) return;

      const update = await storage.getPendingProfileUpdate(p(req.params.id));
      if (!update) return res.status(404).json({ message: "Update not found" });
      if (update.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });
      if (update.status !== "pending") return res.status(400).json({ message: "Update already reviewed" });

      if (body.action === "approve") {
        const fieldUpdates = update.fieldUpdates as Record<string, string>;
        if (Object.keys(fieldUpdates).length > 0) {
          const clientUpdateData: Record<string, any> = {};
          for (const [field, value] of Object.entries(fieldUpdates)) {
            if (["riskTolerance", "occupation", "employer", "interests", "status", "segment", "maritalStatus"].includes(field)) {
              clientUpdateData[field] = value;
            }
          }
          if (Object.keys(clientUpdateData).length > 0) {
            await storage.updateClient(update.clientId, clientUpdateData);
          }
        }

        await storage.updatePendingProfileUpdate(p(req.params.id), {
          status: "approved",
          reviewedBy: advisor.id,
          reviewedAt: new Date(),
          reviewNote: body.reviewNote || null,
        });
      } else {
        await storage.updatePendingProfileUpdate(p(req.params.id), {
          status: "rejected",
          reviewedBy: advisor.id,
          reviewedAt: new Date(),
          reviewNote: body.reviewNote || null,
        });
      }

      await AuditLogger.logEvent(p(req.params.id), "profile_update_reviewed", {
        update_id: p(req.params.id),
        client_id: update.clientId,
        action: body.action,
        reviewer_id: advisor.id,
        review_note: body.reviewNote || null,
        fields_updated: body.action === "approve" ? Object.keys(update.fieldUpdates as Record<string, string>) : [],
        timestamp: new Date().toISOString(),
      });

      const updated = await storage.getPendingProfileUpdate(p(req.params.id));
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error reviewing profile update");
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
