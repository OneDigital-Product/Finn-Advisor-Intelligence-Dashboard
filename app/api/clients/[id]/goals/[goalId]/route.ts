import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createGoalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  currentAmount: z.coerce.number().min(0).default(0),
  timeHorizonYears: z.coerce.number().int().min(1).max(50),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  bucket: z.coerce.number().int().min(1).max(3),
  linkedAccountIds: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
});

const updateGoalSchema = createGoalSchema.partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { id: clientId, goalId } = await params;
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const goal = await storage.getFinancialGoal(goalId);
    if (!goal || goal.clientId !== clientId) return NextResponse.json({ message: "Goal not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    const data = parsed.data;
    if (data.name !== undefined) updates.name = data.name;
    if (data.targetAmount !== undefined) updates.targetAmount = String(data.targetAmount);
    if (data.currentAmount !== undefined) updates.currentAmount = String(data.currentAmount);
    if (data.timeHorizonYears !== undefined) updates.timeHorizonYears = data.timeHorizonYears;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.bucket !== undefined) updates.bucket = data.bucket;
    if (data.linkedAccountIds !== undefined) updates.linkedAccountIds = data.linkedAccountIds;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (body.status !== undefined) updates.status = body.status;

    const updated = await storage.updateFinancialGoal(goalId, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { id: clientId, goalId } = await params;
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const goal = await storage.getFinancialGoal(goalId);
    if (!goal || goal.clientId !== clientId) return NextResponse.json({ message: "Goal not found" }, { status: 404 });

    await storage.deleteFinancialGoal(goalId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
