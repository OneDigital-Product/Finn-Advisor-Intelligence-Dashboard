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
    const sort = url.searchParams.get("sort") || undefined;
    const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";

    let holdingsData = await storage.getHoldingsByAccount(id);

    if (sort) {
      holdingsData = [...holdingsData].sort((a, b) => {
        let aVal: any;
        let bVal: any;
        switch (sort) {
          case "marketValue":
            aVal = parseFloat(a.marketValue as string);
            bVal = parseFloat(b.marketValue as string);
            break;
          case "ticker":
            aVal = a.ticker.toLowerCase();
            bVal = b.ticker.toLowerCase();
            break;
          case "weight":
            aVal = parseFloat((a.weight as string) || "0");
            bVal = parseFloat((b.weight as string) || "0");
            break;
          case "gainLoss":
            aVal = parseFloat((a.unrealizedGainLoss as string) || "0");
            bVal = parseFloat((b.unrealizedGainLoss as string) || "0");
            break;
          default:
            return 0;
        }
        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return NextResponse.json({ data: holdingsData, accountId: id });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to get account holdings");
    return NextResponse.json({ message: "Failed to get account holdings" }, { status: 500 });
  }
}
