import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const config = await storage.getMeetingProcessConfig(advisor.id);
    return NextResponse.json(
      config || {
        autoCreateTasks: true,
        syncToSalesforce: true,
        generateFollowUpEmail: true,
        defaultTaskPriority: "medium",
        defaultTaskDueDays: 7,
      }
    );
  } catch (err: any) {
    logger.error({ err }, "[MeetingProcess] Config fetch error");
    return NextResponse.json({ error: "Failed to get config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const {
      autoCreateTasks,
      syncToSalesforce,
      generateFollowUpEmail,
      defaultTaskPriority,
      defaultTaskDueDays,
    } = await request.json();
    const result = await storage.upsertMeetingProcessConfig(advisor.id, {
      autoCreateTasks,
      syncToSalesforce,
      generateFollowUpEmail,
      defaultTaskPriority,
      defaultTaskDueDays,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "[MeetingProcess] Config update error");
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
