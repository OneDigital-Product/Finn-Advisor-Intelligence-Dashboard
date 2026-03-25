import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { clearGateCache } from "@server/engines/pilot-metrics";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest, { params }: { params: Promise<{ gate: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const { gate } = await params;

    const body = await request.json();
    const { signedOffBy, title, reason } = body;

    if (!signedOffBy || !title) {
      return NextResponse.json({ error: "signedOffBy and title are required" }, { status: 400 });
    }

    const signoff = await storage.createGateSignoff({
      gate,
      signedOffBy,
      title,
      reason: reason || null,
    });

    clearGateCache();
    return NextResponse.json(signoff);
  } catch (err: any) {
    logger.error({ err: err }, "[PilotMetrics] Signoff error:");
    return NextResponse.json({ error: "Failed to create gate signoff" }, { status: 500 });
  }
}
