import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { calculateWithdrawalAnalysis, type WithdrawalAnalysisInput } from "@server/calculators/withdrawal-analysis-calculator";
import { logger } from "@server/lib/logger";

const schema = z.object({
  currentAge: z.coerce.number().int().min(30).max(100),
  retirementAge: z.coerce.number().int().min(50).max(100),
  lifeExpectancy: z.coerce.number().int().min(70).max(120).default(90),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  annualSpendingNeed: z.coerce.number().min(0),
  socialSecurityBenefit: z.coerce.number().min(0),
  pensionIncome: z.coerce.number().min(0).default(0),
  otherIncome: z.coerce.number().min(0).default(0),
  accounts: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["roth", "taxable", "traditional_ira", "401k"]),
    balance: z.coerce.number().min(0),
    costBasis: z.coerce.number().min(0).optional(),
    unrealizedGains: z.coerce.number().optional(),
    annualContributions: z.coerce.number().min(0).optional(),
  })).min(1),
  stateOfResidence: z.string().min(2).max(2),
  expectedGrowthRate: z.coerce.number().min(-0.10).max(0.20).default(0.06),
  inflationRate: z.coerce.number().min(0).max(0.10).default(0.025),
  projectionYears: z.coerce.number().int().min(1).max(30).default(10),
  qcdAmount: z.coerce.number().min(0).optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor context" }, { status: 403 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;

    const input: WithdrawalAnalysisInput = {
      currentAge: data.currentAge, retirementAge: data.retirementAge,
      lifeExpectancy: data.lifeExpectancy, filingStatus: data.filingStatus,
      annualSpendingNeed: data.annualSpendingNeed, socialSecurityBenefit: data.socialSecurityBenefit,
      pensionIncome: data.pensionIncome, otherIncome: data.otherIncome,
      accounts: data.accounts, stateOfResidence: data.stateOfResidence,
      expectedGrowthRate: data.expectedGrowthRate, inflationRate: data.inflationRate,
      projectionYears: data.projectionYears, qcdAmount: data.qcdAmount,
    };

    const results = calculateWithdrawalAnalysis(input);
    logger.info({ clientId: data.clientId }, "Withdrawal analysis calculated");
    return NextResponse.json(results);
  } catch (err) {
    logger.error({ err }, "Error calculating withdrawal analysis");
    return NextResponse.json({ message: "Failed to calculate withdrawal analysis" }, { status: 500 });
  }
}
