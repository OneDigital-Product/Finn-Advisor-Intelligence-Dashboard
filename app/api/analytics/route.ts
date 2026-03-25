import { NextResponse } from "next/server";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { calculateFeeRate, type FeeScheduleTier } from "@shared/schema";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const session = await getSession();
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const [allClients, allHouseholds, allTasks, allActivities, allCompliance] = await Promise.all([
      storage.getClients(advisor.id),
      storage.getHouseholds(advisor.id),
      storage.getTasks(advisor.id),
      storage.getActivities(advisor.id),
      storage.getComplianceItems(advisor.id),
    ]);

    // Batch-fetch AUM for all clients in a single query (avoids N+1)
    const aumByClient = await storage.getAumByClient(allClients.map(c => c.id));

    const clientAnalytics = allClients.map((c) => {
      const totalAum = aumByClient.get(c.id)?.totalAum ?? 0;
      const clientActivities = allActivities.filter(a => a.clientId === c.id);
      const daysSinceContact = c.lastContactDate
        ? Math.floor((Date.now() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        segment: c.segment,
        totalAum,
        lastContact: c.lastContactDate,
        nextReview: c.nextReviewDate,
        daysSinceContact,
        activityCount: clientActivities.length,
        isAtRisk: daysSinceContact > 90 || (c.segment === "A" && daysSinceContact > 60),
        referralSource: c.referralSource,
        status: c.status,
      };
    });

    const segmentAnalytics = {
      A: { count: 0, totalAum: 0, revenue: 0 },
      B: { count: 0, totalAum: 0, revenue: 0 },
      C: { count: 0, totalAum: 0, revenue: 0 },
      D: { count: 0, totalAum: 0, revenue: 0 },
    };

    const feeSchedule = advisor.feeSchedule as FeeScheduleTier[] | null;

    clientAnalytics.forEach(c => {
      const seg = c.segment as keyof typeof segmentAnalytics;
      if (segmentAnalytics[seg]) {
        segmentAnalytics[seg].count++;
        segmentAnalytics[seg].totalAum += c.totalAum;
        const client = allClients.find(cl => cl.id === c.id);
        const feeRate = calculateFeeRate(c.totalAum, feeSchedule, client?.feeRateOverride);
        segmentAnalytics[seg].revenue += c.totalAum * feeRate;
      }
    });

    const totalAum = allHouseholds.reduce((sum, h) => sum + parseFloat(h.totalAum as string || "0"), 0);

    return NextResponse.json({
      totalAum,
      totalClients: allClients.length,
      clientAnalytics,
      segmentAnalytics,
      atRiskClients: clientAnalytics.filter(c => c.isAtRisk),
      overdueReviews: clientAnalytics.filter(c => c.daysSinceContact > 90),
      referralSources: [...new Set(allClients.map(c => c.referralSource).filter(Boolean))],
      complianceOverview: {
        current: allCompliance.filter(c => c.status === "current").length,
        expiringSoon: allCompliance.filter(c => c.status === "expiring_soon").length,
        overdue: allCompliance.filter(c => c.status === "overdue").length,
        pending: allCompliance.filter(c => c.status === "pending").length,
      },
      capacityMetrics: {
        currentClients: allClients.length,
        maxCapacity: advisor.maxCapacity || 120,
        utilizationPct: (allClients.length / (advisor.maxCapacity || 120)) * 100,
      },
    }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
  } catch (err: any) {
    logger.error({ err: err }, "[Analytics] GET error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
