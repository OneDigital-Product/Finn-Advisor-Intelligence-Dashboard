import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");
    const calculatorType = url.searchParams.get("calculatorType");

    let conditions = [eq(calculatorRuns.advisorId, advisorId)];
    if (clientId) conditions.push(eq(calculatorRuns.clientId, clientId));
    if (calculatorType) conditions.push(eq(calculatorRuns.calculatorType, calculatorType));

    const runs = await db
      .select()
      .from(calculatorRuns)
      .where(and(...conditions))
      .orderBy(desc(calculatorRuns.createdAt))
      .limit(50);

    return NextResponse.json(runs);
  } catch (err) {
    logger.error({ err: err }, "GET /api/calculators/runs error");
    return NextResponse.json({ error: "Failed to fetch calculator runs" }, { status: 500 });
  }
}
