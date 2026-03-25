import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ lifeEventId: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisorId = auth.session.userId!;
    const { lifeEventId } = await params;

    const lifeEvent = await storage.getLifeEvent(lifeEventId);
    if (!lifeEvent) {
      return NextResponse.json({ error: "Life event not found" }, { status: 404 });
    }

    const client = await storage.getClient(lifeEvent.clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (client.advisorId !== advisorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const actions = await storage.getTriggerActionsForEvent(lifeEventId);
    return NextResponse.json(actions);
  } catch (err: any) {
    logger.error({ err: err }, "[Triggers] GET actions error:");
    return NextResponse.json({ error: "Failed to fetch trigger actions" }, { status: 500 });
  }
}
