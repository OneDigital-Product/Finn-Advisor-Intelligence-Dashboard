import type {
  CRMAdapter,
  CRMSyncResult,
  CRMBatchSyncResult,
  CRMInboundSyncResult,
  CRMReconciliationReport,
  WithdrawalCaseRequest,
  WithdrawalCaseResponse,
} from "./crm-adapter";
import { syncTask, syncMeeting, syncActivity, batchSync } from "../salesforce/sync";
import { syncContacts, syncAccounts } from "../salesforce/inbound";
import { generateFullReport } from "../salesforce/reconciliation";
import {
  createWithdrawalCase as sfCreateWithdrawalCase,
  updateWithdrawalCaseStatus as sfUpdateWithdrawalCaseStatus,
  getWithdrawalCaseStatus as sfGetWithdrawalCaseStatus,
} from "../salesforce/withdrawal-case";
import { isSalesforceEnabled, validateConnection } from "../salesforce/client";

export class SalesforceCRMAdapter implements CRMAdapter {
  readonly name = "salesforce";

  isEnabled(): boolean {
    return isSalesforceEnabled();
  }

  async validateConnection(): Promise<boolean> {
    return validateConnection();
  }

  async syncTask(taskId: string): Promise<CRMSyncResult> {
    const result = await syncTask(taskId);
    return { success: result.success, externalId: result.salesforceId, error: result.error };
  }

  async syncMeeting(meetingId: string): Promise<CRMSyncResult> {
    const result = await syncMeeting(meetingId);
    return { success: result.success, externalId: result.salesforceId, error: result.error };
  }

  async syncActivity(activityId: string): Promise<CRMSyncResult> {
    const result = await syncActivity(activityId);
    return { success: result.success, externalId: result.salesforceId, error: result.error };
  }

  async batchSync(recordType: "task" | "meeting" | "activity", limit?: number): Promise<CRMBatchSyncResult> {
    return batchSync(recordType, limit);
  }

  async syncContacts(advisorId: string, options?: { limit?: number }): Promise<CRMInboundSyncResult> {
    return syncContacts(advisorId, options);
  }

  async syncAccounts(options?: { limit?: number }): Promise<CRMInboundSyncResult> {
    return syncAccounts(options);
  }

  async reconcile(): Promise<{ tasks: CRMReconciliationReport; meetings: CRMReconciliationReport }> {
    const report = await generateFullReport();
    return {
      tasks: { ...report.tasks, conflicts: report.tasks.conflicts.map(c => ({ local: c.local, remote: c.salesforce })) },
      meetings: { ...report.meetings, conflicts: report.meetings.conflicts.map(c => ({ local: c.local, remote: c.salesforce })) },
    };
  }

  async createWithdrawalCase(request: WithdrawalCaseRequest): Promise<WithdrawalCaseResponse> {
    return sfCreateWithdrawalCase(request);
  }

  async updateWithdrawalCaseStatus(caseId: string, status: string, comment?: string): Promise<boolean> {
    return sfUpdateWithdrawalCaseStatus(caseId, status, comment);
  }

  async getWithdrawalCaseStatus(caseId: string): Promise<{ status: string; lastModified: string } | null> {
    return sfGetWithdrawalCaseStatus(caseId);
  }
}
