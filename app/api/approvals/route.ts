import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalItems } from "@shared/schema";
import { insertApprovalItemSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  evaluateAutoApprove,
  applyApprovalChange,
  getApprovalRulesForType,
} from "@server/engines/approval-engine";
import {
  runAllValidators,
  persistValidationResults,
} from "@server/engines/submission-validator";
import { sseEventBus } from "@server/lib/sse-event-bus";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;
    const body = await request.json();
    const parsed = insertApprovalItemSchema.safeParse({
      ...body,
      submittedBy: advisorId,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const payload = (parsed.data.payload || {}) as Record<string, unknown>;
    const validationCtx = {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId || undefined,
      payload,
      clientId: (payload.clientId as string) || parsed.data.entityId || undefined,
    };

    let validationSummary;
    try {
      validationSummary = await runAllValidators(validationCtx);
    } catch (validationErr) {
      logger.error({ err: validationErr }, "Pre-submission validation failed (non-blocking)");
      validationSummary = null;
    }

    const rules = await getApprovalRulesForType(parsed.data.itemType);
    const autoResult = evaluateAutoApprove(parsed.data, rules);

    const validationPassed = validationSummary ? validationSummary.passed : true;
    const effectiveAutoApproved = autoResult.autoApproved && validationPassed;

    const [item] = await db
      .insert(approvalItems)
      .values({
        ...parsed.data,
        status: effectiveAutoApproved ? "approved" : "pending",
        reviewedBy: effectiveAutoApproved ? "system" : null,
        reviewedAt: effectiveAutoApproved ? new Date() : null,
        comments: effectiveAutoApproved
          ? autoResult.reason
          : autoResult.autoApproved && !validationPassed
            ? "Auto-approval blocked by validation failures"
            : null,
      })
      .returning();

    if (validationSummary) {
      try {
        await persistValidationResults(
          item.id,
          validationSummary,
          advisorId!,
          parsed.data.entityType,
          parsed.data.entityId
        );
      } catch (persistErr) {
        logger.error({ err: persistErr }, "Failed to persist validation results");
      }
    }

    sseEventBus.publishToUser(advisorId!, "approval:new", {
      itemId: item.id,
      itemType: item.itemType,
      priority: item.priority,
      status: item.status,
      autoApproved: autoResult.autoApproved,
    });

    return NextResponse.json({ ...item, autoApproved: autoResult.autoApproved }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/approvals error");
    return NextResponse.json({ error: "Failed to create approval item" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;
    const url = new URL(request.url);
    const itemType = url.searchParams.get("itemType");
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");

    let conditions: any[] = [eq(approvalItems.submittedBy, advisorId)];
    if (itemType) conditions.push(eq(approvalItems.itemType, itemType));
    if (status) conditions.push(eq(approvalItems.status, status));
    if (priority) conditions.push(eq(approvalItems.priority, priority));

    const items = await db
      .select()
      .from(approvalItems)
      .where(and(...conditions))
      .orderBy(desc(approvalItems.createdAt))
      .limit(100);

    return NextResponse.json(items);
  } catch (err: any) {
    logger.error({ err: err }, "GET /api/approvals error");
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
