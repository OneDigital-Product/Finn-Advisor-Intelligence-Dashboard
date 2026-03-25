import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { workflowOrchestrator } from "@server/engines/workflow-orchestrator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const instance = await storage.getWorkflowInstance(id);
    if (!instance || instance.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Instance not found" }, { status: 404 });
    }

    const result = await workflowOrchestrator.resumeWorkflow(id);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: sanitizeErrorMessage(error, "Failed to resume workflow") }, { status: 500 });
  }
}
