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
  _request: Request,
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

    const account = await storage.getAccount(id);
    const [holdingsData, performanceData, transactionsData] = await Promise.all([
      storage.getHoldingsByAccount(id),
      storage.getPerformanceByAccount(id),
      storage.getTransactionsByAccount(id),
    ]);
    const client = await storage.getClient(account!.clientId);

    return NextResponse.json({
      ...account,
      clientName: client ? `${client.firstName} ${client.lastName}` : undefined,
      holdings: holdingsData,
      performance: performanceData,
      recentTransactions: transactionsData.slice(0, 10),
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to get account detail");
    return NextResponse.json({ message: "Failed to get account detail" }, { status: 500 });
  }
}
