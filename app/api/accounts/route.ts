import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

async function getAdvisorIdFromSession(session: any): Promise<string | null> {
  if (session.userType === "advisor") return session.userId;
  const assignedClients = await storage.getClientsByAssociate(session.userId!);
  if (assignedClients.length > 0) return assignedClients[0].advisorId;
  return null;
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = await getAdvisorIdFromSession(auth.session);
    if (!advisorId) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25")));
    const clientId = url.searchParams.get("clientId") || undefined;

    const clients = await storage.getClients(advisorId);
    const clientIds = clientId
      ? clients.filter(c => c.id === clientId).map(c => c.id)
      : clients.map(c => c.id);

    if (clientId && clientIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    const allAccounts: any[] = [];
    for (const cId of clientIds) {
      const accts = await storage.getAccountsByClient(cId);
      const client = clients.find(c => c.id === cId);
      for (const acct of accts) {
        allAccounts.push({ ...acct, clientName: client ? `${client.firstName} ${client.lastName}` : undefined });
      }
    }

    const total = allAccounts.length;
    const offset = (page - 1) * limit;
    const data = allAccounts.slice(offset, offset + limit);

    return NextResponse.json({ data, total, page, limit });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to list accounts");
    return NextResponse.json({ message: "Failed to list accounts" }, { status: 500 });
  }
}
