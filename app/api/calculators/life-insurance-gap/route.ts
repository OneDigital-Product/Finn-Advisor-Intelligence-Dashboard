import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateLifeInsuranceGap, type LifeInsuranceGapInput } from "@server/calculators/life-insurance-gap-calculator";
import { logger } from "@server/lib/logger";

const lifeInsuranceGapBodySchema = z.object({
  annualIncome: z.coerce.number().min(0),
  spouseIncome: z.coerce.number().min(0).optional(),
  dependents: z.coerce.number().int().min(0).max(20),
  youngestDependentAge: z.coerce.number().int().min(0).max(30).optional(),
  mortgageBalance: z.coerce.number().min(0).optional(),
  otherDebts: z.coerce.number().min(0).optional(),
  educationFundingGoal: z.enum(["public", "private", "none"]),
  childrenNeedingEducation: z.coerce.number().int().min(0).max(20).optional(),
  averageChildAge: z.coerce.number().int().min(0).max(25).optional(),
  existingLifeInsurance: z.coerce.number().min(0).optional(),
  existingGroupCoverage: z.coerce.number().min(0).optional(),
  liquidSavings: z.coerce.number().min(0).optional(),
  retirementAssets: z.coerce.number().min(0).optional(),
  annualExpenses: z.coerce.number().min(0).optional(),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  yearsOfIncomeReplacement: z.coerce.number().int().min(1).max(50).optional(),
  funeralAndFinalExpenses: z.coerce.number().min(0).optional(),
  estateSize: z.coerce.number().min(0).optional(),
  estateTaxExemption: z.coerce.number().min(0).optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(lifeInsuranceGapBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: LifeInsuranceGapInput = {
      annualIncome: data.annualIncome,
      spouseIncome: data.spouseIncome,
      dependents: data.dependents,
      youngestDependentAge: data.youngestDependentAge,
      mortgageBalance: data.mortgageBalance,
      otherDebts: data.otherDebts,
      educationFundingGoal: data.educationFundingGoal,
      childrenNeedingEducation: data.childrenNeedingEducation,
      averageChildAge: data.averageChildAge,
      existingLifeInsurance: data.existingLifeInsurance,
      existingGroupCoverage: data.existingGroupCoverage,
      liquidSavings: data.liquidSavings,
      retirementAssets: data.retirementAssets,
      annualExpenses: data.annualExpenses,
      filingStatus: data.filingStatus,
      yearsOfIncomeReplacement: data.yearsOfIncomeReplacement,
      funeralAndFinalExpenses: data.funeralAndFinalExpenses,
      estateSize: data.estateSize,
      estateTaxExemption: data.estateTaxExemption,
    };
    const results = calculateLifeInsuranceGap(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "life_insurance_gap",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { discountRate: 0.05, incomeGrowthRate: 0.03, educationInflation: 0.05 },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "life_insurance_gap", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/life-insurance-gap error");
    return NextResponse.json({ error: "Failed to calculate life insurance gap analysis" }, { status: 400 });
  }
}
