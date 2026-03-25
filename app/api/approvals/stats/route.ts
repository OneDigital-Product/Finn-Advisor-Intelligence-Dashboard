import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalItems } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;

    const result = await db
      .select({
        status: approvalItems.status,
        count: sql<number>`count(*)::int`,
      })
      .from(approvalItems)
      .where(eq(approvalItems.submittedBy, advisorId))
      .groupBy(approvalItems.status);

    const stats: Record<string, number> = {};
    for (const row of result) {
      stats[row.status] = row.count;
    }

    const urgentResult = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(approvalItems)
      .where(
        and(
          eq(approvalItems.submittedBy, advisorId),
          eq(approvalItems.status, "pending"),
          eq(approvalItems.priority, "urgent")
        )
      );

    return NextResponse.json({
      ...stats,
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      urgent: urgentResult[0]?.count ?? 0,
    });
  } catch (err: any) {
    logger.error({ err: err }, "GET /api/approvals/stats error");
    return NextResponse.json({ error: "Failed to fetch approval stats" }, { status: 500 });
  }
}
