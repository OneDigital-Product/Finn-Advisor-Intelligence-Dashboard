import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { generateWithdrawalAnalysis } from "@server/openai";
import { applyComplianceGuardrail } from "@lib/ai-compliance-guardrail";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const withdrawalAnalysisSchema = z.object({
  clientName: z.string().min(1),
  clientId: z.string().optional(),
  accountType: z.string(),
  accountNumber: z.string(),
  withdrawalAmount: z.number(),
  accountBalance: z.number().optional(),
  method: z.string(),
  reason: z.string(),
  frequency: z.string(),
  taxWithholding: z.string().nullable().optional(),
  clientAge: z.number().optional(),
  retirementAge: z.number().optional(),
  lifeExpectancy: z.number().optional(),
  filingStatus: z.string().optional(),
  socialSecurityBenefit: z.number().optional(),
  pensionIncome: z.number().optional(),
  otherIncome: z.number().optional(),
  stateOfResidence: z.string().optional(),
  expectedGrowthRate: z.number().optional(),
  inflationRate: z.number().optional(),
  projectionYears: z.number().optional(),
  qcdAmount: z.number().optional(),
  accounts: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["roth", "taxable", "traditional_ira", "401k"]),
        balance: z.number(),
        costBasis: z.number().optional(),
        unrealizedGains: z.number().optional(),
        annualContributions: z.number().optional(),
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
    const parsed = withdrawalAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const d = parsed.data;

    let accounts: Array<{
      name: string;
      type: "roth" | "taxable" | "traditional_ira" | "401k";
      balance: number;
      costBasis?: number;
      unrealizedGains?: number;
      annualContributions?: number;
    }>;
    if (d.accounts && d.accounts.length > 0) {
      accounts = d.accounts;
    } else {
      const accountType = d.accountType?.toLowerCase() || "";
      const isRoth = /roth/i.test(accountType);
      const isRetirement = /ira|401k|403b|roth|retirement|sep/i.test(accountType);
      const mappedType = isRoth
        ? ("roth" as const)
        : isRetirement
          ? ("traditional_ira" as const)
          : ("taxable" as const);
      accounts = [
        {
          name: d.accountNumber || "Primary Account",
          type: mappedType,
          balance: d.accountBalance || 0,
        },
      ];
    }

    const filingStatusVal =
      d.filingStatus === "single"
        ? ("single" as const)
        : ("married_filing_jointly" as const);

    const result = await generateWithdrawalAnalysis({
      currentAge: d.clientAge || 65,
      retirementAge: d.retirementAge || 65,
      lifeExpectancy: d.lifeExpectancy || 90,
      filingStatus: filingStatusVal,
      annualSpendingNeed:
        d.frequency === "one_time" ? d.withdrawalAmount : d.withdrawalAmount * 12,
      socialSecurityBenefit: d.socialSecurityBenefit || 0,
      pensionIncome: d.pensionIncome || 0,
      otherIncome: d.otherIncome || 0,
      accounts,
      stateOfResidence: d.stateOfResidence || "Unknown",
      expectedGrowthRate: d.expectedGrowthRate || 0.06,
      inflationRate: d.inflationRate || 0.025,
      projectionYears: d.projectionYears || 25,
      qcdAmount: d.qcdAmount,
      clientId: d.clientId,
    });

    const { result: guardedNarrative, complianceStatus } =
      await applyComplianceGuardrail(
        result.advisorNarrative || "",
        "withdrawal_analysis",
        advisor.id
      );
    if (complianceStatus.outcome === "blocked") {
      result.advisorNarrative = guardedNarrative;
      result.clientSummary = "Content held for compliance review.";
    } else if (complianceStatus.outcome === "flagged") {
      result.advisorNarrative = guardedNarrative;
    }
    return NextResponse.json({ ...result, complianceStatus });
  } catch (err) {
    logger.error({ err }, "Withdrawal analysis failed");
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
