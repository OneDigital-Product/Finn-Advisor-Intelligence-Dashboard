import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  category: z.string().nullable().optional(),
  type: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  meetingId: z.string().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(updateTaskSchema, body);
    if (validation.error) return validation.error;

    const task = await storage.updateTask(id, validation.data);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch (err) {
    logger.error({ err: err }, "[Tasks] update failed");
    return NextResponse.json({ message: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    const { id } = await params;
    const allTasks = await storage.getTasks(advisor.id);
    if (!allTasks.some(t => t.id === id)) {
      return NextResponse.json({ message: "Not authorized to delete this task" }, { status: 403 });
    }

    await storage.deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err: err }, "[Tasks] delete failed");
    return NextResponse.json({ message: "Failed to delete task" }, { status: 500 });
  }
}
