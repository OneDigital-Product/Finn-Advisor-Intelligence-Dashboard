import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { generateFollowUpEmail } from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const followUpEmailSchema = z.object({
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  meetingNotes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = followUpEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const session = await getSession();
    const advisor = session.userId ? await getSessionAdvisor(session as any) : null;

    const rawResult = await generateFollowUpEmail({
      clientName: sanitizePromptInput(parsed.data.clientName || "Client"),
      clientEmail: parsed.data.clientEmail || "",
      meetingNotes: sanitizePromptInput(parsed.data.meetingNotes || ""),
      advisorName: advisor?.name || "Your Advisor",
    });
    const { result, complianceStatus } = await applyComplianceGuardrail(
      rawResult,
      "follow_up_email",
      advisor?.id
    );
    return NextResponse.json({ result, complianceStatus });
  } catch (err) {
    logger.error({ err }, "[AI] follow-up-email failed");
    return NextResponse.json({ message: "AI service error" }, { status: 500 });
  }
}
