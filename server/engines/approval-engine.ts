import { db } from "../db";
import { approvalItems, approvalRules } from "@shared/schema";
import type { ApprovalItem, ApprovalRule, InsertApprovalItem } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sseEventBus } from "../lib/sse-event-bus";
import { sendEmail } from "../integrations/microsoft/email";

export interface AutoApproveResult {
  autoApproved: boolean;
  reason?: string;
}

export function evaluateAutoApprove(
  item: InsertApprovalItem,
  rules: ApprovalRule[]
): AutoApproveResult {
  const matchingRules = rules.filter(
    (r) => r.isActive && r.itemType === item.itemType
  );

  if (matchingRules.length === 0) {
    return { autoApproved: false, reason: "No matching rules found" };
  }

  for (const rule of matchingRules) {
    const conditions = rule.autoApproveConditions as Record<string, unknown> | null;
    if (!conditions || Object.keys(conditions).length === 0) {
      continue;
    }

    let allConditionsMet = true;
    const payload = (item.payload ?? {}) as Record<string, unknown>;

    if (conditions.maxAmount !== undefined) {
      const amount = typeof payload.amount === "number" ? payload.amount : 0;
      if (amount > (conditions.maxAmount as number)) {
        allConditionsMet = false;
      }
    }

    if (conditions.allowedPriorities) {
      const allowed = conditions.allowedPriorities as string[];
      if (!allowed.includes(item.priority ?? "normal")) {
        allConditionsMet = false;
      }
    }

    if (conditions.allowedEntityTypes) {
      const allowed = conditions.allowedEntityTypes as string[];
      if (!allowed.includes(item.entityType)) {
        allConditionsMet = false;
      }
    }

    if (allConditionsMet) {
      return {
        autoApproved: true,
        reason: `Auto-approved by rule: ${rule.itemType} (rule ${rule.id})`,
      };
    }
  }

  return { autoApproved: false, reason: "No auto-approve conditions met" };
}

export async function applyApprovalChange(
  itemId: string,
  status: "approved" | "rejected",
  reviewedBy: string,
  comments?: string
): Promise<ApprovalItem | null> {
  const [updated] = await db
    .update(approvalItems)
    .set({
      status,
      reviewedBy,
      reviewedAt: new Date(),
      comments: comments || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(approvalItems.id, itemId),
        eq(approvalItems.status, "pending")
      )
    )
    .returning();

  if (!updated) {
    logger.warn({ itemId, status }, "Approval change failed - item not found or not pending");
    return null;
  }

  logger.info({ itemId, status, reviewedBy }, "Approval status changed");

  sseEventBus.publishToUser(updated.submittedBy, "approval:status_changed", {
    itemId,
    status,
    itemType: updated.itemType,
  });

  if (updated.submittedBy && updated.submittedBy.includes("@")) {
    const statusLabel = status === "approved" ? "Approved" : "Rejected";
    try {
      await sendEmail({
        to: updated.submittedBy,
        subject: `Approval ${statusLabel}: ${updated.title || updated.itemType}`,
        htmlContent: `<p>Your ${updated.itemType} request has been <strong>${statusLabel.toLowerCase()}</strong> by ${reviewedBy}.</p>${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ""}`,
        plainText: `Your ${updated.itemType} request has been ${statusLabel.toLowerCase()} by ${reviewedBy}.${comments ? ` Comments: ${comments}` : ""}`,
      });
    } catch (emailErr) {
      logger.error({ err: emailErr, itemId }, "Failed to send approval notification email");
    }
  }

  return updated;
}

export function calculateSLADueDate(rule: ApprovalRule): Date {
  const slaHours = rule.slaHours ?? 24;
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + slaHours);
  return dueDate;
}

export async function getApprovalRulesForType(itemType: string): Promise<ApprovalRule[]> {
  return db
    .select()
    .from(approvalRules)
    .where(
      and(
        eq(approvalRules.itemType, itemType),
        eq(approvalRules.isActive, true)
      )
    );
}
