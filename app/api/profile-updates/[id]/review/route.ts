import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { AuditLogger } from "@server/integrations/cassidy/audit-logger";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const update = await storage.getPendingProfileUpdate(id);
    if (!update) return NextResponse.json({ message: "Update not found" }, { status: 404 });
    if (update.advisorId !== advisor.id) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    if (update.status !== "pending") return NextResponse.json({ message: "Update already reviewed" }, { status: 400 });

    if (parsed.data.action === "approve") {
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

      await storage.updatePendingProfileUpdate(id, {
        status: "approved",
        reviewedBy: advisor.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote || null,
      });
    } else {
      await storage.updatePendingProfileUpdate(id, {
        status: "rejected",
        reviewedBy: advisor.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote || null,
      });
    }

    await AuditLogger.logEvent(id, "profile_update_reviewed", {
      update_id: id,
      client_id: update.clientId,
      action: parsed.data.action,
      reviewer_id: advisor.id,
      review_note: parsed.data.reviewNote || null,
      fields_updated: parsed.data.action === "approve" ? Object.keys(update.fieldUpdates as Record<string, string>) : [],
      timestamp: new Date().toISOString(),
    });

    const updated = await storage.getPendingProfileUpdate(id);
    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, "Error reviewing profile update");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
