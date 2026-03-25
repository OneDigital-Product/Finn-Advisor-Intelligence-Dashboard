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

    if (!withdrawal.eclipseFileGenerated) {
      return NextResponse.json({ message: "Eclipse file must be generated before confirming trade." }, { status: 409 });
    }
    if (!(VALID_TRANSITIONS[withdrawal.status] || []).includes("completed")) {
      return NextResponse.json({ message: `Cannot confirm trade from status '${withdrawal.status}'.` }, { status: 409 });
    }

    const now = new Date();
    let nwrRemoved = false;

    if (withdrawal.orionNwrTagId && !withdrawal.nwrRemovedAt) {
      const account = (await storage.getAccountsByClient(withdrawal.clientId)).find(a => a.id === withdrawal.accountId);
      try {
        const portfolio = getActivePortfolio();
        await portfolio.removeNwrTag(account?.orionAccountId || withdrawal.accountId, withdrawal.orionNwrTagId);
        nwrRemoved = true;
      } catch (err) {
        logger.warn({ err }, "Failed to remove NWR tag during trade confirmation");
      }
    }

    if (withdrawal.salesforceCaseId) {
      try {
        const crm = getActiveCRM();
        await crm.updateWithdrawalCaseStatus(withdrawal.salesforceCaseId, "Closed", "Trade confirmed and completed");
      } catch (err) {
        logger.warn({ err }, "Failed to update CRM case during trade confirmation");
      }
    }

    const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
      status: "completed", tradeConfirmedAt: now,
      nwrRemovedAt: nwrRemoved ? now : undefined, completedAt: now,
    });

    await storage.createWithdrawalAuditEntry({
      withdrawalId: withdrawal.id, action: "trade_confirmed", performedBy: advisor.id,
      details: { nwrRemoved, confirmedAt: now.toISOString() },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, "Error confirming trade");
    return NextResponse.json({ message: "Failed to confirm trade" }, { status: 500 });
  }
}
