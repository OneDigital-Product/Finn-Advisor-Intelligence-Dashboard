import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { calculateAllGates } from "@server/engines/pilot-metrics";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const snapshot = await calculateAllGates();
    return NextResponse.json(snapshot);
  } catch (err: any) {
    logger.error({ err: err }, "[PilotMetrics] Gates error:");
    return NextResponse.json({ error: "Failed to calculate gates" }, { status: 500 });
  }
}
