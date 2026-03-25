import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
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

    const [definition, steps, gates] = await Promise.all([
      storage.getWorkflowDefinition_v2(instance.definitionId),
      storage.getWorkflowStepExecutions(instance.id),
      storage.getWorkflowGatesByInstance(instance.id),
    ]);

    return NextResponse.json({
      ...instance,
      definitionName: definition?.name || "Unknown",
      definitionSlug: definition?.slug || "unknown",
      stepExecutions: steps,
      gates,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
