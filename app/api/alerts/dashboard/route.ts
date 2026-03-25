import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const summary = await storage.getAlertDashboardSummary(advisor.id);
    return NextResponse.json(summary);
  } catch (err: any) {
    logger.error({ err }, "API error");
    return NextResponse.json({ error: "Failed to get dashboard summary" }, { status: 500 });
  }
}
