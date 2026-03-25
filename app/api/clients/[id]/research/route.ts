import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { getClientRelevantResearch } from "@server/engines/research-engine";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const clientId = id;
    const client = await storage.getClient(clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const articles = await getClientRelevantResearch(clientId);
    return NextResponse.json(articles);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch client-relevant research");
    return NextResponse.json({ message: "Failed to fetch client research" }, { status: 500 });
  }
}
