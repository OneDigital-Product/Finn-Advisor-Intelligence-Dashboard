import { syncTask, syncMeeting as sfSyncMeeting } from "../integrations/salesforce/sync";
import { logger } from "../lib/logger";

export interface MeetingSalesforceSyncResult {
  activityId?: string;
  taskIds: string[];
  status: "success" | "skipped" | "error";
  error?: string;
}

export class MeetingSalesforceSync {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.SALESFORCE_ENABLED === "true" && process.env.SALESFORCE_SYNC_ENABLED === "true";
  }

  async syncMeetingAndTasks(
    meetingId: string,
    taskIds: string[]
  ): Promise<MeetingSalesforceSyncResult> {
    if (!this.enabled) {
      return { taskIds: [], status: "skipped" };
    }

    const result: MeetingSalesforceSyncResult = {
      taskIds: [],
      status: "success",
    };

    try {
      const meetingSync = await this.syncWithRetry(() => sfSyncMeeting(meetingId), 3);
      if (meetingSync) {
        result.activityId = meetingId;
      }
    } catch (err: any) {
      logger.error({ err }, "Meeting sync failed");
      result.status = "error";
      result.error = err.message;
    }

    for (const taskId of taskIds) {
      try {
        await this.syncWithRetry(() => syncTask(taskId), 3);
        result.taskIds.push(taskId);
      } catch (err: any) {
        logger.error({ err, taskId }, "Task sync failed");
        if (result.status === "success") result.status = "error";
      }
    }

    return result;
  }

  private async syncWithRetry(fn: () => Promise<any>, maxRetries: number): Promise<any> {
    let lastErr: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        if (result && result.success === false) {
          throw new Error(result.error || "Sync returned success=false");
        }
        return result;
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }
    throw lastErr;
  }
}
