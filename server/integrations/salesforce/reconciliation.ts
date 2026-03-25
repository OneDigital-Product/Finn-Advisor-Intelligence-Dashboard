import { getClient, isSalesforceEnabled } from "./client";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";
import { mapStatus } from "./sync";
import { escapeSoqlString } from "./soql-escape";
import { salesforceRateLimiter } from "./rate-limiter";
import { isValidSalesforceId } from "./validate-salesforce-id";

export type ReconciliationReport = {
  orphaned: Array<any>;
  conflicts: Array<{ local: any; salesforce: any }>;
  missing: Array<any>;
  lastChecked: Date;
};

export async function reconcileTasksWithSalesforce(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    orphaned: [],
    conflicts: [],
    missing: [],
    lastChecked: new Date(),
  };

  if (!isSalesforceEnabled()) return report;

  try {
    const conn = await getClient();
    if (!conn) return report;

    const localTasks = await storage.getTasksWithSalesforceIds();

    for (const task of localTasks) {
      try {
        if (!isValidSalesforceId(task.salesforceTaskId)) {
          logger.warn({ taskId: task.id, salesforceTaskId: task.salesforceTaskId }, "Skipping reconciliation for task with invalid Salesforce ID");
          report.orphaned.push(task);
          continue;
        }

        await salesforceRateLimiter.waitForAvailability();
        const sfTasks = await conn.query(
          `SELECT Id, Subject, Status FROM Task WHERE Id = '${escapeSoqlString(task.salesforceTaskId!)}'`
        );

        if (!sfTasks.records || sfTasks.records.length === 0) {
          report.orphaned.push(task);
        } else {
          const sfTask = sfTasks.records[0] as any;
          if (sfTask.Subject !== task.title || sfTask.Status !== mapStatus(task.status)) {
            report.conflicts.push({ local: task, salesforce: sfTask });
          }
        }
      } catch (err) {
        logger.error({ err }, "API error");
      }
    }

    await salesforceRateLimiter.waitForAvailability();
    const allSFTasks = await conn.query("SELECT Id, Subject FROM Task LIMIT 100");
    for (const sfTask of (allSFTasks.records || []) as any[]) {
      const exists = localTasks.some((t) => t.salesforceTaskId === sfTask.Id);
      if (!exists) {
        report.missing.push(sfTask);
      }
    }
  } catch (err) {
    logger.error({ err }, "API error");
    throw err;
  }

  return report;
}

export async function reconcileMeetingsWithSalesforce(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    orphaned: [],
    conflicts: [],
    missing: [],
    lastChecked: new Date(),
  };

  if (!isSalesforceEnabled()) return report;

  try {
    const conn = await getClient();
    if (!conn) return report;

    const localMeetings = await storage.getMeetingsWithSalesforceIds();

    for (const meeting of localMeetings) {
      try {
        if (!isValidSalesforceId(meeting.salesforceEventId)) {
          logger.warn({ meetingId: meeting.id, salesforceEventId: meeting.salesforceEventId }, "Skipping reconciliation for meeting with invalid Salesforce ID");
          report.orphaned.push(meeting);
          continue;
        }

        await salesforceRateLimiter.waitForAvailability();
        const sfEvents = await conn.query(
          `SELECT Id, Subject, StartDateTime FROM Event WHERE Id = '${escapeSoqlString(meeting.salesforceEventId!)}'`
        );

        if (!sfEvents.records || sfEvents.records.length === 0) {
          report.orphaned.push(meeting);
        } else {
          const sfEvent = sfEvents.records[0] as any;
          if (sfEvent.Subject !== meeting.title) {
            report.conflicts.push({ local: meeting, salesforce: sfEvent });
          }
        }
      } catch (err) {
        logger.error({ err }, "API error");
      }
    }
  } catch (err) {
    logger.error({ err }, "API error");
    throw err;
  }

  return report;
}

export async function generateFullReport(): Promise<{
  tasks: ReconciliationReport;
  meetings: ReconciliationReport;
}> {
  const tasks = await reconcileTasksWithSalesforce();
  const meetings = await reconcileMeetingsWithSalesforce();
  return { tasks, meetings };
}
