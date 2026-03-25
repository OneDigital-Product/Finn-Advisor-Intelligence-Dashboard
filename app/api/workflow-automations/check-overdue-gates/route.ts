import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { workflowOrchestrator } from "@server/engines/workflow-orchestrator";

export async function POST() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const escalated = await workflowOrchestrator.checkOverdueGates();
    return NextResponse.json({ escalated });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
