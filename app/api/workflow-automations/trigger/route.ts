import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { workflowOrchestrator } from "@server/engines/workflow-orchestrator";

const triggerWorkflowSchema = z.object({
  definitionId: z.string().optional(),
  slug: z.string().optional(),
  clientId: z.string().optional(),
  meetingId: z.string().optional(),
  triggerPayload: z.record(z.any()).optional(),
}).refine((data) => data.definitionId || data.slug, {
  message: "Either definitionId or slug must be provided",
});

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const raw = await request.json();
    const parsed = triggerWorkflowSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    if (body.clientId) {
      const client = await storage.getClient(body.clientId);
      if (!client || client.advisorId !== advisor.id) {
        return NextResponse.json({ message: "Client does not belong to this advisor" }, { status: 403 });
      }
    }
    if (body.meetingId) {
      const meeting = await storage.getMeeting(body.meetingId);
      if (!meeting || meeting.advisorId !== advisor.id) {
        return NextResponse.json({ message: "Meeting does not belong to this advisor" }, { status: 403 });
      }
    }

    const payload = body.triggerPayload || {};

    let instance;
    if (body.slug) {
      instance = await workflowOrchestrator.triggerWorkflowBySlug(
        body.slug,
        advisor.id,
        payload,
        { clientId: body.clientId, meetingId: body.meetingId }
      );
    } else {
      instance = await workflowOrchestrator.triggerWorkflow(
        body.definitionId!,
        advisor.id,
        payload,
        { clientId: body.clientId, meetingId: body.meetingId }
      );
    }

    return NextResponse.json(instance);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: sanitizeErrorMessage(error, "Failed to trigger workflow") }, { status: 500 });
  }
}
