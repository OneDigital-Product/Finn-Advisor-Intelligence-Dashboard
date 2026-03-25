import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { extractActionItems } from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const actionItemsSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  clientName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = actionItemsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const session = await getSession();
    const advisor = session.userId ? await getSessionAdvisor(session as any) : null;

    const rawResult = await extractActionItems(
      sanitizePromptInput(parsed.data.notes),
      sanitizePromptInput(parsed.data.clientName || "Client")
    );
    const { result, complianceStatus } = await applyComplianceGuardrail(
      rawResult,
      "action_items",
      advisor?.id
    );
    return NextResponse.json({ result, complianceStatus });
  } catch (err) {
    logger.error({ err }, "[AI] action-items failed");
    return NextResponse.json({ message: "AI service error" }, { status: 500 });
  }
}
