import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { MeetingPipeline } from "@server/engines/meeting-pipeline";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { sanitizeErrorMessage, isNotFoundError } from "@server/lib/error-utils";

const pipeline = new MeetingPipeline();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const meeting = await storage.getMeeting(id);
    if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
    if (meeting.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { dryRun, config } = body || {};

    const advisorConfig = await storage.getMeetingProcessConfig(advisor.id);

    const processConfig = {
      autoCreateTasks: config?.autoCreateTasks ?? advisorConfig?.autoCreateTasks ?? true,
      syncToSalesforce: config?.syncToSalesforce ?? advisorConfig?.syncToSalesforce ?? true,
      generateFollowUpEmail:
        config?.generateFollowUpEmail ?? advisorConfig?.generateFollowUpEmail ?? true,
      dryRun: dryRun ?? false,
      defaultTaskPriority: advisorConfig?.defaultTaskPriority ?? "medium",
      defaultTaskDueDays: advisorConfig?.defaultTaskDueDays ?? 7,
    };

    const result = await pipeline.process(id, advisor.id, processConfig);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "[MeetingProcess] Error");
    const notFound = isNotFoundError(err);
    return NextResponse.json(
      { error: sanitizeErrorMessage(err, "Failed to process meeting") },
      { status: notFound ? 404 : 400 }
    );
  }
}
