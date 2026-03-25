// Salesforce SOQL Query Library — 25/25 functions LIVE (100% utilization)
// ──────────────────────────────────────────────────────────────────────────
//
// QUERIES (read):
//   getHouseholdsByAdvisor .............. /api/clients/stats (SF fallback)
//   getPersonAccountsByHousehold ........ /api/clients/[id]/members (SF fallback)
//   getFinancialAccountsByHousehold ..... /api/clients/[id]/portfolio (SF fallback)
//   getTopHoldingsByHousehold ........... /api/clients/[id]/portfolio (SF fallback)
//   getRevenueYTDByHousehold ............ /api/clients/[id]/billing (SF fallback)
//   getAssetsAndLiabilities ............. /api/clients/[id]/balance-sheet (SF fallback)
//   getFinancialGoals ................... data-service.ts → getGoals()
//   getBeneficiaryDesignations .......... /api/clients/[id]/beneficiary-audit
//   getOpenTasksByAdvisor ............... data-service.ts → getTasks()
//   getComplianceTasksByHousehold ....... /api/clients/[id]/compliance-reviews
//   getTasksByHousehold ................. /api/clients/[id]/activity (SF fallback)
//   getUpcomingEvents ................... data-service.ts → getTodaysSchedule/getUpcomingMeetings
//   getEventsByHousehold ................ /api/clients/[id]/activity (SF fallback)
//   getOpenCasesByAdvisor ............... /api/clients/stats (SF fallback)
//   getComplianceCasesByHousehold ....... /api/clients/[id]/compliance-reviews
//   getStaleOpportunities ............... /api/clients/stats (SF fallback)
//   getOpenOpportunities ................ /api/clients/stats (pipeline)
//   getActivityHistory .................. /api/clients/[id]/activity (SF fallback)
//   getDocumentsByHousehold ............. data-service.ts → getDocuments()
//   getAdvisorProfile ................... data-service.ts → getAdvisorProfile()
//
// DML (write):
//   createTask .......................... /api/tasks (POST)
//   createEvent ......................... /api/meetings (POST, SF sync)
//   createCase .......................... /api/cases (POST)
//   createOpportunity ................... /api/opportunities (POST)
//   createInteractionSummary ............ /api/meetings/[id]/summarize (POST)
import { getClient, isSalesforceEnabled } from "./client";
import { logger } from "../../lib/logger";
import { salesforceRateLimiter } from "./rate-limiter";
import { escapeSoqlString, escapeSoqlLimit } from "./soql-escape";
import { assertValidSalesforceId } from "./validate-salesforce-id";
import type {
  SFHouseholdAccount,
  SFPersonAccount,
  SFUser,
  SFEvent,
  SFTask,
  SFCase,
  SFOpportunity,
  SFFinancialAccount,
  SFFinancialHolding,
  SFFinancialGoal,
  SFRevenue,
  SFAssetsAndLiabilities,
  SFFinancialAccountParty,
  SFActivityHistory,
  SFContentDocumentLink,
  SFQueryResult,
  SFWriteResult,
  SFInteractionSummary,
} from "../../types/salesforce-fsc";

async function executeQuery<T>(soql: string): Promise<T[]> {
  if (!isSalesforceEnabled()) return [];
  try {
    const conn = await getClient();
    if (!conn) return [];
    await salesforceRateLimiter.waitForAvailability();
    const result = await conn.query(soql);
    return (result.records || []) as T[];
  } catch (err: unknown) {
    logger.error({ err, soql: soql.substring(0, 200) }, "[SF Queries] Query failed");
    return [];
  }
}

async function createRecord(objectType: string, fields: Record<string, unknown>): Promise<SFWriteResult | null> {
  if (!isSalesforceEnabled()) return null;
  try {
    const conn = await getClient();
    if (!conn) return null;
    await salesforceRateLimiter.waitForAvailability();
    const result = await conn.sobject(objectType).create(fields);
    return result as unknown as SFWriteResult;
  } catch (err: unknown) {
    logger.error({ err, objectType }, "[SF Queries] Create record failed");
    return null;
  }
}

function validateSfId(id: string, context: string): void {
  assertValidSalesforceId(id, context);
}

