import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const result = await storage.getInsightOpportunities(advisor.id);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "[Insights] Opportunities error");
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}
