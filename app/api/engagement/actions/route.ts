import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const status = new URL(request.url).searchParams.get("status") || "pending";
    const actions = await storage.getNextBestActions(advisor.id, status);
    return NextResponse.json({ actions }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } });
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Get actions error:");
    return NextResponse.json({ error: "Failed to fetch actions" }, { status: 500 });
  }
}
