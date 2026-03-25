import type {
  CRMAdapter,
  CRMSyncResult,
  CRMBatchSyncResult,
  CRMInboundSyncResult,
  CRMReconciliationReport,
  WithdrawalCaseRequest,
  WithdrawalCaseResponse,
} from "./crm-adapter";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";

const REDTAIL_CONFIG = {
  baseUrl: process.env.REDTAIL_BASE_URL || "https://smf.crm3.redtailtechnology.com/api/public/v1",
  apiKey: process.env.REDTAIL_API_KEY,
  userKey: process.env.REDTAIL_USER_KEY,
  timeout: 30000,
};

function isRedtailEnabled(): boolean {
  return process.env.REDTAIL_ENABLED === "true" && !!REDTAIL_CONFIG.apiKey;
}

async function redtailFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${REDTAIL_CONFIG.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Userkeyauth ${REDTAIL_CONFIG.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(REDTAIL_CONFIG.userKey ? { "X-User-Key": REDTAIL_CONFIG.userKey } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(REDTAIL_CONFIG.timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Redtail API error ${response.status}: ${errorText}`);
  }

  return response;
}

export class RedtailCRMAdapter implements CRMAdapter {
  readonly name = "redtail";

  isEnabled(): boolean {
    return isRedtailEnabled();
  }

  async validateConnection(): Promise<boolean> {
    if (!isRedtailEnabled()) return false;
    try {
      const response = await redtailFetch("/contacts?count=1");
      return response.ok;
    } catch (err) {
      logger.error({ err }, "[Redtail] Validation failed");
      return false;
    }
  }

  async syncTask(taskId: string): Promise<CRMSyncResult> {
    if (!isRedtailEnabled()) return { success: false, error: "Redtail sync disabled" };

    try {
      const task = await storage.getTask(taskId);
      if (!task) return { success: false, error: "Task not found" };

      const redtailActivity = {
        subject: task.title,
        notes: task.description || "",
        date: task.dueDate || new Date().toISOString(),
        category: 1,
        priority: task.priority === "high" ? 1 : task.priority === "medium" ? 2 : 3,
        status: task.status === "completed" ? 2 : 1,
      };

      if (task.salesforceTaskId?.startsWith("rt-")) {
        const rtId = task.salesforceTaskId.replace("rt-", "");
        await redtailFetch(`/activities/${rtId}`, {
          method: "PUT",
          body: JSON.stringify(redtailActivity),
        });
        await storage.updateTaskSyncStatus(taskId, "synced");
        return { success: true, externalId: task.salesforceTaskId };
      }

      const response = await redtailFetch("/activities", {
        method: "POST",
        body: JSON.stringify(redtailActivity),
      });
      const data = await response.json() as any;
      const rtId = `rt-${data.id || data.activity_id || Date.now()}`;
      await storage.setSalesforceTaskId(taskId, rtId);
      await storage.updateTaskSyncStatus(taskId, "synced");

      return { success: true, externalId: rtId };
    } catch (err: any) {
      logger.error({ err }, "[Redtail] Failed to sync task");
      await storage.updateTaskSyncStatus(taskId, "failed");
      return { success: false, error: err.message };
    }
  }

  async syncMeeting(meetingId: string): Promise<CRMSyncResult> {
    if (!isRedtailEnabled()) return { success: false, error: "Redtail sync disabled" };

    try {
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) return { success: false, error: "Meeting not found" };

      const redtailActivity = {
        subject: meeting.title,
        notes: meeting.notes || "",
        start_date: meeting.startTime,
        end_date: meeting.endTime,
        category: 2,
        location: meeting.location || "Virtual",
      };

      if (meeting.salesforceEventId?.startsWith("rt-")) {
        const rtId = meeting.salesforceEventId.replace("rt-", "");
        await redtailFetch(`/activities/${rtId}`, {
          method: "PUT",
          body: JSON.stringify(redtailActivity),
        });
        await storage.updateMeetingSalesforceSyncStatus(meetingId, "synced");
        return { success: true, externalId: meeting.salesforceEventId };
      }

      const response = await redtailFetch("/activities", {
        method: "POST",
        body: JSON.stringify(redtailActivity),
      });
      const data = await response.json() as any;
      const rtId = `rt-${data.id || data.activity_id || Date.now()}`;
      await storage.setSalesforceMeetingId(meetingId, rtId);
      await storage.updateMeetingSalesforceSyncStatus(meetingId, "synced");

      return { success: true, externalId: rtId };
    } catch (err: any) {
      logger.error({ err }, "[Redtail] Failed to sync meeting");
      await storage.updateMeetingSalesforceSyncStatus(meetingId, "failed");
      return { success: false, error: err.message };
    }
  }

  async syncActivity(activityId: string): Promise<CRMSyncResult> {
    if (!isRedtailEnabled()) return { success: false, error: "Redtail sync disabled" };

    try {
      const activity = await storage.getActivity(activityId);
      if (!activity) return { success: false, error: "Activity not found" };

      const redtailNote = {
        subject: `[${activity.type}] ${activity.subject}`,
        notes: activity.description || "",
        date: activity.date,
        category: 3,
      };

      const response = await redtailFetch("/activities", {
        method: "POST",
        body: JSON.stringify(redtailNote),
      });
      const data = await response.json() as any;
      const rtId = `rt-${data.id || data.activity_id || Date.now()}`;

      return { success: true, externalId: rtId };
    } catch (err: any) {
      logger.error({ err }, "[Redtail] Failed to sync activity");
      return { success: false, error: err.message };
    }
  }

  async batchSync(recordType: "task" | "meeting" | "activity", limit = 50): Promise<CRMBatchSyncResult> {
    const result: CRMBatchSyncResult = { total: 0, succeeded: 0, failed: 0, errors: [] };
    if (!isRedtailEnabled()) return result;

    try {
      if (recordType === "task") {
        const tasks = await storage.getTasksWithSyncStatus("pending");
        result.total = Math.min(tasks.length, limit);
        for (const task of tasks.slice(0, limit)) {
          const syncResult = await this.syncTask(task.id);
          if (syncResult.success) result.succeeded++;
          else {
            result.failed++;
            result.errors.push({ id: task.id, error: syncResult.error || "Unknown" });
          }
        }
      } else if (recordType === "meeting") {
        const meetings = await storage.getMeetingsWithSyncStatus("pending");
        result.total = Math.min(meetings.length, limit);
        for (const meeting of meetings.slice(0, limit)) {
          const syncResult = await this.syncMeeting(meeting.id);
          if (syncResult.success) result.succeeded++;
          else {
            result.failed++;
            result.errors.push({ id: meeting.id, error: syncResult.error || "Unknown" });
          }
        }
      }
    } catch (err: any) {
      logger.error({ err }, "[Redtail] Batch sync error");
    }

    return result;
  }

  async syncContacts(advisorId: string, options?: { limit?: number }): Promise<CRMInboundSyncResult> {
    const limit = options?.limit || 100;
    const results: CRMInboundSyncResult = { synced: 0, updated: 0, errors: [] };
    if (!isRedtailEnabled()) return results;

    try {
      const response = await redtailFetch(`/contacts?count=${limit}`);
      const data = await response.json() as any;
      const contacts = data.contacts || data.data || [];

      for (const contact of contacts) {
        try {
          const rtContactId = `rt-${contact.id}`;
          const existing = await storage.getClientBySalesforceContactId(rtContactId);

          if (existing) {
            await storage.updateClient(existing.id, {
              email: contact.email || existing.email,
              phone: contact.phone || existing.phone,
            });
            results.updated++;
          } else {
            const firstName = contact.first_name || contact.name?.split(" ")[0] || "Unknown";
            const lastName = contact.last_name || contact.name?.split(" ").slice(1).join(" ") || "";

            await storage.createClient({
              advisorId,
              firstName,
              lastName,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              salesforceContactId: rtContactId,
            });
            results.synced++;
          }
        } catch (err: any) {
          results.errors.push({ id: contact.id?.toString() || "unknown", error: err.message });
        }
      }
    } catch (err: any) {
      logger.error({ err }, "[Redtail] Sync contacts error");
      throw err;
    }

    return results;
  }

  async syncAccounts(options?: { limit?: number }): Promise<CRMInboundSyncResult> {
    const results: CRMInboundSyncResult = { synced: 0, updated: 0, errors: [] };
    if (!isRedtailEnabled()) return results;

    try {
      const response = await redtailFetch(`/accounts?count=${options?.limit || 100}`);
      const data = await response.json() as any;
      const accounts = data.accounts || data.data || [];

      for (const account of accounts) {
        try {
          const rtAccountId = `rt-${account.id}`;
          const existing = await storage.getAccountBySalesforceId(rtAccountId);
          if (existing) results.updated++;
          else results.synced++;
        } catch (err: any) {
          results.errors.push({ id: account.id?.toString() || "unknown", error: err.message });
        }
      }
    } catch (err: any) {
      logger.error({ err }, "[Redtail] Sync accounts error");
      throw err;
    }

    return results;
  }

  async reconcile(): Promise<{ tasks: CRMReconciliationReport; meetings: CRMReconciliationReport }> {
    const emptyReport: CRMReconciliationReport = { orphaned: [], conflicts: [], missing: [], lastChecked: new Date() };
    if (!isRedtailEnabled()) return { tasks: emptyReport, meetings: emptyReport };

    const tasksReport: CRMReconciliationReport = { orphaned: [], conflicts: [], missing: [], lastChecked: new Date() };
    const meetingsReport: CRMReconciliationReport = { orphaned: [], conflicts: [], missing: [], lastChecked: new Date() };

    try {
      const localTasks = await storage.getTasksWithSalesforceIds();
      for (const task of localTasks) {
        if (!task.salesforceTaskId?.startsWith("rt-")) continue;
        try {
          const rtId = task.salesforceTaskId.replace("rt-", "");
          const response = await redtailFetch(`/activities/${rtId}`);
          const rtActivity = await response.json() as any;
          if (!rtActivity || !rtActivity.id) {
            tasksReport.orphaned.push(task);
          }
        } catch {
          tasksReport.orphaned.push(task);
        }
      }
    } catch (err) {
      logger.error({ err }, "[Redtail] Reconciliation error");
    }

    return { tasks: tasksReport, meetings: meetingsReport };
  }

  async createWithdrawalCase(request: WithdrawalCaseRequest): Promise<WithdrawalCaseResponse> {
    if (!isRedtailEnabled()) {
      return {
        caseId: `mock-rt-case-${Date.now()}`,
        caseNumber: `RT-WD-${Date.now().toString().slice(-6)}`,
        status: "New",
      };
    }

    try {
      const noteData = {
        subject: `Withdrawal Request - ${request.clientName} - $${request.amount.toLocaleString()}`,
        notes: [
          `Client: ${request.clientName}`,
          `Account: ${request.accountNumber}`,
          `Amount: $${request.amount.toLocaleString()}`,
          `Method: ${request.method}`,
          `Reason: ${request.reason}`,
          `Advisor: ${request.advisorName}`,
        ].join("\n"),
        category: 4,
        priority: request.amount >= 100000 ? 1 : 2,
      };

      const response = await redtailFetch("/activities", {
        method: "POST",
        body: JSON.stringify(noteData),
      });
      const data = await response.json() as any;

      return {
        caseId: `rt-${data.id || Date.now()}`,
        caseNumber: `RT-WD-${(data.id || Date.now()).toString().slice(-6)}`,
        status: "New",
      };
    } catch (err) {
      logger.error({ err }, "[Redtail] Failed to create withdrawal case");
      throw new Error("Failed to create Redtail withdrawal case");
    }
  }

  async updateWithdrawalCaseStatus(caseId: string, status: string, comment?: string): Promise<boolean> {
    if (!isRedtailEnabled()) return true;

    try {
      const rtId = caseId.replace("rt-", "");
      const updateData: Record<string, unknown> = { status_id: status === "Closed" ? 2 : 1 };
      if (comment) updateData.notes = comment;

      await redtailFetch(`/activities/${rtId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      return true;
    } catch (err) {
      logger.error({ err }, "[Redtail] Failed to update case status");
      return false;
    }
  }

  async getWithdrawalCaseStatus(caseId: string): Promise<{ status: string; lastModified: string } | null> {
    if (!isRedtailEnabled()) return null;

    try {
      const rtId = caseId.replace("rt-", "");
      const response = await redtailFetch(`/activities/${rtId}`);
      const data = await response.json() as any;
      return {
        status: data.status_name || "Open",
        lastModified: data.updated_at || new Date().toISOString(),
      };
    } catch (err) {
      logger.error({ err }, "[Redtail] Failed to get case status");
      return null;
    }
  }
}
