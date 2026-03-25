import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    const client = await storage.getClient(clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (auth.session.userType === "advisor" && client.advisorId !== auth.session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    const events = await storage.getSocialEventsByClient(clientId);
    return NextResponse.json(events);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
