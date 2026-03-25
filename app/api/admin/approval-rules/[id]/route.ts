import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalRules } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const updateApprovalRuleSchema = z.object({
  itemType: z.string().optional(),
  requiredReviewerRole: z.string().optional(),
  slaHours: z.number().optional(),
  autoApproveConditions: z.record(z.any()).optional(),
  escalationRole: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateApprovalRuleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const updates: any = { updatedAt: new Date() };
    if (parsed.data.itemType !== undefined) updates.itemType = parsed.data.itemType;
    if (parsed.data.requiredReviewerRole !== undefined) updates.requiredReviewerRole = parsed.data.requiredReviewerRole;
    if (parsed.data.slaHours !== undefined) updates.slaHours = parsed.data.slaHours;
    if (parsed.data.autoApproveConditions !== undefined) updates.autoApproveConditions = parsed.data.autoApproveConditions;
    if (parsed.data.escalationRole !== undefined) updates.escalationRole = parsed.data.escalationRole;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

    const [rule] = await db.update(approvalRules).set(updates).where(eq(approvalRules.id, id)).returning();
    if (!rule) return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    return NextResponse.json(rule);
  } catch (err) {
    logger.error({ err }, "PATCH /api/admin/approval-rules/:id error");
    return NextResponse.json({ message: "Failed to update approval rule" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    await db.delete(approvalRules).where(eq(approvalRules.id, id));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "DELETE /api/admin/approval-rules/:id error");
    return NextResponse.json({ message: "Failed to delete approval rule" }, { status: 500 });
  }
}
