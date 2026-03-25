import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const screeningResults = await storage.getAmlScreeningResultsByAdvisor(advisor.id);
    const clients = await storage.getClients(advisor.id);
    const clientMap = new Map(clients.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

    const pending = screeningResults.filter(s => s.matchStatus === "potential_match" && !s.resolvedAt);
    const autoResolved = screeningResults.filter(s => s.resolution === "auto_resolved");
    const manuallyResolved = screeningResults.filter(s => s.resolvedAt && s.resolution !== "auto_resolved");
    const confirmed = screeningResults.filter(s => s.matchStatus === "confirmed_match");
    const clear = screeningResults.filter(s => s.matchStatus === "clear");

    const screenedClientIds = new Set(screeningResults.map(s => s.clientId));
    const unscreened = clients.filter(c => !screenedClientIds.has(c.id));

    return NextResponse.json({
      pending: pending.map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
      autoResolved: autoResolved.slice(0, 20).map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
      manuallyResolved: manuallyResolved.slice(0, 20).map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
      confirmed: confirmed.map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
      clear: clear.slice(0, 20).map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
      unscreened: unscreened.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
      stats: {
        total: screeningResults.length,
        pending: pending.length,
        autoResolved: autoResolved.length,
        manuallyResolved: manuallyResolved.length,
        confirmed: confirmed.length,
        clear: clear.length,
        unscreened: unscreened.length,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Screening pipeline error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
