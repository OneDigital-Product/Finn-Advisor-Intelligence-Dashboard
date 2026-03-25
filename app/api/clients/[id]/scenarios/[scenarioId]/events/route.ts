import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; scenarioId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id: clientId, scenarioId } = await params;
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const scenario = await storage.getMonteCarloScenario(scenarioId);
    if (!scenario || scenario.clientId !== clientId) return NextResponse.json({ message: "Scenario not found" }, { status: 404 });

    const { name, type, amount, startAge, endAge, inflationAdjusted } = await request.json();
    if (!name || !type || !amount || !startAge) return NextResponse.json({ message: "Name, type, amount, and start age are required" }, { status: 400 });
    if (!["expense", "income"].includes(type)) return NextResponse.json({ message: "Type must be 'expense' or 'income'" }, { status: 400 });

    const event = await storage.createScenarioEvent({
      scenarioId,
      name,
      type,
      amount: String(amount),
      startAge: parseInt(startAge),
      endAge: endAge ? parseInt(endAge) : null,
      inflationAdjusted: inflationAdjusted !== false,
    });
    return NextResponse.json(event);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
