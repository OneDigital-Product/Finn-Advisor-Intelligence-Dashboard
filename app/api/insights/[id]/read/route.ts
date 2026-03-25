import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const insight = await storage.getInsightById(id);
    if (!insight) return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    if (insight.advisorId !== advisor.id)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    await storage.markInsightRead(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "[Insights] Mark read error");
    return NextResponse.json({ error: "Failed to mark insight as read" }, { status: 500 });
  }
}
