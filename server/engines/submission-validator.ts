import { db } from "../db";
import {
  clients, accounts, documents, documentChecklist,
  validationRules, validationResults,
} from "@shared/schema";
import type { ValidationRule, InsertValidationResult } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export type ValidationStatus = "pass" | "fail" | "warn";

export interface ValidationCheckResult {
  module: string;
  ruleKey: string;
  status: ValidationStatus;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface ValidationRunSummary {
  passed: boolean;
  totalChecks: number;
  passCount: number;
  failCount: number;
  warnCount: number;
  results: ValidationCheckResult[];
}

interface CaseContext {
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
  clientId?: string;
  accountId?: string;
}

async function getActiveRules(module: string): Promise<ValidationRule[]> {
  return db
    .select()
    .from(validationRules)
    .where(and(eq(validationRules.module, module), eq(validationRules.enabled, true)));
}

async function getClientData(clientId: string) {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId));
  return client || null;
}

async function getAccountData(accountId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId));
  return account || null;
}

async function getClientAccounts(clientId: string) {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.clientId, clientId));
}

async function getClientDocuments(clientId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.clientId, clientId));
}

async function getClientChecklist(clientId: string) {
  return db
    .select()
    .from(documentChecklist)
    .where(eq(documentChecklist.clientId, clientId));
}

function check(
  module: string,
  ruleKey: string,
  condition: boolean,
  passMsg: string,
  failMsg: string,
  remediation?: string,
  details?: Record<string, unknown>,
  severity: "error" | "warn" | "info" = "error"
): ValidationCheckResult {
  const failStatus: ValidationStatus = severity === "warn" ? "warn" : "fail";
  return {
    module,
    ruleKey,
    status: condition ? "pass" : failStatus,
    message: condition ? passMsg : failMsg,
    remediation: condition ? undefined : remediation,
    details,
  };
}

function buildSeverityMap(rules: ValidationRule[]): Record<string, "error" | "warn" | "info"> {
  const map: Record<string, "error" | "warn" | "info"> = {};
  for (const r of rules) {
    map[r.ruleKey] = (r.severity as "error" | "warn" | "info") || "error";
  }
  return map;
}

async function runNewAccountChecks(ctx: CaseContext): Promise<ValidationCheckResult[]> {
  const results: ValidationCheckResult[] = [];
  const rules = await getActiveRules("new_accounts");
  if (rules.length === 0) return results;
  const ruleKeys = new Set(rules.map(r => r.ruleKey));
  const severityMap = buildSeverityMap(rules);

  const clientId = ctx.clientId || ctx.entityId || "";
  const client = clientId ? await getClientData(clientId) : null;
  const clientDocs = clientId ? await getClientDocuments(clientId) : [];
  const checklist = clientId ? await getClientChecklist(clientId) : [];
  const clientAccounts = clientId ? await getClientAccounts(clientId) : [];

  if (ruleKeys.has("required_documents")) {
    const requiredItems = checklist.filter(c => c.required);
    const receivedItems = requiredItems.filter(c => c.received);
    const allReceived = requiredItems.length > 0 && receivedItems.length === requiredItems.length;
    results.push(check(
      "new_accounts", "required_documents", allReceived,
      `All ${requiredItems.length} required documents received`,
      `Missing ${requiredItems.length - receivedItems.length} of ${requiredItems.length} required documents`,
      "Upload all required documents before submission. Check the document checklist for specifics.",
      { required: requiredItems.length, received: receivedItems.length, missing: requiredItems.filter(c => !c.received).map(c => c.documentName) },
      severityMap["required_documents"]
    ));
  }

  if (ruleKeys.has("suitability_alignment")) {
    const hasRisk = !!client?.riskTolerance;
    results.push(check(
      "new_accounts", "suitability_alignment", hasRisk,
      "Risk tolerance profile is set",
      "Client risk tolerance profile is missing",
      "Complete the client's suitability questionnaire and set the risk tolerance before submitting.",
      { riskTolerance: client?.riskTolerance || null },
      severityMap["suitability_alignment"]
    ));
  }

  if (ruleKeys.has("account_registration")) {
    const hasAccounts = clientAccounts.length > 0;
    const allActive = clientAccounts.every(a => a.status === "active");
    results.push(check(
      "new_accounts", "account_registration", hasAccounts && allActive,
      `${clientAccounts.length} account(s) registered and active`,
      hasAccounts ? "Some accounts are not in active status" : "No accounts registered for this client",
      "Ensure all accounts are registered and in active status with the custodian.",
      { accountCount: clientAccounts.length, inactive: clientAccounts.filter(a => a.status !== "active").map(a => a.accountNumber) },
      severityMap["account_registration"]
    ));
  }

  if (ruleKeys.has("beneficiary_designations")) {
    const retirementAccounts = clientAccounts.filter(a =>
      ["IRA", "Roth IRA", "401k", "403b", "SEP IRA", "SIMPLE IRA"].includes(a.accountType)
    );
    const payload = ctx.payload || {};
    const hasBeneficiary = !!payload.beneficiaryDesignated || retirementAccounts.length === 0;
    results.push(check(
      "new_accounts", "beneficiary_designations", hasBeneficiary,
      retirementAccounts.length === 0 ? "No retirement accounts requiring beneficiary" : "Beneficiary designations confirmed",
      `${retirementAccounts.length} retirement account(s) require beneficiary designations`,
      "Complete beneficiary designation forms for all retirement accounts before submission.",
      { retirementAccounts: retirementAccounts.map(a => ({ number: a.accountNumber, type: a.accountType })) },
      severityMap["beneficiary_designations"]
    ));
  }

  return results;
}

