import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { generateDirectIndexingAnalysis } from "@server/openai";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const directIndexingAnalysisSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  totalUnrealizedLoss: z.number(),
  totalUnrealizedGain: z.number(),
  taxLotCount: z.number(),
  harvestableCount: z.number(),
  totalHarvestableSavings: z.number(),
  washSaleTickersCount: z.number(),
  washSaleTickers: z.array(z.string()).optional(),
  topHarvestable: z
    .array(
      z.object({
        ticker: z.string(),
        unrealizedLoss: z.number(),
        potentialTaxSavings: z.number(),
        washSaleRisk: z.boolean(),
        replacementTicker: z.string().optional(),
        holdingPeriod: z.string(),
      })
    )
    .optional(),
  portfolioCount: z.number().optional(),
  taxAlpha: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const advisor = session.userId ? await getSessionAdvisor(session as any) : null;
    if (!advisor)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const parsed = directIndexingAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }

    const result = await generateDirectIndexingAnalysis({
      clientId: parsed.data.clientId,
      clientName: parsed.data.clientName,
      totalUnrealizedLoss: parsed.data.totalUnrealizedLoss,
      totalUnrealizedGain: parsed.data.totalUnrealizedGain,
      taxLotCount: parsed.data.taxLotCount,
      harvestableCount: parsed.data.harvestableCount,
      totalHarvestableSavings: parsed.data.totalHarvestableSavings,
      washSaleTickersCount: parsed.data.washSaleTickersCount,
      washSaleTickers: parsed.data.washSaleTickers,
      topHarvestable: parsed.data.topHarvestable,
      portfolioCount: parsed.data.portfolioCount,
      taxAlpha: parsed.data.taxAlpha,
    });

    const { result: guardedNarrative, complianceStatus } =
      await applyComplianceGuardrail(
        result.advisorNarrative || "",
        "direct_indexing_analysis",
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
    logger.error({ err }, "Direct indexing analysis failed");
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
