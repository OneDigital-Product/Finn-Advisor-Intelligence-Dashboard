import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalRules } from "@shared/schema";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const createApprovalRuleSchema = z.object({
  itemType: z.string().min(1, "itemType is required"),
  requiredReviewerRole: z.string().min(1, "requiredReviewerRole is required"),
  slaHours: z.number().optional(),
  autoApproveConditions: z.record(z.any()).optional(),
  escalationRole: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const rules = await db.select().from(approvalRules).orderBy(approvalRules.itemType);
    return NextResponse.json(rules);
  } catch (err) {
    logger.error({ err }, "GET /api/admin/approval-rules error");
    return NextResponse.json({ message: "Failed to fetch approval rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const parsed = createApprovalRuleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    const [rule] = await db.insert(approvalRules).values({
      itemType: parsed.data.itemType,
      requiredReviewerRole: parsed.data.requiredReviewerRole,
      slaHours: parsed.data.slaHours || 24,
      autoApproveConditions: parsed.data.autoApproveConditions || {},
      escalationRole: parsed.data.escalationRole || null,
      isActive: true,
    }).returning();
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    logger.error({ err }, "POST /api/admin/approval-rules error");
    return NextResponse.json({ message: "Failed to create approval rule" }, { status: 500 });
  }
}
