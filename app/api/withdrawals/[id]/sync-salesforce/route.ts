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

const CRM_STATUS_TO_WITHDRAWAL: Record<string, string | null> = {
  "Closed": "completed", "Closed - Cancelled": "cancelled", "Resolved": "completed", "Cancelled": "cancelled",
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

    if (!withdrawal.salesforceCaseId) {
      return NextResponse.json({ message: "No CRM case linked" }, { status: 400 });
    }

    const crm = getActiveCRM();
    const caseStatus = await crm.getWithdrawalCaseStatus(withdrawal.salesforceCaseId);
    if (!caseStatus) return NextResponse.json({ synced: false, message: "CRM not available" });

    const mappedStatus = CRM_STATUS_TO_WITHDRAWAL[caseStatus.status] ?? null;
    const statusChanged = mappedStatus && mappedStatus !== withdrawal.status &&
      (VALID_TRANSITIONS[withdrawal.status] || []).includes(mappedStatus);

    if (statusChanged && mappedStatus) {
      await storage.updateWithdrawalRequest(withdrawal.id, { status: mappedStatus });
      await storage.createWithdrawalAuditEntry({
        withdrawalId: withdrawal.id, action: "crm_status_synced", performedBy: "system",
        details: { crmCaseStatus: caseStatus.status, crmProvider: crm.name, previousStatus: withdrawal.status, newStatus: mappedStatus, lastModified: caseStatus.lastModified },
      });
    }

    return NextResponse.json({
      synced: true, crmCaseStatus: caseStatus.status, crmProvider: crm.name,
      statusChanged: !!statusChanged, newStatus: statusChanged ? mappedStatus : withdrawal.status,
    });
  } catch (err) {
    logger.error({ err }, "Error syncing CRM status");
    return NextResponse.json({ message: "Failed to sync CRM status" }, { status: 500 });
  }
}
