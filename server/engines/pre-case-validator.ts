import { db } from "../db";
import { clients, accounts, holdings, complianceItems, households, householdMembers } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface ValidationModule {
  name: string;
  key: string;
  result: "pass" | "flag" | "fail";
  checks: ValidationCheck[];
  remediation: string[];
}

export interface ValidationCheck {
  label: string;
  result: "pass" | "flag" | "fail";
  detail: string;
}

export interface ValidationResult {
  overallResult: "pass" | "flag" | "fail";
  modules: ValidationModule[];
  timestamp: string;
}

export async function runNewAccountValidation(clientId: string): Promise<ValidationModule> {
  const checks: ValidationCheck[] = [];
  const remediation: string[] = [];

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) {
    return { name: "New Account Validation", key: "new_account", result: "fail", checks: [{ label: "Client exists", result: "fail", detail: "Client not found" }], remediation: ["Verify client ID"] };
  }

  checks.push({
    label: "Client profile complete",
    result: client.email && client.phone && client.dateOfBirth && client.address ? "pass" : "flag",
    detail: client.email && client.phone && client.dateOfBirth && client.address
      ? "All required fields present"
      : `Missing: ${[!client.email && "email", !client.phone && "phone", !client.dateOfBirth && "DOB", !client.address && "address"].filter(Boolean).join(", ")}`,
  });
  if (checks[checks.length - 1].result !== "pass") remediation.push("Complete client profile with missing information before submitting new account paperwork");

  const clientAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
  checks.push({
    label: "Account information",
    result: clientAccounts.length > 0 ? "pass" : "flag",
    detail: clientAccounts.length > 0 ? `${clientAccounts.length} account(s) on file` : "No accounts found for this client",
  });
  if (clientAccounts.length === 0) remediation.push("Ensure at least one account is set up before case submission");

  const hasCustodian = clientAccounts.every(a => a.custodian && a.custodian.trim().length > 0);
  checks.push({
    label: "Custodian assignment",
    result: hasCustodian ? "pass" : "fail",
    detail: hasCustodian ? "All accounts have custodian assigned" : "One or more accounts missing custodian",
  });
  if (!hasCustodian) remediation.push("Assign a custodian to all accounts before submission");

  checks.push({
    label: "Risk tolerance documented",
    result: client.riskTolerance ? "pass" : "flag",
    detail: client.riskTolerance ? `Risk tolerance: ${client.riskTolerance}` : "Risk tolerance not documented",
  });
  if (!client.riskTolerance) remediation.push("Document client risk tolerance via investor profile questionnaire");

  const result = checks.some(c => c.result === "fail") ? "fail" : checks.some(c => c.result === "flag") ? "flag" : "pass";
  return { name: "New Account Validation", key: "new_account", result, checks, remediation };
}

export async function runBillingFeeValidation(clientId: string): Promise<ValidationModule> {
  const checks: ValidationCheck[] = [];
  const remediation: string[] = [];

  const clientAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
  const totalBalance = clientAccounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  checks.push({
    label: "Account balances positive",
    result: clientAccounts.every(a => parseFloat(a.balance) >= 0) ? "pass" : "flag",
    detail: clientAccounts.every(a => parseFloat(a.balance) >= 0) ? "All account balances are non-negative" : "One or more accounts have negative balances",
  });
  if (checks[checks.length - 1].result !== "pass") remediation.push("Review accounts with negative balances before fee calculation");

  checks.push({
    label: "Minimum balance threshold",
    result: totalBalance >= 10000 ? "pass" : "flag",
    detail: totalBalance >= 10000 ? `Total balance: $${totalBalance.toLocaleString()}` : `Total balance $${totalBalance.toLocaleString()} below $10,000 minimum`,
  });
  if (totalBalance < 10000) remediation.push("Account may not meet minimum balance requirements for billing tier");

  const hasModel = clientAccounts.every(a => a.model && a.model.trim().length > 0);
  checks.push({
    label: "Model assignment",
    result: hasModel ? "pass" : "flag",
    detail: hasModel ? "All accounts have model assignment" : "One or more accounts missing model assignment",
  });
  if (!hasModel) remediation.push("Assign investment models to all accounts for proper fee calculation");

  checks.push({
    label: "Account status active",
    result: clientAccounts.every(a => a.status === "active") ? "pass" : "flag",
    detail: clientAccounts.every(a => a.status === "active") ? "All accounts active" : "Some accounts are not in active status",
  });
  if (checks[checks.length - 1].result !== "pass") remediation.push("Verify inactive accounts should be included in billing");

  const result = checks.some(c => c.result === "fail") ? "fail" : checks.some(c => c.result === "flag") ? "flag" : "pass";
  return { name: "Billing & Fee Integrity", key: "billing_fee", result, checks, remediation };
}

