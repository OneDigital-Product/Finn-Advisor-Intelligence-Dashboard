import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get("limit") || "50"), 200);
    const events = await storage.getEngagementEventsByClient(id, limit);
    return NextResponse.json({ events });
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Client events error:");
    return NextResponse.json({ error: "Failed to fetch client engagement events" }, { status: 500 });
  }
}
