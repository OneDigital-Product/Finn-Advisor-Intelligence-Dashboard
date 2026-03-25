import { logger } from "../../lib/logger";
import { db } from "../../db";
import { clients, accounts, activities, withdrawalRequests, nextBestActions } from "@shared/schema";
import { isNotNull } from "drizzle-orm";

const SALESFORCE_ID_REGEX = /^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/;

const SALESFORCE_OBJECT_PREFIXES: Record<string, string> = {
  Account: "001",
  Contact: "003",
  Case: "500",
  Task: "00T",
  Event: "00U",
  Opportunity: "006",
  Lead: "00Q",
};

export function isValidSalesforceId(id: string | null | undefined, options?: { prefix?: string }): boolean {
  if (id == null) return false;
  if (!SALESFORCE_ID_REGEX.test(id)) return false;
  if (options?.prefix && !id.startsWith(options.prefix)) return false;
  return true;
}

export function isValidSalesforceIdForObject(id: string | null | undefined, objectType: string): boolean {
  const prefix = SALESFORCE_OBJECT_PREFIXES[objectType];
  return isValidSalesforceId(id, prefix ? { prefix } : undefined);
}

export function assertValidSalesforceId(id: string, context?: string): void {
  if (!isValidSalesforceId(id)) {
    const label = context ? `${context}: ` : "";
    throw new Error(`${label}Invalid Salesforce ID format: "${id}"`);
  }
}

export function validateSalesforceIdOrNull(id: string | null | undefined, context?: string): string | null {
  if (id == null || id === "") return null;
  assertValidSalesforceId(id, context);
  return id;
}

async function auditColumn(
  tableName: string,
  columnName: string,
  records: Array<{ id: string; sfId: string | null }>
): Promise<number> {
  let count = 0;
  for (const record of records) {
    if (record.sfId != null && !isValidSalesforceId(record.sfId)) {
      logger.warn(
        { recordId: record.id, [columnName]: record.sfId, table: tableName },
        `Malformed Salesforce ID found in ${tableName}.${columnName}`
      );
      count++;
    }
  }
  return count;
}

export async function auditSalesforceIds(storage: {
  getTasksWithSalesforceIds: () => Promise<Array<{ id: string; salesforceTaskId: string | null }>>;
  getMeetingsWithSalesforceIds: () => Promise<Array<{ id: string; salesforceEventId: string | null }>>;
}): Promise<void> {
  let malformedCount = 0;

  try {
    const taskRecords = await storage.getTasksWithSalesforceIds();
    malformedCount += await auditColumn("tasks", "salesforceTaskId",
      taskRecords.map(t => ({ id: t.id, sfId: t.salesforceTaskId })));
  } catch (err) {
    logger.error({ err }, "Failed to audit Salesforce Task IDs");
  }

  try {
    const meetingRecords = await storage.getMeetingsWithSalesforceIds();
    malformedCount += await auditColumn("meetings", "salesforceEventId",
      meetingRecords.map(m => ({ id: m.id, sfId: m.salesforceEventId })));
  } catch (err) {
    logger.error({ err }, "Failed to audit Salesforce Event IDs");
  }

  try {
    const clientRecords = await db.select({ id: clients.id, sfId: clients.salesforceContactId })
      .from(clients).where(isNotNull(clients.salesforceContactId));
    malformedCount += await auditColumn("clients", "salesforceContactId", clientRecords);
  } catch (err) {
    logger.error({ err }, "Failed to audit Salesforce Contact IDs");
  }

  try {
    const accountRecords = await db.select({ id: accounts.id, sfId: accounts.salesforceAccountId })
      .from(accounts).where(isNotNull(accounts.salesforceAccountId));
    malformedCount += await auditColumn("accounts", "salesforceAccountId", accountRecords);
  } catch (err) {
    logger.error({ err }, "Failed to audit Salesforce Account IDs");
  }

  try {
    const activityRecords = await db.select({ id: activities.id, sfId: activities.salesforceActivityId })
      .from(activities).where(isNotNull(activities.salesforceActivityId));
    malformedCount += await auditColumn("activities", "salesforceActivityId", activityRecords);
  } catch (err) {
    logger.error({ err }, "Failed to audit Salesforce Activity IDs");
  }

  try {
    const withdrawalRecords = await db.select({ id: withdrawalRequests.id, sfId: withdrawalRequests.salesforceCaseId })
      .from(withdrawalRequests).where(isNotNull(withdrawalRequests.salesforceCaseId));
    malformedCount += await auditColumn("withdrawalRequests", "salesforceCaseId", withdrawalRecords);
  } catch (err) {
    logger.error({ err }, "Failed to audit Salesforce Case IDs");
  }

  try {
    const nbaRecords = await db.select({ id: nextBestActions.id, sfId: nextBestActions.salesforceActivityId })
      .from(nextBestActions).where(isNotNull(nextBestActions.salesforceActivityId));
    malformedCount += await auditColumn("nextBestActions", "salesforceActivityId", nbaRecords);
  } catch (err) {
    logger.error({ err }, "Failed to audit Salesforce Next Best Action Activity IDs");
  }

  if (malformedCount > 0) {
    logger.warn({ malformedCount }, "Salesforce ID audit complete: malformed IDs found");
  } else {
    logger.info("Salesforce ID audit complete: all IDs valid");
  }
}
