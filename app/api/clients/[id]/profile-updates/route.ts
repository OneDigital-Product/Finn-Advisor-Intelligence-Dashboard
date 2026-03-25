import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const clientId = id;
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const updates = await storage.getPendingProfileUpdatesByClient(clientId);
    return NextResponse.json(updates);
  } catch (err) {
    logger.error({ err }, "Error fetching client profile updates");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
