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

    const log = await storage.getKycAuditLogByAdvisor(advisor.id);
    const clients = await storage.getClients(advisor.id);
    const clientMap = new Map(clients.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

    return NextResponse.json(log.map(entry => ({
      ...entry,
      clientName: clientMap.get(entry.clientId) || "Unknown",
    })));
  } catch (error: any) {
    logger.error({ err: error }, "Audit log error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