async function runBillingFeeChecks(ctx: CaseContext): Promise<ValidationCheckResult[]> {
  const results: ValidationCheckResult[] = [];
  const rules = await getActiveRules("billing_fee");
  if (rules.length === 0) return results;
  const ruleKeys = new Set(rules.map(r => r.ruleKey));
  const severityMap = buildSeverityMap(rules);

  const clientId = ctx.clientId || ctx.entityId || "";
  const clientAccounts = clientId ? await getClientAccounts(clientId) : [];
  const payload = ctx.payload || {};

  if (ruleKeys.has("fee_schedule_consistency")) {
    const feeSchedule = payload.feeSchedule as string | undefined;
    const hasFee = !!feeSchedule || clientAccounts.some(a => a.model);
    results.push(check(
      "billing_fee", "fee_schedule_consistency", hasFee,
      "Fee schedule or model assignment confirmed",
      "No fee schedule or model assigned to accounts",
      "Assign a fee schedule or investment model to client accounts before submission.",
      { feeSchedule: feeSchedule || null, modelsAssigned: clientAccounts.filter(a => a.model).length },
      severityMap["fee_schedule_consistency"]
    ));
  }

  if (ruleKeys.has("billing_method")) {
    const billingMethod = payload.billingMethod as string | undefined;
    const validMethods = ["direct_debit", "invoice", "arrears", "advance"];
    const isValid = !!billingMethod && validMethods.includes(billingMethod);
    results.push(check(
      "billing_fee", "billing_method", isValid,
      `Billing method set: ${billingMethod}`,
      "Billing method not specified or invalid",
      `Specify a valid billing method. Options: ${validMethods.join(", ")}.`,
      { billingMethod: billingMethod || null, validMethods },
      severityMap["billing_method"]
    ));
  }

  if (ruleKeys.has("advisory_agreement")) {
    const clientDocs = clientId ? await getClientDocuments(clientId) : [];
    const hasAgreement = clientDocs.some(d =>
      d.type.toLowerCase().includes("advisory") || d.type.toLowerCase().includes("agreement")
    );
    results.push(check(
      "billing_fee", "advisory_agreement", hasAgreement,
      "Advisory agreement document found",
      "No advisory agreement on file",
      "Upload a signed advisory agreement before submitting the case.",
      { documentsChecked: clientDocs.length },
      severityMap["advisory_agreement"]
    ));
  }

  return results;
}

