import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50") || 50, 200);
    const offset = parseInt(url.searchParams.get("offset") || "0") || 0;
    const dismissed = url.searchParams.get("dismissed") === "true";

    const insights = await storage.getInsightsByAdvisor(advisor.id, {
      limit,
      offset,
      dismissed,
    });
    return NextResponse.json({ insights, limit, offset });
  } catch (err: any) {
    logger.error({ err }, "[Insights] Book-wide error");
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
