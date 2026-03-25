export type CRMSyncResult = {
  success: boolean;
  externalId?: string;
  error?: string;
};

export type CRMBatchSyncResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
};

export type CRMInboundSyncResult = {
  synced: number;
  updated: number;
  errors: Array<{ id: string; error: string }>;
};

export type CRMReconciliationReport = {
  orphaned: Array<any>;
  conflicts: Array<{ local: any; remote: any }>;
  missing: Array<any>;
  lastChecked: Date;
};

export interface WithdrawalCaseRequest {
  clientName: string;
  accountNumber: string;
  amount: number;
  method: string;
  reason: string;
  advisorName: string;
  contactId?: string;
}

export interface WithdrawalCaseResponse {
  caseId: string;
  caseNumber: string;
  status: string;
}

export interface CRMAdapter {
  readonly name: string;

  isEnabled(): boolean;
  validateConnection(): Promise<boolean>;

  syncTask(taskId: string): Promise<CRMSyncResult>;
  syncMeeting(meetingId: string): Promise<CRMSyncResult>;
  syncActivity(activityId: string): Promise<CRMSyncResult>;
  batchSync(recordType: "task" | "meeting" | "activity", limit?: number): Promise<CRMBatchSyncResult>;

  syncContacts(advisorId: string, options?: { limit?: number }): Promise<CRMInboundSyncResult>;
  syncAccounts(options?: { limit?: number }): Promise<CRMInboundSyncResult>;

  reconcile(): Promise<{ tasks: CRMReconciliationReport; meetings: CRMReconciliationReport }>;

  createWithdrawalCase(request: WithdrawalCaseRequest): Promise<WithdrawalCaseResponse>;
  updateWithdrawalCaseStatus(caseId: string, status: string, comment?: string): Promise<boolean>;
  getWithdrawalCaseStatus(caseId: string): Promise<{ status: string; lastModified: string } | null>;
}
