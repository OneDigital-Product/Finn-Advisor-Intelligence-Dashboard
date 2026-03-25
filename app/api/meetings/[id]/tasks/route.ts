import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    const { id: meetingId } = await params;
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting || meeting.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    const meetingTasks = await storage.getTasksByMeeting(meetingId);
    const allAssociates = await storage.getAllAssociates();
    const tasksWithAssignee = meetingTasks.map((task) => {
      const assignee = task.assigneeId ? allAssociates.find((a) => a.id === task.assigneeId) : null;
      return {
        ...task,
        assigneeName: assignee?.name || null,
        assigneeAvatarUrl: assignee?.avatarUrl || null,
      };
    });
    return NextResponse.json(tasksWithAssignee);
  } catch (err) {
    logger.error({ err: err }, "[Tasks] meeting tasks fetch failed");
    return NextResponse.json({ message: "Failed to load meeting tasks" }, { status: 500 });
  }
}
