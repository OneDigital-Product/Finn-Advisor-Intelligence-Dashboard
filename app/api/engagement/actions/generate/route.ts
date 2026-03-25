import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { computeAllEngagementScores } from "@server/engines/engagement-scoring";
import { detectAllIntentSignals } from "@server/engines/intent-signal-engine";
import { generateNextBestActions } from "@server/engines/next-best-action-engine";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    await computeAllEngagementScores(advisor.id);
    await detectAllIntentSignals(advisor.id);
    const result = await generateNextBestActions(advisor.id);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Generate actions error:");
    return NextResponse.json({ error: "Failed to generate next-best-actions" }, { status: 500 });
  }
}
