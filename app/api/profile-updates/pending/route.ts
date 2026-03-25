import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    const updates = await storage.getPendingProfileUpdates(advisor.id, status);

    const enriched = await Promise.all(
      updates.map(async (u) => {
        const client = await storage.getClient(u.clientId);
        return {
          ...u,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    logger.error({ err }, "Error fetching pending profile updates");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
