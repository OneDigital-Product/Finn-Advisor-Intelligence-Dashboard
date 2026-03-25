import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { BehavioralFinanceEngine } from "@server/engines/behavioral-finance";
import { logger } from "@server/lib/logger";

const engine = new BehavioralFinanceEngine();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const alert = await engine.checkVolatilityAlerts(id, advisor.id);
    return NextResponse.json(alert);
  } catch (err: any) {
    logger.error({ err: err }, "[Behavioral] Alerts error:");
    return NextResponse.json({ message: "Failed to check alerts" }, { status: 500 });
  }
}
