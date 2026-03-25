import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "") || 7;

    const upcoming = await storage.getUpcomingTasks(advisor.id, days);
    const tasksWithClients = await Promise.all(
      upcoming.map(async (task) => {
        if (!task.clientId) return { ...task, clientName: null };
        const client = await storage.getClient(task.clientId);
        return { ...task, clientName: client ? `${client.firstName} ${client.lastName}` : null };
      })
    );
    return NextResponse.json(tasksWithClients);
  } catch (err) {
    logger.error({ err: err }, "[Tasks] upcoming fetch failed");
    return NextResponse.json({ message: "Failed to load upcoming tasks" }, { status: 500 });
  }
}
