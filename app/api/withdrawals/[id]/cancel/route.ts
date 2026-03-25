import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { getActivePortfolio, getActiveCRM } from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["nwr_applied", "sf_case_created", "eclipse_generated", "cancelled"],
  nwr_applied: ["sf_case_created", "eclipse_generated", "completed", "cancelled"],
  sf_case_created: ["eclipse_generated", "completed", "cancelled"],
  eclipse_generated: ["completed", "cancelled"],
  completed: [], cancelled: [],
};

export async function POST(
  request: Request,
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

    if (!(VALID_TRANSITIONS[withdrawal.status] || []).includes("cancelled")) {
      return NextResponse.json({ message: `Cannot cancel from status '${withdrawal.status}'` }, { status: 409 });
    }

    let nwrRemoved = false;
    if (withdrawal.orionNwrTagId && !withdrawal.nwrRemovedAt) {
      const account = (await storage.getAccountsByClient(withdrawal.clientId)).find(a => a.id === withdrawal.accountId);
      try {
        const portfolio = getActivePortfolio();
        await portfolio.removeNwrTag(account?.orionAccountId || withdrawal.accountId, withdrawal.orionNwrTagId);
        nwrRemoved = true;
      } catch (err) {
        logger.warn({ err }, "Failed to remove NWR tag during cancellation");
      }
    }

    if (withdrawal.salesforceCaseId) {
      try {
        const crm = getActiveCRM();
        await crm.updateWithdrawalCaseStatus(withdrawal.salesforceCaseId, "Closed - Cancelled", "Withdrawal cancelled by advisor");
      } catch (err) {
        logger.warn({ err }, "Failed to update CRM case during cancellation");
      }
    }

    const body = await request.json().catch(() => ({}));
    const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
      status: "cancelled", nwrRemovedAt: nwrRemoved ? new Date() : undefined,
    });

    await storage.createWithdrawalAuditEntry({
      withdrawalId: withdrawal.id, action: "withdrawal_cancelled", performedBy: advisor.id,
      details: { reason: body?.notes || "Cancelled by advisor" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, "Error cancelling withdrawal");
    return NextResponse.json({ message: "Failed to cancel withdrawal" }, { status: 500 });
  }
}
