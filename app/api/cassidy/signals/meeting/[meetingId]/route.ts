import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { detectedSignals } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { meetingId } = await params;
    const advisorId = auth.session.userId;
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "all";

    const conditions = [
      eq(detectedSignals.meetingId, meetingId),
      eq(detectedSignals.advisorId, advisorId),
    ];

    if (filter !== "all") {
      conditions.push(eq(detectedSignals.status, filter));
    }

    const signals = await storage.db
      .select()
      .from(detectedSignals)
      .where(and(...conditions))
      .orderBy(
        sql`CASE WHEN ${detectedSignals.materiality} = 'CRITICAL' THEN 0 ELSE 1 END`,
        sql`CASE ${detectedSignals.confidence} WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END`,
        desc(detectedSignals.createdAt)
      );

    return NextResponse.json({ signals });
  } catch (err) {
    logger.error({ err }, "Error retrieving signals");
    return NextResponse.json({ error: "Failed to retrieve signals" }, { status: 500 });
  }
}
