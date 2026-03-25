import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { answerNaturalLanguageQueryWithMeta, sanitizeObjectStrings } from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const session = await getSession();
    const advisor = session.userId ? await getSessionAdvisor(session as any) : null;
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const [allClients, allHouseholds] = await Promise.all([
      storage.getClients(advisor.id),
      storage.getHouseholds(advisor.id),
    ]);

    const clientSummaries = await Promise.all(
      allClients.map(async (c) => {
        const accts = await storage.getAccountsByClient(c.id);
        const totalAum = accts.reduce(
          (sum, a) => sum + parseFloat(a.balance as string),
          0
        );
        return sanitizeObjectStrings({
          name: `${c.firstName} ${c.lastName}`,
          segment: c.segment || "",
          totalAum,
          lastContact: c.lastContactDate,
          nextReview: c.nextReviewDate,
          status: c.status || "",
        });
      })
    );

    const sanitizedHouseholds = sanitizeObjectStrings(allHouseholds);
    const context = JSON.stringify({
      clients: clientSummaries,
      households: sanitizedHouseholds,
      totalClients: allClients.length,
    });
    const meta = await answerNaturalLanguageQueryWithMeta(
      sanitizePromptInput(parsed.data.query),
      context
    );
    const { result, complianceStatus } = await applyComplianceGuardrail(
      meta.output,
      "natural_language_query",
      advisor.id
    );
    return NextResponse.json({
      result,
      complianceStatus,
      guardrailFlagged: meta.guardrailFlagged,
      guardrailViolations: meta.guardrailViolations,
    });
  } catch (err) {
    logger.error({ err }, "[AI] query failed");
    return NextResponse.json({ message: "AI service error" }, { status: 500 });
  }
}
