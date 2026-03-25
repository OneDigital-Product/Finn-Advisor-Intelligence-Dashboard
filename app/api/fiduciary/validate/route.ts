import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { validateAIContent } from "@server/engines/fiduciary-compliance";

const validateContentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentType: z.string().min(1, "Content type is required"),
  clientId: z.string().optional(),
  clientRiskTolerance: z.string().optional(),
  clientAge: z.number().optional(),
  holdings: z.array(z.object({
    ticker: z.string(),
    name: z.string(),
    marketValue: z.number(),
    sector: z.string().optional(),
    weight: z.number().optional(),
  })).optional(),
  totalPortfolioValue: z.number().optional(),
  upcomingWithdrawals: z.array(z.object({
    amount: z.number(),
    date: z.string(),
    type: z.string(),
  })).optional(),
  rmdRequired: z.boolean().optional(),
  rmdAmount: z.number().optional(),
  investmentPolicyLimits: z.object({
    maxSinglePosition: z.number().optional(),
    maxSectorConcentration: z.number().optional(),
    prohibitedProducts: z.array(z.string()).optional(),
    maxEquityAllocation: z.number().optional(),
    minFixedIncomeAllocation: z.number().optional(),
  }).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = validateContentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const advisor = await getSessionAdvisor(auth.session);

    const result = await validateAIContent(body.content, body.contentType, {
      clientId: body.clientId,
      clientRiskTolerance: body.clientRiskTolerance,
      clientAge: body.clientAge,
      advisorId: advisor?.id,
      holdings: body.holdings,
      totalPortfolioValue: body.totalPortfolioValue,
      upcomingWithdrawals: body.upcomingWithdrawals,
      rmdRequired: body.rmdRequired,
      rmdAmount: body.rmdAmount,
      investmentPolicyLimits: body.investmentPolicyLimits,
    });

    try {
      await storage.createFiduciaryValidationLog({
        advisorId: advisor?.id || null,
        clientId: body.clientId || null,
        contentType: body.contentType,
        outcome: result.outcome,
        ruleSetVersion: result.ruleSetVersion,
        matchCount: result.matches.length,
        warningCount: result.warnings.length,
        blockCount: result.blocks.length,
        matches: result.matches as any,
        contentPreview: body.content.substring(0, 500),
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
      });
    } catch (logErr) {
      logger.error({ err: logErr }, "Failed to log fiduciary validation");
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "Fiduciary validation error");
    return NextResponse.json({ message: "Validation failed" }, { status: 500 });
  }
}