async function runDataIntegrityChecks(ctx: CaseContext): Promise<ValidationCheckResult[]> {
  const results: ValidationCheckResult[] = [];
  const rules = await getActiveRules("data_integrity");
  if (rules.length === 0) return results;
  const ruleKeys = new Set(rules.map(r => r.ruleKey));
  const severityMap = buildSeverityMap(rules);

  const clientId = ctx.clientId || ctx.entityId || "";
  const client = clientId ? await getClientData(clientId) : null;

  if (ruleKeys.has("client_data_completeness")) {
    const requiredFields = ["firstName", "lastName", "email", "dateOfBirth"] as const;
    const missingFields = client
      ? requiredFields.filter(f => !client[f])
      : requiredFields as unknown as string[];
    const complete = missingFields.length === 0;
    results.push(check(
      "data_integrity", "client_data_completeness", complete,
      "All required client fields are populated",
      `Missing required client fields: ${missingFields.join(", ")}`,
      "Complete all required client profile fields before submission.",
      { missingFields },
      severityMap["client_data_completeness"]
    ));
  }

  if (ruleKeys.has("address_verification")) {
    const hasAddress = !!client?.address && !!client?.city && !!client?.state && !!client?.zip;
    const missing = [];
    if (!client?.address) missing.push("address");
    if (!client?.city) missing.push("city");
    if (!client?.state) missing.push("state");
    if (!client?.zip) missing.push("zip");
    results.push(check(
      "data_integrity", "address_verification", hasAddress,
      "Client address is complete",
      `Incomplete address — missing: ${missing.join(", ")}`,
      "Provide complete mailing address including street, city, state, and ZIP code.",
      { missing },
      severityMap["address_verification"]
    ));
  }

  if (ruleKeys.has("ssn_tin_format")) {
    const payload = ctx.payload || {};
    const ssn = (payload.ssn || payload.tin || "") as string;
    const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
    const tinPattern = /^\d{2}-?\d{7}$/;
    const hasValidId = ssnPattern.test(ssn) || tinPattern.test(ssn) || !ssn;
    const noId = !ssn;
    results.push(check(
      "data_integrity", "ssn_tin_format",
      hasValidId && !noId,
      "SSN/TIN format is valid",
      noId ? "No SSN or TIN provided" : "SSN/TIN format is invalid",
      noId
        ? "Provide either an SSN (XXX-XX-XXXX) or TIN (XX-XXXXXXX) for the client."
        : "Correct the SSN/TIN format. SSN: XXX-XX-XXXX, TIN: XX-XXXXXXX.",
      { provided: !!ssn, formatValid: hasValidId },
      severityMap["ssn_tin_format"]
    ));
  }

  if (ruleKeys.has("duplicate_detection")) {
    let duplicateCount = 0;
    if (client?.email) {
      const dupes = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(and(eq(clients.email, client.email), sql`${clients.id} != ${clientId}`));
      duplicateCount = dupes[0]?.count || 0;
    }
    results.push(check(
      "data_integrity", "duplicate_detection", duplicateCount === 0,
      "No duplicate clients detected",
      `${duplicateCount} potential duplicate client(s) found with the same email`,
      "Review and resolve potential duplicate records before submission.",
      { duplicateCount, email: client?.email },
      severityMap["duplicate_detection"]
    ));
  }

  return results;
}

async function runMandAChecks(ctx: CaseContext): Promise<ValidationCheckResult[]> {
  const results: ValidationCheckResult[] = [];
  const rules = await getActiveRules("mergers_acquisitions");
  if (rules.length === 0) return results;
  const ruleKeys = new Set(rules.map(r => r.ruleKey));
  const severityMap = buildSeverityMap(rules);

  const payload = ctx.payload || {};
  const clientId = ctx.clientId || ctx.entityId || "";
  const clientAccounts = clientId ? await getClientAccounts(clientId) : [];

  if (ruleKeys.has("account_reregistration")) {
    const reregistrationComplete = !!payload.reregistrationComplete;
    const needsReregistration = !!payload.requiresReregistration;
    const passes = !needsReregistration || reregistrationComplete;
    results.push(check(
      "mergers_acquisitions", "account_reregistration", passes,
      needsReregistration ? "Account re-registration completed" : "No re-registration required",
      "Account re-registration is required but not complete",
      "Complete the account re-registration process with the custodian before submission.",
      { needsReregistration, reregistrationComplete, accountCount: clientAccounts.length },
      severityMap["account_reregistration"]
    ));
  }

  if (ruleKeys.has("advisor_reassignment")) {
    const advisorReassigned = !!payload.advisorReassigned;
    const needsReassignment = !!payload.requiresAdvisorReassignment;
    const passes = !needsReassignment || advisorReassigned;
    results.push(check(
      "mergers_acquisitions", "advisor_reassignment", passes,
      needsReassignment ? "Advisor reassignment completed" : "No advisor reassignment required",
      "Advisor reassignment is required but not complete",
      "Complete advisor reassignment in the system and update custodial records.",
      { needsReassignment, advisorReassigned },
      severityMap["advisor_reassignment"]
    ));
  }

  if (ruleKeys.has("client_communication")) {
    const communicationSent = !!payload.clientNotified;
    const requiresCommunication = !!payload.requiresClientCommunication;
    const passes = !requiresCommunication || communicationSent;
    results.push(check(
      "mergers_acquisitions", "client_communication", passes,
      requiresCommunication ? "Client communication sent" : "No client communication required",
      "Client communication about the M&A transition is required but not sent",
      "Send the M&A transition notice to affected clients before submission.",
      { requiresCommunication, communicationSent },
      severityMap["client_communication"]
    ));
  }

  return results;
}

