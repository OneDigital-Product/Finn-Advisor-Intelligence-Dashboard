import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { getActiveCRM } from "@server/integrations/adapters";
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

    if (!(VALID_TRANSITIONS[withdrawal.status] || []).includes("sf_case_created")) {
      return NextResponse.json({ message: `Cannot create SF case from status '${withdrawal.status}'` }, { status: 409 });
    }
    if (withdrawal.salesforceCaseId) {
      return NextResponse.json({ message: "Salesforce case already created" }, { status: 409 });
    }

    const client = await storage.getClient(withdrawal.clientId);
    const account = (await storage.getAccountsByClient(withdrawal.clientId)).find(a => a.id === withdrawal.accountId);

    const crm = getActiveCRM();
    const caseResult = await crm.createWithdrawalCase({
      clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
      accountNumber: account?.accountNumber || "Unknown",
      amount: parseFloat(withdrawal.amount), method: withdrawal.method,
      reason: withdrawal.reason, advisorName: advisor.name,
      contactId: client?.salesforceContactId || undefined,
    });

    const newStatus = (VALID_TRANSITIONS[withdrawal.status] || []).includes("sf_case_created") ? "sf_case_created" : withdrawal.status;
    const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
      salesforceCaseId: caseResult.caseId, salesforceCaseNumber: caseResult.caseNumber, status: newStatus,
    });

    await storage.createWithdrawalAuditEntry({
      withdrawalId: withdrawal.id, action: "salesforce_case_created", performedBy: advisor.id,
      details: { caseId: caseResult.caseId, caseNumber: caseResult.caseNumber },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, "Error creating Salesforce case");
    return NextResponse.json({ message: "Failed to create Salesforce case" }, { status: 500 });
  }
}
