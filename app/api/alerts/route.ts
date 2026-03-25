import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const url = new URL(request.url);
    const severity = url.searchParams.get("severity") || undefined;
    const alertType = url.searchParams.get("type") || undefined;
    const clientId = url.searchParams.get("clientId") || undefined;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    const allAlerts = await storage.getFilteredAlerts(advisor.id, {
      severity,
      alertType,
      clientId,
      limit: limitParam ? parseInt(limitParam) : undefined,
      offset: offsetParam ? parseInt(offsetParam) : undefined,
    });

    // Batch fetch all clients once (avoids N+1: was 1 query per alert)
    const allClients = await storage.getClients(advisor.id);
    const clientMap = new Map(allClients.map(c => [c.id, c]));

    const alertsWithClients = allAlerts.map((alert) => {
      if (!alert.clientId) return { ...alert, clientName: null };
      const client = clientMap.get(alert.clientId);
      return { ...alert, clientName: client ? `${client.firstName} ${client.lastName}` : null };
    });

    return NextResponse.json(alertsWithClients, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    });
  } catch (err) {
    logger.error({ err: err }, "[Tasks] alerts fetch failed");
    return NextResponse.json({ message: "Failed to load alerts" }, { status: 500 });
  }
}
