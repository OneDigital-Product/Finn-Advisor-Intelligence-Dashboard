import { getClient, isSalesforceEnabled } from "./client";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";
import { createFirst100DaysWorkflow } from "../../engines/onboarding-engine";
import { escapeSoqlLimit } from "./soql-escape";
import { salesforceRateLimiter } from "./rate-limiter";
import { isValidSalesforceId } from "./validate-salesforce-id";

export type InboundSyncResult = {
  synced: number;
  updated: number;
  errors: Array<{ id: string; error: string }>;
};

export async function syncContacts(
  advisorId: string,
  options?: { limit?: number }
): Promise<InboundSyncResult> {
  const limit = options?.limit || 100;
  const results: InboundSyncResult = { synced: 0, updated: 0, errors: [] };

  if (!isSalesforceEnabled()) {
    return results;
  }

  try {
    const conn = await getClient();
    if (!conn) return results;

    await salesforceRateLimiter.waitForAvailability();
    const query = `SELECT Id, Name, Email, Phone FROM Contact LIMIT ${escapeSoqlLimit(limit)}`;
    const records = await conn.query(query);

    for (const contact of (records.records || []) as any[]) {
      try {
        if (!isValidSalesforceId(contact.Id)) {
          logger.warn({ contactId: contact.Id }, "Skipping contact with invalid Salesforce ID");
          results.errors.push({ id: contact.Id, error: "Invalid Salesforce ID format" });
          continue;
        }

        const existing = await storage.getClientBySalesforceContactId(contact.Id);

        if (existing) {
          await storage.updateClient(existing.id, {
            email: contact.Email || existing.email,
            phone: contact.Phone || existing.phone,
          });
          results.updated++;
        } else {
          const nameParts = (contact.Name || "").split(" ");
          const firstName = nameParts[0] || contact.Name || "Unknown";
          const lastName = nameParts.slice(1).join(" ") || "";

          const newClient = await storage.createClient({
            advisorId,
            firstName,
            lastName,
            email: contact.Email || undefined,
            phone: contact.Phone || undefined,
            salesforceContactId: contact.Id,
          });
          results.synced++;

          try {
            const advisor = await storage.getAdvisor(advisorId);
            await createFirst100DaysWorkflow(storage, newClient.id, advisorId, advisor?.name || "System");
            logger.info({ clientId: newClient.id }, "Auto-created First 100 Days onboarding workflow for new client");
          } catch (onboardingErr) {
            logger.error({ err: onboardingErr, clientId: newClient.id }, "Failed to auto-create onboarding workflow");
          }
        }

        await storage.createSalesforceSyncLog({
          recordType: "Contact",
          recordId: contact.Id,
          salesforceId: contact.Id,
          action: "import",
          status: "success",
        });
      } catch (err: any) {
        results.errors.push({ id: contact.Id, error: err.message });
      }
    }
  } catch (err: any) {
    logger.error({ err }, "API error");
    throw err;
  }

  return results;
}

export async function syncAccounts(
  options?: { limit?: number }
): Promise<InboundSyncResult> {
  const limit = options?.limit || 100;
  const results: InboundSyncResult = { synced: 0, updated: 0, errors: [] };

  if (!isSalesforceEnabled()) {
    return results;
  }

  try {
    const conn = await getClient();
    if (!conn) return results;

    await salesforceRateLimiter.waitForAvailability();
    const query = `SELECT Id, Name, Type FROM Account LIMIT ${escapeSoqlLimit(limit)}`;
    const records = await conn.query(query);

    for (const account of (records.records || []) as any[]) {
      try {
        if (!isValidSalesforceId(account.Id)) {
          logger.warn({ accountId: account.Id }, "Skipping account with invalid Salesforce ID");
          results.errors.push({ id: account.Id, error: "Invalid Salesforce ID format" });
          continue;
        }

        const existing = await storage.getAccountBySalesforceId(account.Id);

        if (existing) {
          results.updated++;
        } else {
          results.synced++;
        }

        await storage.createSalesforceSyncLog({
          recordType: "Account",
          recordId: account.Id,
          salesforceId: account.Id,
          action: "import",
          status: "success",
        });
      } catch (err: any) {
        results.errors.push({ id: account.Id, error: err.message });
      }
    }
  } catch (err: any) {
    logger.error({ err }, "API error");
    throw err;
  }

  return results;
}
