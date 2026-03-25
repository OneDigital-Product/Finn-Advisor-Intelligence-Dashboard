import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const allGoals = await storage.getFinancialGoalsByAdvisor(advisor.id);
    const totalTarget = allGoals.reduce((s, g) => s + parseFloat(g.targetAmount), 0);
    const totalCurrent = allGoals.reduce((s, g) => s + parseFloat(g.currentAmount), 0);
    const aggregateFundedRatio = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0;

    const byBucket = [1, 2, 3].map(b => {
      const bucketGoals = allGoals.filter(g => g.bucket === b);
      const target = bucketGoals.reduce((s, g) => s + parseFloat(g.targetAmount), 0);
      const current = bucketGoals.reduce((s, g) => s + parseFloat(g.currentAmount), 0);
      return {
        bucket: b,
        goalsCount: bucketGoals.length,
        totalTarget: target,
        totalCurrent: current,
        fundedRatio: target > 0 ? Math.min(100, (current / target) * 100) : 0,
      };
    });

    const clientIds = [...new Set(allGoals.map(g => g.clientId))];

    return NextResponse.json({
      totalGoals: allGoals.length,
      clientsWithGoals: clientIds.length,
      aggregateFundedRatio,
      totalTarget,
      totalCurrent,
      byBucket,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