export async function runAllValidators(ctx: CaseContext): Promise<ValidationRunSummary> {
  const allResults: ValidationCheckResult[] = [];

  const [newAcct, billing, dataInt, manda] = await Promise.all([
    runNewAccountChecks(ctx),
    runBillingFeeChecks(ctx),
    runDataIntegrityChecks(ctx),
    runMandAChecks(ctx),
  ]);

  allResults.push(...newAcct, ...billing, ...dataInt, ...manda);

  const passCount = allResults.filter(r => r.status === "pass").length;
  const failCount = allResults.filter(r => r.status === "fail").length;
  const warnCount = allResults.filter(r => r.status === "warn").length;

  return {
    passed: failCount === 0,
    totalChecks: allResults.length,
    passCount,
    failCount,
    warnCount,
    results: allResults,
  };
}

export async function runModuleValidation(module: string, ctx: CaseContext): Promise<ValidationRunSummary> {
  let results: ValidationCheckResult[] = [];

  switch (module) {
    case "new_accounts":
      results = await runNewAccountChecks(ctx);
      break;
    case "billing_fee":
      results = await runBillingFeeChecks(ctx);
      break;
    case "data_integrity":
      results = await runDataIntegrityChecks(ctx);
      break;
    case "mergers_acquisitions":
      results = await runMandAChecks(ctx);
      break;
    default:
      logger.warn({ module }, "Unknown validation module");
  }

  const passCount = results.filter(r => r.status === "pass").length;
  const failCount = results.filter(r => r.status === "fail").length;
  const warnCount = results.filter(r => r.status === "warn").length;

  return {
    passed: failCount === 0,
    totalChecks: results.length,
    passCount,
    failCount,
    warnCount,
    results,
  };
}

export async function persistValidationResults(
  approvalItemId: string,
  summary: ValidationRunSummary,
  runBy: string,
  entityType: string,
  entityId?: string | null
): Promise<string> {
  if (summary.results.length === 0) return "";

  const runId = crypto.randomUUID();

  const rows: InsertValidationResult[] = summary.results.map(r => ({
    runId,
    approvalItemId,
    entityType,
    entityId: entityId || null,
    module: r.module,
    ruleKey: r.ruleKey,
    status: r.status,
    message: r.message,
    remediation: r.remediation || null,
    details: r.details || {},
    runBy,
  }));

  await db.insert(validationResults).values(rows);

  logger.info(
    { approvalItemId, runId, total: summary.totalChecks, passed: summary.passCount, failed: summary.failCount },
    "Validation results persisted"
  );

  return runId;
}

export const VALIDATION_MODULES = [
  { key: "new_accounts", label: "New Accounts" },
  { key: "billing_fee", label: "Billing & Fee" },
  { key: "data_integrity", label: "Data Integrity" },
  { key: "mergers_acquisitions", label: "M&A" },
] as const;

export const DEFAULT_VALIDATION_RULES = [
  { module: "new_accounts", ruleKey: "required_documents", label: "Required Documents", description: "Verify all required documents are received", severity: "error" },
  { module: "new_accounts", ruleKey: "suitability_alignment", label: "Suitability Alignment", description: "Verify risk tolerance profile is set", severity: "error" },
  { module: "new_accounts", ruleKey: "account_registration", label: "Account Registration", description: "Verify accounts are registered and active", severity: "error" },
  { module: "new_accounts", ruleKey: "beneficiary_designations", label: "Beneficiary Designations", description: "Verify beneficiaries for retirement accounts", severity: "error" },
  { module: "billing_fee", ruleKey: "fee_schedule_consistency", label: "Fee Schedule", description: "Verify fee schedule or model is assigned", severity: "error" },
  { module: "billing_fee", ruleKey: "billing_method", label: "Billing Method", description: "Verify billing method is set and valid", severity: "error" },
  { module: "billing_fee", ruleKey: "advisory_agreement", label: "Advisory Agreement", description: "Verify advisory agreement is on file", severity: "error" },
  { module: "data_integrity", ruleKey: "client_data_completeness", label: "Data Completeness", description: "Verify all required client fields are populated", severity: "error" },
  { module: "data_integrity", ruleKey: "address_verification", label: "Address Verification", description: "Verify complete mailing address", severity: "error" },
  { module: "data_integrity", ruleKey: "ssn_tin_format", label: "SSN/TIN Format", description: "Verify SSN or TIN format is valid", severity: "warn" },
  { module: "data_integrity", ruleKey: "duplicate_detection", label: "Duplicate Detection", description: "Check for potential duplicate client records", severity: "warn" },
  { module: "mergers_acquisitions", ruleKey: "account_reregistration", label: "Account Re-registration", description: "Verify account re-registration is complete", severity: "error" },
  { module: "mergers_acquisitions", ruleKey: "advisor_reassignment", label: "Advisor Reassignment", description: "Verify advisor reassignment is complete", severity: "error" },
  { module: "mergers_acquisitions", ruleKey: "client_communication", label: "Client Communication", description: "Verify M&A client communication is sent", severity: "error" },
];
