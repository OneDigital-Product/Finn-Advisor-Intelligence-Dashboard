import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { detectedSignals } from "@shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { clientId } = await params;
    const advisorId = auth.session.userId;
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const filter = url.searchParams.get("filter") || "all";

    const conditions = [
      eq(detectedSignals.clientId, clientId),
      eq(detectedSignals.advisorId, advisorId),
      gte(detectedSignals.createdAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
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
        desc(detectedSignals.createdAt)
      );

    return NextResponse.json({ signals });
  } catch (err) {
    logger.error({ err }, "Error retrieving client signals");
    return NextResponse.json({ error: "Failed to retrieve signals" }, { status: 500 });
  }
}
