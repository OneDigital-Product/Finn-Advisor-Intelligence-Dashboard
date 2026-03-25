import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { computeAllEngagementScores } from "@server/engines/engagement-scoring";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const result = await computeAllEngagementScores(advisor.id);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Compute scores error:");
    return NextResponse.json({ error: "Failed to compute engagement scores" }, { status: 500 });
  }
}
