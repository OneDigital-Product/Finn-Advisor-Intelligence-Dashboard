import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { calculateRMD } from "@server/calculators/rmd-calculator";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { accountHolderDOB, accountBalance, taxYear, assumedGrowthRate, qcdAmount, marginalTaxRate } = await request.json();

    if (!accountHolderDOB || !accountBalance || !taxYear) {
      return NextResponse.json({ error: "accountHolderDOB, accountBalance, and taxYear are required" }, { status: 400 });
    }

    const rmdResult = calculateRMD({
      accountHolderDOB,
      accountBalance,
      taxYear,
      assumedGrowthRate: assumedGrowthRate || 0.05,
      qcdAmount: qcdAmount || 0,
      marginalTaxRate: marginalTaxRate || 0.37,
      projectionYears: 10,
    });

    return NextResponse.json(rmdResult);
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to run QCD analysis") }, { status: 400 });
  }
}
