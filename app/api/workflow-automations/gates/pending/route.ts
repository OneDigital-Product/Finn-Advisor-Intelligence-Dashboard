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

    const gates = await storage.getWorkflowGatesByOwner(advisor.id, "pending");

    const enriched = await Promise.all(
      gates.map(async (gate) => {
        const instance = await storage.getWorkflowInstance(gate.instanceId);
        const definition = instance ? await storage.getWorkflowDefinition_v2(instance.definitionId) : null;
        const client = instance?.clientId ? await storage.getClient(instance.clientId) : null;
        return {
          ...gate,
          workflowName: definition?.name || "Unknown",
          clientName: client ? `${client.firstName} ${client.lastName}` : null,
          clientId: instance?.clientId,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
