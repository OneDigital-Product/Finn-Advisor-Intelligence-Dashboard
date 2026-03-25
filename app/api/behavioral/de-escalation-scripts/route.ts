import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { BehavioralFinanceEngine } from "@server/engines/behavioral-finance";
import { logger } from "@server/lib/logger";

const engine = new BehavioralFinanceEngine();

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const bias = url.searchParams.get("bias") || undefined;
    const tag = url.searchParams.get("tag") || undefined;

    const scripts = engine.getDeEscalationScripts(bias, tag);
    const biases = engine.getAvailableBiases();

    return NextResponse.json({ scripts, biases });
  } catch (err: any) {
    logger.error({ err: err }, "[Behavioral] De-escalation scripts error:");
    return NextResponse.json({ message: "Failed to get scripts" }, { status: 500 });
  }
}
