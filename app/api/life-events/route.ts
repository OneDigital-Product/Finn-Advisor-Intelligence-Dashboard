import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { executeTriggers } from "@server/engines/trigger-engine";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisorId = auth.session.userId!;

    const body = await request.json();
    const { clientId, eventType, eventDate, description, triggerCategoryId } = body;

    if (!clientId || !eventType || !eventDate || !description) {
      return NextResponse.json({ error: "clientId, eventType, eventDate, and description are required" }, { status: 400 });
    }

    const client = await storage.getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (client.advisorId !== advisorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const lifeEvent = await storage.createLifeEvent({
      clientId,
      eventType,
      eventDate,
      description,
      triggerCategoryId: triggerCategoryId || null,
    });

    const triggerResults = await executeTriggers(storage, lifeEvent.id, {
      clientId,
      eventType,
      description,
      triggerCategoryId,
    });

    const downstreamActions = triggerResults;

    if (triggerResults.length > 0) {
      await storage.updateLifeEvent(lifeEvent.id, {
        downstreamActions,
      });
    }

    return NextResponse.json({ ...lifeEvent, downstreamActions }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "[LifeEvents] POST error:");
    return NextResponse.json({ error: "Failed to create life event" }, { status: 500 });
  }
}
