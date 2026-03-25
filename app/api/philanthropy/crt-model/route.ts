import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

const crtModelSchema = z.object({
  fundedAmount: z.number(),
  termYears: z.number(),
  payoutRate: z.number(),
  section7520Rate: z.number(),
  assumedGrowthRate: z.number(),
  trustType: z.enum(["CRAT", "CRUT"]),
  taxBracket: z.number().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const data = crtModelSchema.parse(raw);
    const {
      fundedAmount,
      termYears,
      payoutRate,
      section7520Rate,
      assumedGrowthRate,
      trustType,
      taxBracket = 0.37,
    } = data;

    const projections = [];
    let remainingValue = fundedAmount;

    for (let year = 1; year <= termYears; year++) {
      const annualPayout = trustType === "CRAT"
        ? fundedAmount * payoutRate
        : remainingValue * payoutRate;

      const growthOnRemaining = (remainingValue - annualPayout) * assumedGrowthRate;
      remainingValue = remainingValue - annualPayout + growthOnRemaining;

      projections.push({
        year,
        annualPayout: Math.round(annualPayout * 100) / 100,
        remainingValue: Math.round(Math.max(0, remainingValue) * 100) / 100,
      });
    }

    const totalPayouts = projections.reduce((s, p) => s + p.annualPayout, 0);
    const remainderValue = Math.max(0, projections[projections.length - 1]?.remainingValue || 0);

    const annuityFactor = (1 - Math.pow(1 + section7520Rate, -termYears)) / section7520Rate;
    const presentValueOfIncome = (fundedAmount * payoutRate) * annuityFactor;
    const charitableDeduction = Math.max(0, fundedAmount - presentValueOfIncome);
    const taxSavings = charitableDeduction * taxBracket;

    return NextResponse.json({
      projections,
      summary: {
        fundedAmount,
        totalPayouts: Math.round(totalPayouts * 100) / 100,
        remainderValue: Math.round(remainderValue * 100) / 100,
        charitableDeduction: Math.round(charitableDeduction * 100) / 100,
        taxSavings: Math.round(taxSavings * 100) / 100,
        effectivePayoutRate: payoutRate * 100,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to calculate CRT model") }, { status: 400 });
  }
}
