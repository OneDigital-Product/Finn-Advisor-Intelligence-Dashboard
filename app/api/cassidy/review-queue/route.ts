import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/routes/cassidy/shared";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    return NextResponse.json({
      pendingFacts: [],
      pendingProfiles: [],
      pendingReports: [],
      pendingSignals: [],
      totalCount: 0,
    });
  } catch (err) {
    logger.error({ err }, "Get review queue error");
    return NextResponse.json({ error: "Failed to get review queue" }, { status: 500 });
  }
}
