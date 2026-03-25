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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const task = await storage.getTask(id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
    if (task.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const config = await storage.getRecurringTaskByTaskId(task.id);
    return NextResponse.json(config || null);
  } catch (err) {
    logger.error({ err: err }, "[Tasks] recurring config fetch failed");
    return NextResponse.json({ message: "Failed to load recurring config" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const task = await storage.getTask(id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
    if (task.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const existing = await storage.getRecurringTaskByTaskId(task.id);
    if (existing && existing.active) {
      await storage.updateRecurringTask(existing.id, { active: false });
      return NextResponse.json({ ...existing, active: false, toggled: "off" });
    }

    const body = await request.json();
    const { pattern, interval, daysOfWeek, dateOfMonth, endDate } = body;
    if (!pattern || !["daily", "weekly", "monthly"].includes(pattern)) {
      return NextResponse.json({ message: "pattern must be daily, weekly, or monthly" }, { status: 400 });
    }

    const nextDue = calculateNextDueDate(task.dueDate || new Date().toISOString().split("T")[0], pattern, interval || 1, daysOfWeek, dateOfMonth);
    const config = await storage.createRecurringTask({
      taskId: task.id,
      pattern,
      interval: interval || 1,
      daysOfWeek: daysOfWeek || [],
      dateOfMonth: dateOfMonth || null,
      endDate: endDate || null,
      nextDueDate: nextDue,
      active: true,
    });

    return NextResponse.json({ ...config, toggled: "on" });
  } catch (err) {
    logger.error({ err: err }, "[Tasks] recurring create/toggle failed");
    return NextResponse.json({ message: "Failed to update recurring config" }, { status: 500 });
  }
}
