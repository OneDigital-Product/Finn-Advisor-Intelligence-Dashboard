import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { generateInsightsForAdvisor, pruneExpiredInsights } from "@server/engines/insights-engine";
import { logger } from "@server/lib/logger";

export async function POST() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    await pruneExpiredInsights();
    const summary = await generateInsightsForAdvisor(advisor.id);
    return NextResponse.json(summary);
  } catch (err: any) {
    logger.error({ err }, "[Insights] Generate error");
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
