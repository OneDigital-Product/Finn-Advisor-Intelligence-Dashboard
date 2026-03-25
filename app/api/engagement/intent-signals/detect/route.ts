import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { detectAllIntentSignals } from "@server/engines/intent-signal-engine";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const result = await detectAllIntentSignals(advisor.id);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Detect signals error:");
    return NextResponse.json({ error: "Failed to detect intent signals" }, { status: 500 });
  }
}
