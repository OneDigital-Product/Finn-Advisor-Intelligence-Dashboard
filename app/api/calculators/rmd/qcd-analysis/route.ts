import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { analyzeQCD, type QCDAnalysisInput } from "@server/calculators/rmd-calculator";
import { logger } from "@server/lib/logger";

const qcdAnalysisBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  accountBalance: z.coerce.number().min(0),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  proposedQCDAmount: z.coerce.number().min(0),
  marginalTaxRate: z.coerce.number().min(0).max(1),
  standardDeduction: z.coerce.number().min(0).optional(),
  itemizedDeductions: z.coerce.number().min(0).optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(qcdAnalysisBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: QCDAnalysisInput = {
      accountHolderDOB: data.accountHolderDOB,
      accountBalance: data.accountBalance,
      taxYear: data.taxYear,
      proposedQCDAmount: data.proposedQCDAmount,
      marginalTaxRate: data.marginalTaxRate,
      standardDeduction: data.standardDeduction,
      itemizedDeductions: data.itemizedDeductions,
    };
    const results = analyzeQCD(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "rmd_qcd_analysis",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { qcdMaxAnnual: 105000, qcdMinAge: 70.5 },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "rmd_qcd_analysis", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/rmd/qcd-analysis error");
    return NextResponse.json({ error: "Failed to analyze QCD" }, { status: 400 });
  }
}
