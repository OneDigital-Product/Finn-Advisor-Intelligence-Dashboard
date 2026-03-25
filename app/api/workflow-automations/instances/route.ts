import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const url = new URL(request.url);
    const filters: any = { advisorId: advisor.id };
    if (url.searchParams.get("status")) filters.status = url.searchParams.get("status");
    if (url.searchParams.get("clientId")) filters.clientId = url.searchParams.get("clientId");
    if (url.searchParams.get("definitionId")) filters.definitionId = url.searchParams.get("definitionId");
    if (url.searchParams.get("meetingId")) filters.meetingId = url.searchParams.get("meetingId");

    const instances = await storage.getWorkflowInstances(filters);

    const enriched = await Promise.all(
      instances.map(async (inst) => {
        const definition = await storage.getWorkflowDefinition_v2(inst.definitionId);
        const gates = await storage.getWorkflowGatesByInstance(inst.id);
        const stepExecutions = await storage.getWorkflowStepExecutions(inst.id);
        const pendingGates = gates.filter((g) => g.status === "pending");
        const client = inst.clientId ? await storage.getClient(inst.clientId) : null;
        const stepsArray = Array.isArray(definition?.steps) ? definition.steps : [];
        const totalSteps = stepsArray.length;
        const completedSteps = stepExecutions.filter((s) => s.status === "completed").length;
        const lastCompletedStep = stepExecutions
          .filter((s) => s.status === "completed" && s.outputPayload)
          .sort((a, b) => (a.stepIndex > b.stepIndex ? -1 : 1))[0];
        const completionSummary = lastCompletedStep?.outputPayload
          ? (typeof (lastCompletedStep.outputPayload as Record<string, unknown>).summary === "string"
              ? (lastCompletedStep.outputPayload as Record<string, unknown>).summary as string
              : typeof (lastCompletedStep.outputPayload as Record<string, unknown>).content === "string"
                ? String((lastCompletedStep.outputPayload as Record<string, unknown>).content).slice(0, 200)
                : null)
          : null;
        return {
          ...inst,
          definitionName: definition?.name || "Unknown",
          definitionSlug: definition?.slug || "unknown",
          definitionCategory: definition?.category || "general",
          clientName: client ? `${client.firstName} ${client.lastName}` : null,
          totalSteps,
          completedSteps,
          completionSummary,
          pendingGateCount: pendingGates.length,
          pendingGates: pendingGates.map((g) => ({
            id: g.id,
            gateName: g.gateName,
            expiresAt: g.expiresAt,
            escalationLevel: g.escalationLevel,
          })),
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
