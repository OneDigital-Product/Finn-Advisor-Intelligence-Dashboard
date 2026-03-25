import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateRMD, type RMDInput } from "@server/calculators/rmd-calculator";
import { logger } from "@server/lib/logger";

const rmdBodySchema = z.object({
  accountHolderDOB: z.string().min(1, "accountHolderDOB is required"),
  accountBalance: z.coerce.number().min(0, "accountBalance must be non-negative"),
  beneficiaryDOB: z.string().optional(),
  beneficiaryRelationship: z.enum(["spouse", "non_spouse", "none"]).optional(),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  assumedGrowthRate: z.coerce.number().min(-1).max(1).optional(),
  inheritanceStatus: z.enum(["original_owner", "inherited_ira", "post_secure_act"]).optional(),
  projectionYears: z.coerce.number().int().min(1).max(50).optional(),
  clientId: z.string().optional(),
  qcdAmount: z.coerce.number().min(0).optional(),
  qcdAnnualIncrease: z.coerce.number().min(0).max(1).optional(),
  marginalTaxRate: z.coerce.number().min(0).max(1).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(rmdBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: RMDInput = {
      accountHolderDOB: data.accountHolderDOB,
      accountBalance: data.accountBalance,
      beneficiaryDOB: data.beneficiaryDOB || undefined,
      beneficiaryRelationship: data.beneficiaryRelationship || "none",
      taxYear: data.taxYear,
      assumedGrowthRate: data.assumedGrowthRate !== undefined ? data.assumedGrowthRate : 0.07,
      inheritanceStatus: data.inheritanceStatus || "original_owner",
      projectionYears: data.projectionYears || 10,
      qcdAmount: data.qcdAmount,
      qcdAnnualIncrease: data.qcdAnnualIncrease,
      marginalTaxRate: data.marginalTaxRate,
    };

    const results = calculateRMD(inputs);

    const assumptions = {
      mortalityTableUsed: "IRS Uniform Lifetime Table III",
      withdrawalTiming: "by December 31",
      inflationAssumption: null,
    };

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "rmd",
        clientId: data.clientId || null,
        advisorId: advisorId!,
        inputs,
        results,
        assumptions,
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({
      id: run.id,
      calculatorType: "rmd",
      inputs,
      results,
      assumptions,
      createdAt: run.createdAt,
    }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/rmd error");
    return NextResponse.json({ error: "Failed to calculate RMD" }, { status: 400 });
  }
}
