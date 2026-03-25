import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { workflowOrchestrator } from "@server/engines/workflow-orchestrator";

const gateActionSchema = z.object({
  decision: z.enum(["approved", "rejected", "request_changes"]),
  decisionNote: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gateId: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { gateId } = await params;
    const gate = await storage.getWorkflowGate(gateId);
    if (!gate) return NextResponse.json({ message: "Gate not found" }, { status: 404 });
    if (gate.ownerId !== advisor.id) return NextResponse.json({ message: "Not authorized to act on this gate" }, { status: 403 });

    const raw = await request.json();
    const parsed = gateActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }

    await workflowOrchestrator.resolveGate(gateId, parsed.data.decision, parsed.data.decisionNote);

    const updatedGate = await storage.getWorkflowGate(gateId);
    return NextResponse.json(updatedGate);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: sanitizeErrorMessage(error, "Failed to process gate action") }, { status: 500 });
  }
}
