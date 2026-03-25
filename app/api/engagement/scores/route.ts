import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const scores = await storage.getEngagementScoresByAdvisor(advisor.id);
    return NextResponse.json({ scores });
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Get scores error:");
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
