import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor context" }, { status: 403 });

    const withdrawal = await storage.getWithdrawalRequest(id);
    if (!withdrawal) return NextResponse.json({ message: "Withdrawal not found" }, { status: 404 });
    if (withdrawal.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    const client = await storage.getClient(withdrawal.clientId);
    const accounts = await storage.getAccountsByClient(withdrawal.clientId);
    const account = accounts.find(a => a.id === withdrawal.accountId);
    const auditLog = await storage.getWithdrawalAuditLog(withdrawal.id);

    return NextResponse.json({
      ...withdrawal,
      clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
      accountNumber: account?.accountNumber || "Unknown",
      accountType: account?.accountType || "Unknown",
      auditLog,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching withdrawal");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
