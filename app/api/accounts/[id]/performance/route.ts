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
    const period = url.searchParams.get("period") || undefined;
    let performanceData = await storage.getPerformanceByAccount(id);

    if (period) {
      const periods = period.split(",");
      performanceData = performanceData.filter(p => periods.includes(p.period));
    }

    return NextResponse.json({ data: performanceData, accountId: id });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to get account performance");
    return NextResponse.json({ message: "Failed to get account performance" }, { status: 500 });
  }
}
