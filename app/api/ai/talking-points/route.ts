import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { generateTalkingPointsWithMeta, sanitizeObjectStrings } from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const clientIdBodySchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = clientIdBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const client = await storage.getClient(parsed.data.clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    const session = await getSession();
    const advisor = session.userId ? await getSessionAdvisor(session as any) : null;

    const hlds = await storage.getHoldingsByClient(client.id);
    const meta = await generateTalkingPointsWithMeta({
      clientName: sanitizePromptInput(`${client.firstName} ${client.lastName}`),
      clientInfo: sanitizeObjectStrings(client as Record<string, unknown>) as typeof client,
      holdings: hlds,
    });
    const { result, complianceStatus } = await applyComplianceGuardrail(
      meta.output,
      "talking_points",
      advisor?.id,
      client.id,
      client.riskTolerance || undefined
    );
    return NextResponse.json({
      result,
      complianceStatus,
      guardrailFlagged: meta.guardrailFlagged,
      guardrailViolations: meta.guardrailViolations,
    });
  } catch (err) {
    logger.error({ err }, "[AI] talking-points failed");
    return NextResponse.json({ message: "AI service error" }, { status: 500 });
  }
}
