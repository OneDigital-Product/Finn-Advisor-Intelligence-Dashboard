import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { getActivePortfolio } from "@server/integrations/adapters";
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

    if (!(VALID_TRANSITIONS[withdrawal.status] || []).includes("nwr_applied")) {
      return NextResponse.json({ message: `Cannot create set-aside from status '${withdrawal.status}'` }, { status: 409 });
    }
    if (withdrawal.orionSetAsideId) {
      return NextResponse.json({ message: "Set-aside already created" }, { status: 409 });
    }

    const account = (await storage.getAccountsByClient(withdrawal.clientId)).find(a => a.id === withdrawal.accountId);
    const portfolio = getActivePortfolio();
    const setAsideResult = await portfolio.createSetAside({
      accountId: account?.orionAccountId || withdrawal.accountId,
      amount: parseFloat(withdrawal.amount), reason: withdrawal.reason, frequency: withdrawal.frequency,
    });
    const nwrResult = await portfolio.applyNwrTag(account?.orionAccountId || withdrawal.accountId);

    const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
      orionSetAsideId: setAsideResult.setAsideId, orionNwrTagId: nwrResult.tagId, status: "nwr_applied",
    });

    await storage.createWithdrawalAuditEntry({
      withdrawalId: withdrawal.id, action: "orion_set_aside_created", performedBy: advisor.id,
      details: { setAsideId: setAsideResult.setAsideId, nwrTagId: nwrResult.tagId },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, "Error creating set-aside");
    return NextResponse.json({ message: "Failed to create Orion set-aside" }, { status: 500 });
  }
}
