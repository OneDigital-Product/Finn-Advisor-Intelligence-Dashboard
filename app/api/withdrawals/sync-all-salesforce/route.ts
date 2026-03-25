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

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor context" }, { status: 403 });

    const withdrawals = await storage.getWithdrawalRequests(advisor.id);
    const activeWithCase = withdrawals.filter(w => w.salesforceCaseId && !["completed", "cancelled"].includes(w.status));

    const crm = getActiveCRM();
    let syncedCount = 0;
    let changedCount = 0;

    for (const withdrawal of activeWithCase) {
      const caseStatus = await crm.getWithdrawalCaseStatus(withdrawal.salesforceCaseId!);
      if (!caseStatus) continue;
      syncedCount++;

      const mappedStatus = CRM_STATUS_TO_WITHDRAWAL[caseStatus.status] ?? null;
      if (mappedStatus && mappedStatus !== withdrawal.status && (VALID_TRANSITIONS[withdrawal.status] || []).includes(mappedStatus)) {
        await storage.updateWithdrawalRequest(withdrawal.id, { status: mappedStatus });
        await storage.createWithdrawalAuditEntry({
          withdrawalId: withdrawal.id, action: "crm_status_synced", performedBy: "system",
          details: { crmCaseStatus: caseStatus.status, crmProvider: crm.name, previousStatus: withdrawal.status, newStatus: mappedStatus },
        });
        changedCount++;
      }
    }

    logger.info({ syncedCount, changedCount, provider: crm.name }, "CRM withdrawal sync complete");
    return NextResponse.json({ syncedCount, changedCount, totalActive: activeWithCase.length, provider: crm.name });
  } catch (err) {
    logger.error({ err }, "Error syncing all CRM withdrawals");
    return NextResponse.json({ message: "Failed to sync CRM withdrawals" }, { status: 500 });
  }
}
