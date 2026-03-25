import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
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

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || undefined;
    const severity = url.searchParams.get("severity") || undefined;
    const insights = await storage.getInsightsByClient(id, { type, severity });
    return NextResponse.json({ insights });
  } catch (err: any) {
    logger.error({ err }, "[Insights] Client insights error");
    return NextResponse.json({ error: "Failed to fetch client insights" }, { status: 500 });
  }
}