export async function getHouseholdsByAdvisor(advisorSfId: string): Promise<SFHouseholdAccount[]> {
  validateSfId(advisorSfId, "getHouseholdsByAdvisor.advisorSfId");
  const escaped = escapeSoqlString(advisorSfId);
  return executeQuery<SFHouseholdAccount>(`
    SELECT Id, Name, OwnerId, FinServ__Status__c, FinServ__ReviewFrequency__c,
           FinServ__ServiceModel__c, FinServ__TotalAUMPrimary__c,
           FinServ__TotalNonFinancialAssets__c, FinServ__TotalFinancialAccounts__c,
           FinServ__LastReview__c, FinServ__NextReview__c,
           FinServ__InvestmentObjectives__c, CreatedDate
    FROM Account
    WHERE RecordType.DeveloperName = 'IndustriesHousehold'
      AND OwnerId = '${escaped}'
  `);
}

export async function getPersonAccountsByHousehold(householdId: string): Promise<SFPersonAccount[]> {
  validateSfId(householdId, "getPersonAccountsByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFPersonAccount>(`
    SELECT Id, FirstName, LastName, PersonEmail, Phone,
           PersonMailingCity, PersonMailingState, PersonBirthdate,
           FinServ__RiskTolerance__c, FinServ__InvestmentExperience__c,
           FinServ__Occupation__c, FinServ__EmployerName__c,
           FinServ__LastInteraction__c
    FROM Account
    WHERE RecordType.DeveloperName = 'PersonAccount'
      AND ParentId = '${escaped}'
  `);
}

export async function getFinancialAccountsByHousehold(householdId: string): Promise<SFFinancialAccount[]> {
  validateSfId(householdId, "getFinancialAccountsByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFFinancialAccount>(`
    SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__Balance__c,
           FinServ__Status__c, FinServ__HeldAway__c, FinServ__OwnerType__c,
           FinServ__PrimaryOwner__c, FinServ__Custodian__c, FinServ__OpenDate__c
    FROM FinServ__FinancialAccount__c
    WHERE FinServ__PrimaryOwner__c = '${escaped}'
    ORDER BY FinServ__Balance__c DESC
  `);
}

export async function getTopHoldingsByHousehold(householdId: string, limit = 20): Promise<SFFinancialHolding[]> {
  validateSfId(householdId, "getTopHoldingsByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  const safeLimit = escapeSoqlLimit(limit);
  return executeQuery<SFFinancialHolding>(`
    SELECT Id, Name, FinServ__Symbol__c, FinServ__MarketValue__c,
           FinServ__GainLoss__c, FinServ__Shares__c, FinServ__Price__c,
           FinServ__FinancialAccount__c, FinServ__FinancialAccount__r.Name
    FROM FinServ__FinancialHolding__c
    WHERE FinServ__FinancialAccount__r.FinServ__PrimaryOwner__c = '${escaped}'
    ORDER BY FinServ__MarketValue__c DESC
    LIMIT ${safeLimit}
  `);
}

export async function getRevenueYTDByHousehold(householdId: string): Promise<SFRevenue[]> {
  validateSfId(householdId, "getRevenueYTDByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFRevenue>(`
    SELECT Id, FinServ__Amount__c, FinServ__RevenueDate__c
    FROM FinServ__Revenue__c
    WHERE FinServ__FinancialAccount__r.FinServ__PrimaryOwner__c = '${escaped}'
      AND FinServ__RevenueDate__c = THIS_YEAR
  `);
}

export async function getAssetsAndLiabilities(householdId: string): Promise<SFAssetsAndLiabilities[]> {
  validateSfId(householdId, "getAssetsAndLiabilities.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFAssetsAndLiabilities>(`
    SELECT Id, Name, FinServ__Amount__c, FinServ__AssetsAndLiabilitiesType__c
    FROM FinServ__AssetsAndLiabilities__c
    WHERE FinServ__PrimaryOwner__c = '${escaped}'
  `);
}

export async function getFinancialGoals(householdId: string): Promise<SFFinancialGoal[]> {
  validateSfId(householdId, "getFinancialGoals.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFFinancialGoal>(`
    SELECT Id, Name, FinServ__Type__c, FinServ__TargetValue__c,
           FinServ__ActualValue__c, FinServ__TargetDate__c, FinServ__Status__c
    FROM FinServ__FinancialGoal__c
    WHERE FinServ__PrimaryOwner__c = '${escaped}'
  `);
}

export async function getBeneficiaryDesignations(financialAccountIds: string[]): Promise<SFFinancialAccountParty[]> {
  if (financialAccountIds.length === 0) return [];
  financialAccountIds.forEach((id, i) => validateSfId(id, `getBeneficiaryDesignations[${i}]`));
  const idList = financialAccountIds.map(id => `'${escapeSoqlString(id)}'`).join(", ");
  return executeQuery<SFFinancialAccountParty>(`
    SELECT FinancialAccountId, Role, RelatedAccount.Name
    FROM FinancialAccountParty
    WHERE FinancialAccountId IN (${idList})
      AND Role IN ('Beneficiary', 'Contingent Beneficiary')
  `);
}

export async function getOpenTasksByAdvisor(advisorSfId: string): Promise<SFTask[]> {
  validateSfId(advisorSfId, "getOpenTasksByAdvisor.advisorSfId");
  const escaped = escapeSoqlString(advisorSfId);
  return executeQuery<SFTask>(`
    SELECT Id, Subject, Status, Priority, ActivityDate, Type,
           WhatId, What.Name, WhoId, Who.Name,
           Description, CreatedDate
    FROM Task
    WHERE OwnerId = '${escaped}'
      AND Status != 'Completed'
      AND Status != 'Deferred'
    ORDER BY ActivityDate ASC NULLS LAST
  `);
}

export async function getComplianceTasksByHousehold(householdId: string): Promise<SFTask[]> {
  validateSfId(householdId, "getComplianceTasksByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFTask>(`
    SELECT Id, Subject, Status, ActivityDate, Priority
    FROM Task
    WHERE WhatId = '${escaped}'
      AND (Subject LIKE '%review%'
        OR Subject LIKE '%compliance%'
        OR Subject LIKE '%beneficiary%'
        OR Subject LIKE '%IPS%'
        OR Subject LIKE '%suitability%'
        OR Subject LIKE '%insurance%'
        OR Subject LIKE '%estate%')
  `);
}

export async function getTasksByHousehold(householdId: string, dayRange = 180): Promise<SFTask[]> {
  validateSfId(householdId, "getTasksByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  const safeDayRange = escapeSoqlLimit(dayRange);
  return executeQuery<SFTask>(`
    SELECT Id, Subject, Status, Priority, ActivityDate, Type, CreatedDate
    FROM Task
    WHERE WhatId = '${escaped}'
      AND CreatedDate = LAST_N_DAYS:${safeDayRange}
  `);
}

export async function getUpcomingEvents(advisorSfId: string, daysAhead = 7): Promise<SFEvent[]> {
  validateSfId(advisorSfId, "getUpcomingEvents.advisorSfId");
  const escaped = escapeSoqlString(advisorSfId);
  const safeDays = escapeSoqlLimit(daysAhead);
  return executeQuery<SFEvent>(`
    SELECT Id, Subject, StartDateTime, EndDateTime,
           WhatId, What.Name, Type, Location
    FROM Event
    WHERE OwnerId = '${escaped}'
      AND StartDateTime >= TODAY
      AND StartDateTime <= NEXT_N_DAYS:${safeDays}
    ORDER BY StartDateTime ASC
  `);
}

export async function getEventsByHousehold(householdId: string, dayRange = 180): Promise<SFEvent[]> {
  validateSfId(householdId, "getEventsByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  const safeDayRange = escapeSoqlLimit(dayRange);
  return executeQuery<SFEvent>(`
    SELECT Id, Subject, StartDateTime, EndDateTime, Type
    FROM Event
    WHERE WhatId = '${escaped}'
      AND StartDateTime >= LAST_N_DAYS:${safeDayRange}
    ORDER BY StartDateTime DESC
  `);
}

export async function getOpenCasesByAdvisor(advisorSfId: string): Promise<SFCase[]> {
  validateSfId(advisorSfId, "getOpenCasesByAdvisor.advisorSfId");
  const escaped = escapeSoqlString(advisorSfId);
  return executeQuery<SFCase>(`
    SELECT Id, Subject, Status, Priority, Type,
           CreatedDate, AccountId, Account.Name
    FROM Case
    WHERE OwnerId = '${escaped}'
      AND IsClosed = false
    ORDER BY Priority DESC, CreatedDate ASC
  `);
}

export async function getComplianceCasesByHousehold(householdId: string): Promise<SFCase[]> {
  validateSfId(householdId, "getComplianceCasesByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFCase>(`
    SELECT Id, Subject, Status, Type, Priority, CreatedDate, ClosedDate
    FROM Case
    WHERE AccountId = '${escaped}'
      AND (Type = 'Compliance Review'
        OR Type = 'Document Request'
        OR Type = 'Beneficiary Update')
  `);
}

export async function getStaleOpportunities(advisorSfId: string): Promise<SFOpportunity[]> {
  validateSfId(advisorSfId, "getStaleOpportunities.advisorSfId");
  const escaped = escapeSoqlString(advisorSfId);
  return executeQuery<SFOpportunity>(`
    SELECT Id, Name, StageName, Amount, CloseDate,
           AccountId, Account.Name, LastActivityDate
    FROM Opportunity
    WHERE OwnerId = '${escaped}'
      AND IsClosed = false
      AND LastActivityDate < LAST_N_DAYS:14
    ORDER BY Amount DESC
  `);
}

export async function getOpenOpportunities(advisorSfId: string): Promise<SFOpportunity[]> {
  validateSfId(advisorSfId, "getOpenOpportunities.advisorSfId");
  const escaped = escapeSoqlString(advisorSfId);
  return executeQuery<SFOpportunity>(`
    SELECT Id, Name, StageName, Amount, CloseDate, Probability,
           AccountId, Account.Name, Type, LastActivityDate, Description
    FROM Opportunity
    WHERE OwnerId = '${escaped}'
      AND IsClosed = false
    ORDER BY CloseDate ASC
  `);
}

export async function getActivityHistory(householdId: string, limit = 50): Promise<SFActivityHistory[]> {
  validateSfId(householdId, "getActivityHistory.householdId");
  const escaped = escapeSoqlString(householdId);
  const safeLimit = escapeSoqlLimit(limit);
  return executeQuery<SFActivityHistory>(`
    SELECT Id, Subject, ActivityDate, ActivityType, Status,
           CallType, CallDurationInSeconds
    FROM ActivityHistory
    WHERE AccountId = '${escaped}'
    ORDER BY ActivityDate DESC
    LIMIT ${safeLimit}
  `);
}

export async function getDocumentsByHousehold(householdId: string): Promise<SFContentDocumentLink[]> {
  validateSfId(householdId, "getDocumentsByHousehold.householdId");
  const escaped = escapeSoqlString(householdId);
  return executeQuery<SFContentDocumentLink>(`
    SELECT ContentDocument.Id, ContentDocument.Title,
           ContentDocument.FileType, ContentDocument.CreatedDate
    FROM ContentDocumentLink
    WHERE LinkedEntityId = '${escaped}'
  `);
}

export async function getAdvisorProfile(advisorSfId: string): Promise<SFUser | null> {
  validateSfId(advisorSfId, "getAdvisorProfile.advisorSfId");
  const escaped = escapeSoqlString(advisorSfId);
  const results = await executeQuery<SFUser>(`
    SELECT Id, Name, FirstName, LastName, Email, Phone, Title, SmallPhotoUrl, IsActive
    FROM User
    WHERE Id = '${escaped}'
  `);
  return results[0] || null;
}

export async function createTask(fields: Record<string, unknown>): Promise<SFWriteResult | null> {
  return createRecord("Task", fields);
}

export async function createEvent(fields: Record<string, unknown>): Promise<SFWriteResult | null> {
  return createRecord("Event", fields);
}

export async function createCase(fields: Record<string, unknown>): Promise<SFWriteResult | null> {
  return createRecord("Case", fields);
}

export async function createOpportunity(fields: Record<string, unknown>): Promise<SFWriteResult | null> {
  return createRecord("Opportunity", fields);
}

export async function createInteractionSummary(fields: Record<string, unknown>): Promise<SFWriteResult | null> {
  return createRecord("FinServ__InteractionSummary__c", fields);
}
