import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const signoffs = await storage.getGateSignoffs();
    return NextResponse.json(signoffs);
  } catch (err: any) {
    logger.error({ err: err }, "[PilotMetrics] Signoffs error:");
    return NextResponse.json({ error: "Failed to fetch signoffs" }, { status: 500 });
  }
}
