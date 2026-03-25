import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { insertCharitableGoalSchema } from "@shared/schema";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

const updateGoalSchema = insertCharitableGoalSchema.partial().omit({ clientId: true });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const existing = await storage.getCharitableGoal(id);
    if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    const client = await storage.getClient(existing.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const raw = await request.json();
    const data = updateGoalSchema.parse(raw);
    const goal = await storage.updateCharitableGoal(id, data);
    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to update charitable goal") }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const existing = await storage.getCharitableGoal(id);
    if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    const client = await storage.getClient(existing.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await storage.deleteCharitableGoal(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to delete charitable goal") }, { status: 500 });
  }
}
