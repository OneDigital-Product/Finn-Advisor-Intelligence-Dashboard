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

async function verifyAccountOwnership(advisorId: string, accountId: string): Promise<boolean> {
  const account = await storage.getAccount(accountId);
  if (!account) return false;
  const client = await storage.getClient(account.clientId);
  return !!client && client.advisorId === advisorId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = await getAdvisorIdFromSession(auth.session);
    if (!advisorId) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const { id } = await params;
    if (!(await verifyAccountOwnership(advisorId, id))) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25")));
    const type = url.searchParams.get("type") || undefined;
    const ticker = url.searchParams.get("ticker") || undefined;
    const dateFrom = url.searchParams.get("dateFrom") || undefined;
    const dateTo = url.searchParams.get("dateTo") || undefined;

    let transactionsData = await storage.getTransactionsByAccount(id);
    if (type) transactionsData = transactionsData.filter(t => t.type === type);
    if (ticker) transactionsData = transactionsData.filter(t => t.ticker?.toLowerCase() === ticker.toLowerCase());
    if (dateFrom) transactionsData = transactionsData.filter(t => t.date >= dateFrom);
    if (dateTo) transactionsData = transactionsData.filter(t => t.date <= dateTo);

    const total = transactionsData.length;
    const offset = (page - 1) * limit;
    const data = transactionsData.slice(offset, offset + limit);

    return NextResponse.json({ data, total, page, limit });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to get account transactions");
    return NextResponse.json({ message: "Failed to get account transactions" }, { status: 500 });
  }
}
