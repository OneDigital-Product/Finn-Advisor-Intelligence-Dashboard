import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateRetirementAnalysis, type RetirementAnalysisInput } from "@server/calculators/retirement-analysis-calculator";
import { logger } from "@server/lib/logger";

const retirementAnalysisBodySchema = z.object({
  currentAge: z.coerce.number().int().min(18).max(100),
  retirementAge: z.coerce.number().int().min(30).max(100),
  lifeExpectancy: z.coerce.number().int().min(50).max(120),
  portfolioValue: z.coerce.number().min(0),
  annualSpending: z.coerce.number().min(0),
  expectedReturn: z.coerce.number().min(-0.5).max(0.5),
  inflationRate: z.coerce.number().min(-0.1).max(0.2),
  preRetirementContribution: z.coerce.number().min(0),
  socialSecurityPIA: z.coerce.number().min(0).optional(),
  socialSecurityClaimingAge: z.coerce.number().int().min(62).max(70).optional(),
  spousePIA: z.coerce.number().min(0).optional(),
  spouseClaimingAge: z.coerce.number().int().min(62).max(70).optional(),
  pensionAnnualBenefit: z.coerce.number().min(0).optional(),
  pensionLumpSum: z.coerce.number().min(0).optional(),
  pensionStartAge: z.coerce.number().int().min(50).max(100).optional(),
  rentalIncome: z.coerce.number().min(0).optional(),
  rentalVacancyRate: z.coerce.number().min(0).max(1).optional(),
  filingStatus: z.enum(["single", "married_filing_jointly"]).optional(),
  traditionalBalance: z.coerce.number().min(0).optional(),
  rothBalance: z.coerce.number().min(0).optional(),
  taxableBalance: z.coerce.number().min(0).optional(),
  marginalTaxRate: z.coerce.number().min(0).max(0.5).optional(),
  stateRate: z.coerce.number().min(0).max(0.15).optional(),
  returnVolatility: z.coerce.number().min(0).max(1).optional(),
  clientId: z.string().optional(),
}).refine(data => data.retirementAge > data.currentAge, {
  message: "Retirement age must be greater than current age",
  path: ["retirementAge"],
}).refine(data => data.lifeExpectancy >= data.retirementAge, {
  message: "Life expectancy must be at least retirement age",
  path: ["lifeExpectancy"],
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(retirementAnalysisBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: RetirementAnalysisInput = {
      currentAge: data.currentAge,
      retirementAge: data.retirementAge,
      lifeExpectancy: data.lifeExpectancy,
      portfolioValue: data.portfolioValue,
      annualSpending: data.annualSpending,
      expectedReturn: data.expectedReturn,
      inflationRate: data.inflationRate,
      preRetirementContribution: data.preRetirementContribution,
      socialSecurityPIA: data.socialSecurityPIA,
      socialSecurityClaimingAge: data.socialSecurityClaimingAge,
      spousePIA: data.spousePIA,
      spouseClaimingAge: data.spouseClaimingAge,
      pensionAnnualBenefit: data.pensionAnnualBenefit,
      pensionLumpSum: data.pensionLumpSum,
      pensionStartAge: data.pensionStartAge,
      rentalIncome: data.rentalIncome,
      rentalVacancyRate: data.rentalVacancyRate,
      filingStatus: data.filingStatus,
      traditionalBalance: data.traditionalBalance,
      rothBalance: data.rothBalance,
      taxableBalance: data.taxableBalance,
      marginalTaxRate: data.marginalTaxRate,
      stateRate: data.stateRate,
      returnVolatility: data.returnVolatility,
    };

    const results = calculateRetirementAnalysis(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "retirement_analysis",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: {
          scenarioCount: 5,
          ssClaimingRange: "62-70",
          expensePhases: "go-go/slow-go/no-go",
          healthcareInflation: "5%",
          monteCarloSims: 500,
        },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "retirement_analysis", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/retirement-analysis error");
    return NextResponse.json({ error: "Failed to run retirement analysis" }, { status: 400 });
  }
}
