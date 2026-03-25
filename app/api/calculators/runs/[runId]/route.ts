import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { runId } = await params;
    const advisorId = session.userId;

    const [run] = await db
      .select()
      .from(calculatorRuns)
      .where(and(eq(calculatorRuns.id, runId), eq(calculatorRuns.advisorId, advisorId)));

    if (!run) return NextResponse.json({ error: "Calculator run not found" }, { status: 404 });
    return NextResponse.json(run);
  } catch (err) {
    logger.error({ err: err }, "GET /api/calculators/runs/:runId error");
    return NextResponse.json({ error: "Failed to fetch calculator run" }, { status: 500 });
  }
}
