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

    const auditLog = await storage.getWithdrawalAuditLog(id);
    return NextResponse.json(auditLog);
  } catch (err) {
    logger.error({ err }, "Error fetching withdrawal audit log");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
