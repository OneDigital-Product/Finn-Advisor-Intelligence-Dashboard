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
    const pending = await storage.getNextBestActions(advisor.id);
    const existing = pending.find(a => a.id === id);
    if (!existing) return NextResponse.json({ error: "Action not found or not authorized" }, { status: 404 });
    const action = await storage.dismissNextBestAction(id);
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
    return NextResponse.json(action);
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Dismiss action error:");
    return NextResponse.json({ error: "Failed to dismiss action" }, { status: 500 });
  }
}
