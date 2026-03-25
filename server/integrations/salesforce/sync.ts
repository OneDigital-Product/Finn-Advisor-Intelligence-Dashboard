import { getClient, isSalesforceEnabled } from "./client";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";
import { salesforceRateLimiter } from "./rate-limiter";
import { withSyncLock } from "./sync-lock";
import { isValidSalesforceId, assertValidSalesforceId } from "./validate-salesforce-id";

export type SyncResult = {
  success: boolean;
  salesforceId?: string;
  error?: string;
};

export type BatchSyncResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
};

function mapPriority(localPriority: string): string {
  const map: Record<string, string> = { high: "High", medium: "Normal", low: "Low" };
  return map[localPriority] || "Normal";
}

function mapStatus(localStatus: string): string {
  const map: Record<string, string> = {
    pending: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  };
  return map[localStatus] || "Not Started";
}

export async function syncTask(taskId: string): Promise<SyncResult> {
  if (!isSalesforceEnabled() || process.env.SALESFORCE_SYNC_ENABLED !== "true") {
    return { success: false, error: "Salesforce sync disabled" };
  }

  const prelimTask = await storage.getTask(taskId);
  if (!prelimTask) return { success: false, error: "Task not found" };

  return withSyncLock(prelimTask.advisorId, "task", async () => {
    try {
      const task = await storage.getTask(taskId);
      if (!task) return { success: false, error: "Task not found" };

      const conn = await getClient();
      if (!conn) return { success: false, error: "No Salesforce connection" };

      const sfTaskData = {
        Subject: task.title,
        Description: task.description || "",
        ActivityDate: task.dueDate || undefined,
        Priority: mapPriority(task.priority),
        Status: mapStatus(task.status),
      };

      let sfTaskId: string;

      if (task.salesforceTaskId) {
        assertValidSalesforceId(task.salesforceTaskId, "syncTask");
        await salesforceRateLimiter.waitForAvailability();
        await conn.sobject("Task").update({ Id: task.salesforceTaskId, ...sfTaskData });
        sfTaskId = task.salesforceTaskId;
      } else {
        await salesforceRateLimiter.waitForAvailability();
        const result = await conn.sobject("Task").create(sfTaskData);
        sfTaskId = (result as any).id;
        assertValidSalesforceId(sfTaskId, "syncTask (new ID from Salesforce)");
        await storage.setSalesforceTaskId(taskId, sfTaskId);
      }

      await storage.updateTaskSyncStatus(taskId, "synced");

      await storage.createSalesforceSyncLog({
        recordType: "Task",
        recordId: taskId,
        salesforceId: sfTaskId,
        action: task.salesforceTaskId ? "update" : "create",
        status: "success",
      });

      return { success: true, salesforceId: sfTaskId };
    } catch (err: any) {
      logger.error({ err }, "API error");
      await storage.updateTaskSyncStatus(taskId, "failed");
      await storage.createSalesforceSyncLog({
        recordType: "Task",
        recordId: taskId,
        action: "sync",
        status: "failed",
        errorMessage: err.message,
      });
      return { success: false, error: err.message };
    }
  });
}

export async function syncMeeting(meetingId: string): Promise<SyncResult> {
  if (!isSalesforceEnabled() || process.env.SALESFORCE_SYNC_ENABLED !== "true") {
    return { success: false, error: "Salesforce sync disabled" };
  }

  const prelimMeeting = await storage.getMeeting(meetingId);
  if (!prelimMeeting) return { success: false, error: "Meeting not found" };

  return withSyncLock(prelimMeeting.advisorId, "meeting", async () => {
    try {
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) return { success: false, error: "Meeting not found" };

      const conn = await getClient();
      if (!conn) return { success: false, error: "No Salesforce connection" };

      const sfEventData = {
        Subject: meeting.title,
        StartDateTime: meeting.startTime,
        EndDateTime: meeting.endTime,
        Location: meeting.location || "Virtual",
        Description: meeting.notes || "",
        Type: "Other",
      };

      let sfEventId: string;

      if (meeting.salesforceEventId) {
        assertValidSalesforceId(meeting.salesforceEventId, "syncMeeting");
        await salesforceRateLimiter.waitForAvailability();
        await conn.sobject("Event").update({ Id: meeting.salesforceEventId, ...sfEventData });
        sfEventId = meeting.salesforceEventId;
      } else {
        await salesforceRateLimiter.waitForAvailability();
        const result = await conn.sobject("Event").create(sfEventData);
        sfEventId = (result as any).id;
        assertValidSalesforceId(sfEventId, "syncMeeting (new ID from Salesforce)");
        await storage.setSalesforceMeetingId(meetingId, sfEventId);
      }

      await storage.updateMeetingSalesforceSyncStatus(meetingId, "synced");

      await storage.createSalesforceSyncLog({
        recordType: "Event",
        recordId: meetingId,
        salesforceId: sfEventId,
        action: meeting.salesforceEventId ? "update" : "create",
        status: "success",
      });

      return { success: true, salesforceId: sfEventId };
    } catch (err: any) {
      logger.error({ err }, "API error");
      await storage.updateMeetingSalesforceSyncStatus(meetingId, "failed");
      await storage.createSalesforceSyncLog({
        recordType: "Event",
        recordId: meetingId,
        action: "sync",
        status: "failed",
        errorMessage: err.message,
      });
      return { success: false, error: err.message };
    }
  });
}

export async function syncActivity(activityId: string): Promise<SyncResult> {
  if (!isSalesforceEnabled() || process.env.SALESFORCE_SYNC_ENABLED !== "true") {
    return { success: false, error: "Salesforce sync disabled" };
  }

  try {
    const activity = await storage.getActivity(activityId);
    if (!activity) return { success: false, error: "Activity not found" };

    const conn = await getClient();
    if (!conn) return { success: false, error: "No Salesforce connection" };

    const sfTaskData = {
      Subject: `[${activity.type}] ${activity.subject}`,
      Description: activity.description || "",
      ActivityDate: activity.date,
    };

    await salesforceRateLimiter.waitForAvailability();
    const result = await conn.sobject("Task").create(sfTaskData);
    const sfId = (result as any).id;
    assertValidSalesforceId(sfId, "syncActivity (new ID from Salesforce)");

    await storage.createSalesforceSyncLog({
      recordType: "Activity",
      recordId: activityId,
      salesforceId: sfId,
      action: "create",
      status: "success",
    });

    return { success: true, salesforceId: sfId };
  } catch (err: any) {
    logger.error({ err }, "API error");
    return { success: false, error: err.message };
  }
}

export async function batchSync(
  recordType: "task" | "meeting" | "activity",
  limit = 50
): Promise<BatchSyncResult> {
  const result: BatchSyncResult = { total: 0, succeeded: 0, failed: 0, errors: [] };

  if (!isSalesforceEnabled() || process.env.SALESFORCE_SYNC_ENABLED !== "true") {
    return result;
  }

  try {
    if (recordType === "task") {
      const tasks = await storage.getTasksWithSyncStatus("pending");
      result.total = Math.min(tasks.length, limit);
      for (const task of tasks.slice(0, limit)) {
        const syncResult = await syncTask(task.id);
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
        const syncResult = await syncMeeting(meeting.id);
        if (syncResult.success) result.succeeded++;
        else {
          result.failed++;
          result.errors.push({ id: meeting.id, error: syncResult.error || "Unknown" });
        }
      }
    }
  } catch (err: any) {
    logger.error({ err }, "API error");
  }

  return result;
}

export { mapPriority, mapStatus };
