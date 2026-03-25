import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { calculateFeeRate, type FeeScheduleTier } from "@shared/schema";

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const allClients = await storage.getClients(advisor.id);

    const rows = await Promise.all(
      allClients.map(async (c) => {
        const accts = await storage.getAccountsByClient(c.id);
        const totalAum = accts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
        return {
          clientId: c.id,
          clientName: `${c.firstName} ${c.lastName}`,
          segment: c.segment,
          accountCount: accts.length,
          totalAum,
          estimatedRevenue: totalAum * calculateFeeRate(totalAum, advisor.feeSchedule as FeeScheduleTier[] | null, c.feeRateOverride),
          accounts: accts.map(a => ({
            accountNumber: a.accountNumber,
            type: a.accountType,
            custodian: a.custodian,
            balance: parseFloat(a.balance as string),
            status: a.status,
          })),
        };
      })
    );

    rows.sort((a, b) => b.totalAum - a.totalAum);

    const segmentTotals: Record<string, { count: number; aum: number; revenue: number }> = {};
    rows.forEach(r => {
      if (!segmentTotals[r.segment]) segmentTotals[r.segment] = { count: 0, aum: 0, revenue: 0 };
      segmentTotals[r.segment].count++;
      segmentTotals[r.segment].aum += r.totalAum;
      segmentTotals[r.segment].revenue += r.estimatedRevenue;
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totalAum: rows.reduce((s, r) => s + r.totalAum, 0),
      totalRevenue: rows.reduce((s, r) => s + r.estimatedRevenue, 0),
      clientCount: rows.length,
      segmentTotals,
      clients: rows,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
