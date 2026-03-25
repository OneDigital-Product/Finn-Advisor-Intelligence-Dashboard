import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { generateInsightsForClient } from "@server/engines/insights-engine";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const summary = await generateInsightsForClient(id, advisor.id);
    return NextResponse.json(summary);
  } catch (err: any) {
    logger.error({ err }, "[Insights] Client generate error");
    return NextResponse.json({ error: "Failed to generate client insights" }, { status: 500 });
  }
}