export async function runDataIntegrityValidation(clientId: string): Promise<ValidationModule> {
  const checks: ValidationCheck[] = [];
  const remediation: string[] = [];

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  const clientAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));

  const accountNumbers = clientAccounts.map(a => a.accountNumber);
  const uniqueNumbers = new Set(accountNumbers);
  checks.push({
    label: "Unique account numbers",
    result: uniqueNumbers.size === accountNumbers.length ? "pass" : "fail",
    detail: uniqueNumbers.size === accountNumbers.length ? "All account numbers are unique" : "Duplicate account numbers detected",
  });
  if (uniqueNumbers.size !== accountNumbers.length) remediation.push("Resolve duplicate account numbers before case submission");

  if (client?.email) {
    const emailDuplicates = await db.select().from(clients).where(and(eq(clients.email, client.email)));
    checks.push({
      label: "Email uniqueness",
      result: emailDuplicates.length <= 1 ? "pass" : "flag",
      detail: emailDuplicates.length <= 1 ? "Client email is unique" : `Email shared with ${emailDuplicates.length - 1} other client(s)`,
    });
    if (emailDuplicates.length > 1) remediation.push("Verify email is correct — shared emails may indicate data entry error");
  }

  let totalHoldings = 0;
  for (const account of clientAccounts) {
    const h = await db.select().from(holdings).where(eq(holdings.accountId, account.id));
    totalHoldings += h.length;
    const holdingTotal = h.reduce((sum, hld) => sum + parseFloat(hld.marketValue), 0);
    const accountBalance = parseFloat(account.balance);
    const diff = Math.abs(holdingTotal - accountBalance);
    const diffPct = accountBalance > 0 ? (diff / accountBalance) * 100 : 0;

    if (diffPct > 5 && diff > 100) {
      checks.push({
        label: `Holdings reconciliation (${account.accountNumber})`,
        result: "flag",
        detail: `Holdings total $${holdingTotal.toLocaleString()} vs balance $${accountBalance.toLocaleString()} (${diffPct.toFixed(1)}% variance)`,
      });
      remediation.push(`Reconcile holdings for account ${account.accountNumber} — ${diffPct.toFixed(1)}% variance detected`);
    }
  }

  checks.push({
    label: "Holdings data present",
    result: totalHoldings > 0 ? "pass" : "flag",
    detail: totalHoldings > 0 ? `${totalHoldings} holdings across ${clientAccounts.length} accounts` : "No holdings data found",
  });
  if (totalHoldings === 0) remediation.push("Import or sync holdings data before submission");

  checks.push({
    label: "Last contact date",
    result: client?.lastContactDate ? "pass" : "flag",
    detail: client?.lastContactDate ? `Last contact: ${client.lastContactDate}` : "No last contact date recorded",
  });
  if (!client?.lastContactDate) remediation.push("Record last contact date for compliance tracking");

  const result = checks.some(c => c.result === "fail") ? "fail" : checks.some(c => c.result === "flag") ? "flag" : "pass";
  return { name: "Data Integrity Cross-Check", key: "data_integrity", result, checks, remediation };
}

export async function runMAConflictDetection(clientId: string): Promise<ValidationModule> {
  const checks: ValidationCheck[] = [];
  const remediation: string[] = [];

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) {
    return { name: "M&A Conflict Detection", key: "ma_conflict", result: "fail", checks: [{ label: "Client exists", result: "fail", detail: "Client not found" }], remediation: ["Verify client ID"] };
  }

  if (client.employer) {
    const sameEmployer = await db.select().from(clients).where(
      and(eq(clients.advisorId, client.advisorId), ilike(clients.employer, client.employer))
    );
    const otherClients = sameEmployer.filter(c => c.id !== clientId);
    checks.push({
      label: "Employer conflict check",
      result: otherClients.length === 0 ? "pass" : "flag",
      detail: otherClients.length === 0 ? "No other clients at same employer" : `${otherClients.length} other client(s) at ${client.employer} — review for potential M&A conflicts`,
    });
    if (otherClients.length > 0) remediation.push(`Review potential conflict of interest with ${otherClients.length} other client(s) employed at ${client.employer}`);
  } else {
    checks.push({
      label: "Employer conflict check",
      result: "flag",
      detail: "No employer on file — unable to check for M&A conflicts",
    });
    remediation.push("Document client employer for M&A conflict detection");
  }

  const clientAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
  const clientHoldings: Array<{ ticker: string; name: string; marketValue: string }> = [];
  for (const account of clientAccounts) {
    const h = await db.select().from(holdings).where(eq(holdings.accountId, account.id));
    clientHoldings.push(...h.map(hld => ({ ticker: hld.ticker, name: hld.name, marketValue: hld.marketValue })));
  }

  const largePositions = clientHoldings.filter(h => parseFloat(h.marketValue) > 100000);
  checks.push({
    label: "Large concentrated positions",
    result: largePositions.length === 0 ? "pass" : "flag",
    detail: largePositions.length === 0
      ? "No concentrated positions over $100K"
      : `${largePositions.length} position(s) over $100K: ${largePositions.map(p => `${p.ticker} ($${parseFloat(p.marketValue).toLocaleString()})`).join(", ")}`,
  });
  if (largePositions.length > 0) remediation.push("Review concentrated positions for insider trading or M&A conflict risk");

  const compItems = await db.select().from(complianceItems).where(
    and(eq(complianceItems.clientId, clientId), eq(complianceItems.status, "pending"))
  );
  checks.push({
    label: "Pending compliance items",
    result: compItems.length === 0 ? "pass" : "flag",
    detail: compItems.length === 0 ? "No pending compliance items" : `${compItems.length} pending compliance item(s) require resolution`,
  });
  if (compItems.length > 0) remediation.push("Resolve pending compliance items before case submission to avoid regulatory flags");

  const result = checks.some(c => c.result === "fail") ? "fail" : checks.some(c => c.result === "flag") ? "flag" : "pass";
  return { name: "M&A Conflict Detection", key: "ma_conflict", result, checks, remediation };
}

export async function runFullValidation(clientId: string): Promise<ValidationResult> {
  const modules = await Promise.all([
    runNewAccountValidation(clientId),
    runBillingFeeValidation(clientId),
    runDataIntegrityValidation(clientId),
    runMAConflictDetection(clientId),
  ]);

  const overallResult = modules.some(m => m.result === "fail")
    ? "fail"
    : modules.some(m => m.result === "flag")
      ? "flag"
      : "pass";

  logger.info({ clientId, overallResult, moduleResults: modules.map(m => ({ key: m.key, result: m.result })) }, "Pre-case validation completed");

  return {
    overallResult,
    modules,
    timestamp: new Date().toISOString(),
  };
}
