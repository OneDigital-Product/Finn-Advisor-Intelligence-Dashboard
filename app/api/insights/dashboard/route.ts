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

    const dashboard = await storage.getInsightsDashboard(advisor.id);
    return NextResponse.json(dashboard, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } });
  } catch (err: any) {
    logger.error({ err }, "[Insights] Dashboard error");
    return NextResponse.json({ error: "Failed to fetch insights dashboard" }, { status: 500 });
  }
}
