import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const signals = await storage.getActiveIntentSignals(advisor.id);
    const signal = signals.find(s => s.id === id);
    if (!signal) return NextResponse.json({ error: "Signal not found or not authorized" }, { status: 404 });
    await storage.deactivateIntentSignal(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Deactivate signal error:");
    return NextResponse.json({ error: "Failed to deactivate signal" }, { status: 500 });
  }
}
