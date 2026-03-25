import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { querySopKnowledgeBase } from "@server/openai";
import { logger } from "@server/lib/logger";

const querySchema = z.object({
  question: z.string().min(1).max(2000),
  category: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });

    const relevantChunks = await storage.searchSopChunks(parsed.data.question, 8);

    const custodialMatches = await storage.getCustodialInstructions();
    const questionLower = parsed.data.question.toLowerCase();
    const relevantCustodial = custodialMatches.filter(ci =>
      questionLower.includes(ci.custodian.toLowerCase()) ||
      questionLower.includes(ci.actionType.toLowerCase()) ||
      questionLower.includes(ci.formName.toLowerCase())
    ).slice(0, 5);

    const result = await querySopKnowledgeBase(
      parsed.data.question,
      relevantChunks.map(c => ({
        content: c.content,
        documentTitle: c.documentTitle,
        documentCategory: c.documentCategory,
      })),
      relevantCustodial.length > 0 ? relevantCustodial.map(ci => ({
        custodian: ci.custodian,
        actionType: ci.actionType,
        formName: ci.formName,
        instructions: ci.instructions,
      })) : undefined
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "Error querying SOP knowledge base");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
