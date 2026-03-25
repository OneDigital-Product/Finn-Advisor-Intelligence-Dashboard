import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const stats = await storage.getPilotFeedbackStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    logger.error({ err: err }, "[Feedback] Stats error:");
    return NextResponse.json({ message: "Failed to fetch feedback stats" }, { status: 500 });
  }
}
