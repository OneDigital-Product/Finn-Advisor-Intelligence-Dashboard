import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; scenarioId: string; eventId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id: clientId, scenarioId, eventId } = await params;
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const scenario = await storage.getMonteCarloScenario(scenarioId);
    if (!scenario || scenario.clientId !== clientId) return NextResponse.json({ message: "Scenario not found" }, { status: 404 });
    const events = await storage.getScenarioEvents(scenarioId);
    const eventBelongs = events.some(e => e.id === eventId);
    if (!eventBelongs) return NextResponse.json({ message: "Event not found in this scenario" }, { status: 404 });
    await storage.deleteScenarioEvent(eventId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
