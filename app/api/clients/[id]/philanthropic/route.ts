import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

function computeCrtProjections(fundedValue: number, payoutRate: number, termYears: number, crtType: string): {
  projectedAnnualIncome: number;
  totalProjectedIncome: number;
  charitableDeduction: number;
  remainderToCharity: number;
} {
  const section7520Rate = 0.052;
  const annualIncome = fundedValue * payoutRate;
  const totalIncome = annualIncome * termYears;
  const remainderFactor = Math.pow(1 + section7520Rate, -termYears);
  const charitableDeduction = fundedValue * remainderFactor;
  const growthRate = 0.06;
  const remainderToCharity = crtType === "CRUT"
    ? fundedValue * Math.pow(1 + growthRate - payoutRate, termYears)
    : Math.max(0, fundedValue - totalIncome);

  return {
    projectedAnnualIncome: Math.round(annualIncome),
    totalProjectedIncome: Math.round(totalIncome),
    charitableDeduction: Math.round(charitableDeduction),
    remainderToCharity: Math.round(Math.max(0, remainderToCharity)),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const [dafAccountsList, crts, qcds] = await Promise.all([
      storage.getDafAccountsByClient(clientId),
      storage.getCrtsByClient(clientId),
      storage.getQcdRecordsByClient(clientId),
    ]);

    const dafAccountsWithTxns = await Promise.all(
      dafAccountsList.map(async (acct) => {
        const transactions = await storage.getDafTransactions(acct.id);
        return { ...acct, transactions };
      })
    );

    const crtsWithProjections = crts.map(crt => {
      const fundedValue = parseFloat(String(crt.fundedValue || "0"));
      const payoutRate = parseFloat(String(crt.payoutRate || "0.05"));
      const termYears = crt.termYears || 20;
      const projections = computeCrtProjections(fundedValue, payoutRate, termYears, crt.crtType);
      return { ...crt, projections };
    });

    const totalDafBalance = dafAccountsList.reduce((s, a) => s + parseFloat(String(a.currentBalance || "0")), 0);
    const totalDafContributions = dafAccountsList.reduce((s, a) => s + parseFloat(String(a.totalContributions || "0")), 0);
    const totalDafGrants = dafAccountsList.reduce((s, a) => s + parseFloat(String(a.totalGrants || "0")), 0);
    const totalCrtValue = crts.reduce((s, c) => s + parseFloat(String(c.currentValue || c.fundedValue || "0")), 0);
    const totalQcdAmount = qcds.reduce((s, q) => s + parseFloat(String(q.amount || "0")), 0);
    const totalTaxSavings = qcds.reduce((s, q) => s + parseFloat(String(q.taxSavingsEstimate || "0")), 0);

    const currentYear = new Date().getFullYear();
    const currentYearQcds = qcds.filter(q => q.taxYear === currentYear);
    const currentYearQcdTotal = currentYearQcds.reduce((s, q) => s + parseFloat(String(q.amount || "0")), 0);
    const qcdAnnualLimit = 105000;

    return NextResponse.json({
      dafAccounts: dafAccountsWithTxns,
      charitableRemainderTrusts: crtsWithProjections,
      qcdRecords: qcds,
      summary: {
        totalDafBalance,
        totalDafContributions,
        totalDafGrants,
        totalCrtValue,
        totalQcdAmount,
        totalTaxSavings,
        dafAccountCount: dafAccountsList.length,
        crtCount: crts.length,
        qcdCount: qcds.length,
        currentYearQcdTotal,
        qcdAnnualLimit,
        qcdRemainingCapacity: Math.max(0, qcdAnnualLimit - currentYearQcdTotal),
        totalPhilanthropicValue: totalDafBalance + totalCrtValue,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
