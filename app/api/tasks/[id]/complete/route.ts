import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

function calculateNextDueDate(currentDue: string, pattern: string, interval: number, daysOfWeek?: number[], dateOfMonth?: number | null): string {
  const d = new Date(currentDue);
  switch (pattern) {
    case "daily":
      d.setDate(d.getDate() + interval);
      break;
    case "weekly":
      if (daysOfWeek && daysOfWeek.length > 0) {
        const sorted = [...daysOfWeek].sort((a, b) => a - b);
        const currentDay = d.getDay();
        const nextDay = sorted.find(day => day > currentDay);
        if (nextDay !== undefined) {
          d.setDate(d.getDate() + (nextDay - currentDay));
        } else {
          d.setDate(d.getDate() + (7 * interval - currentDay + sorted[0]));
        }
      } else {
        d.setDate(d.getDate() + 7 * interval);
      }
      break;
    case "monthly":
      d.setMonth(d.getMonth() + interval);
      if (dateOfMonth && dateOfMonth >= 1 && dateOfMonth <= 28) {
        d.setDate(dateOfMonth);
      }
      break;
  }
  return d.toISOString().split("T")[0];
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const existing = await storage.getTask(id);
    if (!existing) return NextResponse.json({ message: "Task not found" }, { status: 404 });
    if (existing.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const task = await storage.completeTask(id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    const recurringConfig = await storage.getRecurringTaskByTaskId(task.id);
    let nextTask = null;
    if (recurringConfig && recurringConfig.active) {
      const daysOfWeek = Array.isArray(recurringConfig.daysOfWeek) ? recurringConfig.daysOfWeek as number[] : undefined;
      const nextDue = calculateNextDueDate(task.dueDate || new Date().toISOString().split("T")[0], recurringConfig.pattern, recurringConfig.interval, daysOfWeek, recurringConfig.dateOfMonth);

      if (recurringConfig.endDate && nextDue > recurringConfig.endDate) {
        await storage.updateRecurringTask(recurringConfig.id, { active: false });
      } else {
        nextTask = await storage.createTask({
          advisorId: task.advisorId,
          clientId: task.clientId || undefined,
          title: task.title,
          description: task.description || undefined,
          dueDate: nextDue,
          priority: task.priority,
          status: "pending",
          category: task.category || undefined,
          type: task.type,
        });
        await storage.updateRecurringTask(recurringConfig.id, { taskId: nextTask.id, nextDueDate: nextDue });
      }
    }

    return NextResponse.json({ task, nextTask, recurring: !!recurringConfig });
  } catch (err) {
    logger.error({ err: err }, "[Tasks] complete failed");
    return NextResponse.json({ message: "Failed to complete task" }, { status: 500 });
  }
}
