import { getClient, isSalesforceEnabled } from "./client";
import { logger } from "../../lib/logger";
import { salesforceRateLimiter } from "./rate-limiter";
import { assertValidSalesforceId } from "./validate-salesforce-id";

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

export async function createWithdrawalCase(request: WithdrawalCaseRequest): Promise<WithdrawalCaseResponse> {
  const conn = await getClient();
  if (!conn) {
    logger.warn("[SF Withdrawal] Salesforce not enabled, returning mock case");
    return {
      caseId: `mock-case-${Date.now()}`,
      caseNumber: `WD-${Date.now().toString().slice(-6)}`,
      status: "New",
    };
  }

  try {
    const caseData: Record<string, unknown> = {
      Subject: `Withdrawal Request - ${request.clientName} - $${request.amount.toLocaleString()}`,
      Description: [
        `Client: ${request.clientName}`,
        `Account: ${request.accountNumber}`,
        `Amount: $${request.amount.toLocaleString()}`,
        `Method: ${request.method}`,
        `Reason: ${request.reason}`,
        `Advisor: ${request.advisorName}`,
      ].join("\n"),
      Type: "Withdrawal",
      Status: "New",
      Priority: request.amount >= 100000 ? "High" : "Medium",
      Origin: "Advisor Portal",
    };

    if (request.contactId) {
      assertValidSalesforceId(request.contactId, "createWithdrawalCase contactId");
      caseData.ContactId = request.contactId;
    }

    await salesforceRateLimiter.waitForAvailability();
    const result = await conn.sobject("Case").create(caseData);
    if (!result.success) {
      throw new Error("Salesforce case creation returned unsuccessful");
    }

    assertValidSalesforceId(result.id, "createWithdrawalCase result ID");

    await salesforceRateLimiter.waitForAvailability();
    const createdCase = await conn.sobject("Case").retrieve(result.id);

    return {
      caseId: result.id,
      caseNumber: createdCase.CaseNumber || `WD-${result.id.slice(-6)}`,
      status: "New",
    };
  } catch (err) {
    logger.error({ err }, "[SF Withdrawal] Failed to create withdrawal case");
    throw new Error("Failed to create Salesforce withdrawal case");
  }
}

export async function updateWithdrawalCaseStatus(
  caseId: string,
  status: string,
  comment?: string
): Promise<boolean> {
  assertValidSalesforceId(caseId, "updateWithdrawalCaseStatus");

  const conn = await getClient();
  if (!conn) {
    logger.warn("[SF Withdrawal] Salesforce not enabled, mock-updating case status");
    return true;
  }

  try {
    const updateData: Record<string, unknown> = { Status: status };
    if (comment) {
      updateData.Description = comment;
    }

    await salesforceRateLimiter.waitForAvailability();
    const result = await conn.sobject("Case").update({
      Id: caseId,
      ...updateData,
    });

    return result.success === true;
  } catch (err) {
    logger.error({ err }, "[SF Withdrawal] Failed to update case status");
    return false;
  }
}

export async function getWithdrawalCaseStatus(caseId: string): Promise<{ status: string; lastModified: string } | null> {
  assertValidSalesforceId(caseId, "getWithdrawalCaseStatus");

  const conn = await getClient();
  if (!conn) {
    logger.warn("[SF Withdrawal] Salesforce not enabled, returning null for case status");
    return null;
  }

  try {
    await salesforceRateLimiter.waitForAvailability();
    const result = await conn.sobject("Case").retrieve(caseId);
    return {
      status: result.Status,
      lastModified: result.LastModifiedDate,
    };
  } catch (err) {
    logger.error({ err }, "[SF Withdrawal] Failed to get case status");
    return null;
  }
}

export { isSalesforceEnabled };
