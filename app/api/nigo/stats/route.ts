import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { nigoItems } from "@shared/schema";
import { sql } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const statusStats = await db
      .select({
        status: nigoItems.status,
        count: sql<number>`count(*)::int`,
      })
      .from(nigoItems)
      .groupBy(nigoItems.status);

    const custodianStats = await db
      .select({
        custodian: nigoItems.custodian,
        count: sql<number>`count(*)::int`,
        pendingCount: sql<number>`count(*) filter (where ${nigoItems.status} = 'pending')::int`,
        rmdTotal: sql<string>`coalesce(sum(${nigoItems.rmdAmount}), 0)::text`,
      })
      .from(nigoItems)
      .groupBy(nigoItems.custodian);

    const rmdByYear = await db
      .select({
        rmdYear: nigoItems.rmdYear,
        custodian: nigoItems.custodian,
        totalRmd: sql<string>`coalesce(sum(${nigoItems.rmdAmount}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(nigoItems)
      .where(sql`${nigoItems.rmdAmount} is not null and ${nigoItems.rmdYear} is not null`)
      .groupBy(nigoItems.rmdYear, nigoItems.custodian)
      .orderBy(nigoItems.rmdYear);

    return NextResponse.json({
      byStatus: statusStats,
      byCustodian: custodianStats,
      rmdAggregation: rmdByYear,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[NIGO] Stats error:");
    return NextResponse.json({ message: "Failed to fetch NIGO stats" }, { status: 500 });
  }
}
