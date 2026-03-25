import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { generateRetirementAnalysis } from "@server/openai";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const retirementAnalysisSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  scenarioName: z.string(),
  currentAge: z.number(),
  retirementAge: z.number(),
  lifeExpectancy: z.number(),
  annualSpending: z.number(),
  expectedReturn: z.number(),
  returnStdDev: z.number(),
  inflationRate: z.number(),
  portfolioValue: z.number(),
  successRate: z.number(),
  medianFinalBalance: z.number(),
  p10FinalBalance: z.number(),
  p90FinalBalance: z.number(),
  medianDepletionAge: z.number().nullable().optional(),
  events: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        amount: z.number(),
        startAge: z.number(),
        endAge: z.number().nullable().optional(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const advisor = session.userId ? await getSessionAdvisor(session as any) : null;
    if (!advisor)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const parsed = retirementAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const result = await generateRetirementAnalysis({
      clientId: parsed.data.clientId,
      clientName: parsed.data.clientName,
      scenarioName: parsed.data.scenarioName,
      currentAge: parsed.data.currentAge,
      retirementAge: parsed.data.retirementAge,
      lifeExpectancy: parsed.data.lifeExpectancy,
      portfolioValue: parsed.data.portfolioValue,
      annualSpending: parsed.data.annualSpending,
      expectedReturn: parsed.data.expectedReturn,
      inflationRate: parsed.data.inflationRate,
      successRate: parsed.data.successRate,
      medianFinalBalance: parsed.data.medianFinalBalance,
      p10FinalBalance: parsed.data.p10FinalBalance,
      p90FinalBalance: parsed.data.p90FinalBalance,
      medianDepletionAge: parsed.data.medianDepletionAge,
      events: parsed.data.events,
    });

    const { result: guardedNarrative, complianceStatus } =
      await applyComplianceGuardrail(
        result.advisorNarrative || "",
        "retirement_analysis",
        advisor.id,
        parsed.data.clientId
      );
    if (complianceStatus.outcome === "blocked") {
      result.advisorNarrative = guardedNarrative;
      result.clientSummary = "Content held for compliance review.";
    } else if (complianceStatus.outcome === "flagged") {
      result.advisorNarrative = guardedNarrative;
    }
    return NextResponse.json({ ...result, complianceStatus });
  } catch (err) {
    logger.error({ err }, "Retirement analysis failed");
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
