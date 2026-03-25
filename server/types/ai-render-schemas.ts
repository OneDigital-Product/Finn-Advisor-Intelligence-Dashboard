import { z } from "zod";

export const ClientRelationshipIntelligenceSchema = z.object({
  householdName: z.string().nullable().describe("Household display name"),
  primaryContactName: z.string().nullable().describe("Primary contact person in the household"),
  relationshipHealthScore: z.number().min(0).max(100).nullable().describe("Overall relationship health score from 0 (critical) to 100 (thriving)"),
  healthLevel: z.enum(["thriving", "healthy", "attention-needed", "at-risk", "critical"]).nullable().describe("Categorical health level derived from the score"),
  activityAnalysis: z.object({
    totalActivitiesLast90Days: z.number().nullable().describe("Total activities (calls, meetings, emails) in the last 90 days"),
    meetingsCompleted: z.number().nullable().describe("Number of meetings completed in the last 90 days"),
    callsMade: z.number().nullable().describe("Number of calls made in the last 90 days"),
    emailsSent: z.number().nullable().describe("Number of emails sent in the last 90 days"),
    lastContactDate: z.string().nullable().describe("ISO date of the most recent contact with this household"),
    daysSinceLastContact: z.number().nullable().describe("Days elapsed since the last contact"),
    contactFrequencyTrend: z.enum(["increasing", "stable", "decreasing", "dormant"]).nullable().describe("Trend direction for contact frequency"),
    averageDaysBetweenContacts: z.number().nullable().describe("Average number of days between contacts over the last 90 days"),
  }).nullable().describe("Analysis of recent activity volume and patterns"),
  taskAnalysis: z.object({
    openTasksCount: z.number().nullable().describe("Number of currently open tasks"),
    overdueTasksCount: z.number().nullable().describe("Number of tasks past their due date"),
    highPriorityOverdue: z.array(z.object({ subject: z.string().nullable().describe("Task subject"), dueDate: z.string().nullable().describe("ISO due date"), status: z.string().nullable().describe("Current task status") })).nullable().describe("List of high-priority overdue tasks"),
    taskCompletionRate: z.number().min(0).max(1).nullable().describe("Task completion rate from 0 to 1"),
  }).nullable().describe("Open and overdue task analysis"),
  caseAnalysis: z.object({
    openCasesCount: z.number().nullable().describe("Number of currently open cases"),
    averageResolutionDays: z.number().nullable().describe("Average days to resolve a case"),
    oldestOpenCase: z.object({ subject: z.string().nullable().describe("Case subject"), createdDate: z.string().nullable().describe("ISO creation date"), daysSinceCreated: z.number().nullable().describe("Days since the case was created") }).nullable().describe("Details of the oldest unresolved case"),
  }).nullable().describe("Open case analysis"),
  opportunityAnalysis: z.object({
    activeOpportunities: z.array(z.object({ name: z.string().nullable().describe("Opportunity name"), stage: z.string().nullable().describe("Pipeline stage"), amount: z.number().nullable().describe("Dollar amount"), closeDate: z.string().nullable().describe("ISO expected close date"), probability: z.number().min(0).max(100).nullable().describe("Win probability 0-100") })).nullable().describe("List of active opportunities"),
    totalPipelineValue: z.number().nullable().describe("Total dollar value of the active pipeline"),
    staleOpportunities: z.array(z.object({ name: z.string().nullable().describe("Opportunity name"), daysSinceActivity: z.number().nullable().describe("Days since last activity") })).nullable().describe("Opportunities with no recent activity"),
  }).nullable().describe("Active opportunity pipeline analysis"),
  goalAlignment: z.object({
    totalGoals: z.number().nullable().describe("Total number of financial goals"),
    onTrackGoals: z.number().nullable().describe("Goals that are on track"),
    offTrackGoals: z.number().nullable().describe("Goals that are off track"),
    nextMilestone: z.object({ goalName: z.string().nullable().describe("Goal name"), targetDate: z.string().nullable().describe("ISO target date"), currentProgress: z.number().min(0).max(1).nullable().describe("Progress from 0 to 1") }).nullable().describe("The next approaching goal milestone"),
  }).nullable().describe("Financial goal alignment summary"),
  recommendedActions: z.array(z.object({
    action: z.string().nullable().describe("Specific action to take"),
    priority: z.enum(["critical", "high", "medium", "low"]).nullable().describe("Action priority level"),
    category: z.enum(["outreach", "follow-up", "planning", "compliance", "opportunity"]).nullable().describe("Category of the action"),
    sfObjectToUpdate: z.enum(["Task", "Event", "Case", "Opportunity"]).nullable().describe("Salesforce object type to create or update"),
    reasoning: z.string().nullable().describe("Why this action is recommended"),
  })).nullable().describe("Prioritized list of recommended next actions"),
  riskSignals: z.array(z.object({
    signal: z.string().nullable().describe("Description of the risk signal"),
    severity: z.enum(["low", "medium", "high"]).nullable().describe("Signal severity level"),
    source: z.string().nullable().describe("Data source that triggered this signal"),
    confidence: z.number().min(0).max(1).nullable().describe("Confidence level from 0 to 1"),
  })).nullable().describe("Detected risk signals for this relationship"),
  executiveSummary: z.string().nullable().describe("2-3 sentence executive summary of the relationship health"),
});
export type ClientRelationshipIntelligence = z.infer<typeof ClientRelationshipIntelligenceSchema>;

export const TranscriptToSalesforceSchema = z.object({
  meetingMetadata: z.object({
    title: z.string().nullable().describe("Meeting title"),
    date: z.string().nullable().describe("ISO date of the meeting"),
    duration: z.string().nullable().describe("Meeting duration, e.g. '45 minutes'"),
    attendees: z.array(z.string()).nullable().describe("List of meeting attendees"),
    householdId: z.string().nullable().describe("Salesforce household account ID"),
    meetingType: z.enum(["Annual Review", "Quarterly Review", "Ad Hoc", "Onboarding", "Tax Planning", "Estate Review", "Insurance Review", "Portfolio Check-In"]).nullable().describe("Type of meeting"),
  }).nullable().describe("Meeting metadata extracted from the transcript"),
  interactionSummary: z.object({
    summary: z.string().nullable().describe("Brief summary of the meeting"),
    clientSentiment: z.enum(["positive", "neutral", "negative", "mixed"]).nullable().describe("Overall client sentiment during the meeting"),
    keyTopics: z.array(z.string()).nullable().describe("Key topics discussed"),
    clientRequests: z.array(z.string()).nullable().describe("Specific requests made by the client"),
    advisorCommitments: z.array(z.string()).nullable().describe("Commitments made by the advisor"),
  }).nullable().describe("Summary of the interaction"),
  salesforceActions: z.object({
    tasks: z.array(z.object({
      Subject: z.string().nullable().describe("Task subject"), Description: z.string().nullable().describe("Task description"), ActivityDate: z.string().nullable().describe("ISO due date"),
      Priority: z.enum(["High", "Normal", "Low"]).nullable().describe("Task priority"), Status: z.literal("Not Started").nullable().describe("Initial task status"),
      Type: z.enum(["Call", "Email", "Meeting", "Other"]).nullable().describe("Task type"),
      WhatId: z.string().nullable().describe("Related Salesforce record ID"), OwnerId: z.string().nullable().describe("Assigned owner ID"),
      category: z.enum(["planning", "compliance", "administrative", "follow-up", "opportunity"]).nullable().describe("Task category"),
    })).nullable().describe("Tasks to create in Salesforce"),
    events: z.array(z.object({
      Subject: z.string().nullable().describe("Event subject"), Description: z.string().nullable().describe("Event description"), StartDateTime: z.string().nullable().describe("ISO start datetime"),
      EndDateTime: z.string().nullable().describe("ISO end datetime"), WhatId: z.string().nullable().describe("Related record ID"), Location: z.string().nullable().describe("Event location"), Type: z.string().nullable().describe("Event type"),
    })).nullable().describe("Events to create in Salesforce"),
    cases: z.array(z.object({
      Subject: z.string().nullable().describe("Case subject"), Description: z.string().nullable().describe("Case description"),
      Priority: z.enum(["High", "Medium", "Low"]).nullable().describe("Case priority"),
      Type: z.enum(["Compliance Review", "Document Request", "Service Request", "Beneficiary Update"]).nullable().describe("Case type"),
      AccountId: z.string().nullable().describe("Account ID"), Origin: z.literal("Meeting").nullable().describe("Case origin"),
    })).nullable().describe("Cases to create in Salesforce"),
    opportunities: z.array(z.object({
      Name: z.string().nullable().describe("Opportunity name"), StageName: z.string().nullable().describe("Pipeline stage"), Amount: z.number().nullable().describe("Dollar amount"), CloseDate: z.string().nullable().describe("ISO expected close date"),
      AccountId: z.string().nullable().describe("Account ID"), Type: z.enum(["New Business", "Cross-Sell", "Referral", "Retention"]).nullable().describe("Opportunity type"),
      Description: z.string().nullable().describe("Opportunity description"),
    })).nullable().describe("Opportunities to create in Salesforce"),
  }).nullable().describe("Salesforce objects to create from this meeting"),
  complianceFlags: z.array(z.object({
    item: z.string().nullable().describe("Compliance item identified"),
    sfComplianceCategory: z.enum(["risk_profile_review", "ips_review", "estate_plan_review", "suitability_review", "concentrated_position", "beneficiary_update", "insurance_review"]).nullable().describe("Compliance category"),
    urgency: z.enum(["immediate", "within-30-days", "next-review"]).nullable().describe("Urgency level"),
    createCase: z.boolean().nullable().describe("Whether to create a Salesforce case"),
  })).nullable().describe("Compliance flags identified during the meeting"),
  followUpSchedule: z.object({
    nextContactDate: z.string().nullable().describe("ISO date for next contact"), nextContactType: z.enum(["Meeting", "Call", "Email"]).nullable().describe("Type of next contact"),
    createEvent: z.boolean().nullable().describe("Whether to create a Salesforce event"), subject: z.string().nullable().describe("Subject for the follow-up"),
  }).nullable().describe("Follow-up schedule"),
});
export type TranscriptToSalesforce = z.infer<typeof TranscriptToSalesforceSchema>;

export const SFEngagementScoringSchema = z.object({
  clientName: z.string().nullable().describe("Client display name"), householdId: z.string().nullable().describe("Salesforce household account ID"),
  segment: z.enum(["A", "B", "C", "D"]).nullable().describe("Client segment classification"),
  compositeScore: z.number().min(0).max(100).nullable().describe("Composite engagement score from 0 to 100"),
  frequency: z.number().min(0).max(100).nullable().describe("Contact frequency sub-score"), recency: z.number().min(0).max(100).nullable().describe("Recency of last contact sub-score"),
  diversity: z.number().min(0).max(100).nullable().describe("Channel diversity sub-score"), responsiveness: z.number().min(0).max(100).nullable().describe("Client responsiveness sub-score"),
  accountStickiness: z.number().min(0).max(100).nullable().describe("Account stickiness sub-score"),
  trend: z.enum(["improving", "declining", "stable"]).nullable().describe("Engagement trend direction"),
  riskOfChurn: z.enum(["low", "moderate", "high", "critical"]).nullable().describe("Risk of client churn"),
  sfActivityBreakdown: z.object({
    meetingsLast90Days: z.number().nullable().describe("Meetings in the last 90 days"), callsLast90Days: z.number().nullable().describe("Calls in the last 90 days"), emailsLast90Days: z.number().nullable().describe("Emails in the last 90 days"),
    tasksCompletedByClient: z.number().nullable().describe("Tasks completed by the client"), casesOpenedByClient: z.number().nullable().describe("Cases opened by the client"),
    documentsSignedLast90Days: z.number().nullable().describe("Documents signed in the last 90 days"), portalLoginsLast90Days: z.number().nullable().describe("Portal logins in the last 90 days"),
    lastMeetingDate: z.string().nullable().describe("ISO date of last meeting"), lastCallDate: z.string().nullable().describe("ISO date of last call"), lastEmailDate: z.string().nullable().describe("ISO date of last email"),
  }).nullable().describe("Breakdown of Salesforce activity data"),
  signals: z.array(z.object({
    type: z.enum(["Engagement Drop", "Positive Momentum", "Milestone Approaching", "Compliance Gap", "Service Issue", "Referral Potential", "Churn Risk"]).nullable().describe("Type of engagement signal detected"),
    description: z.string().nullable().describe("Description of the signal"), sfSourceObject: z.string().nullable().describe("Salesforce object type that sourced this signal"), sfSourceRecordId: z.string().nullable().describe("Salesforce record ID"),
    confidence: z.number().min(0).max(1).nullable().describe("Confidence level from 0 to 1"), detectedDate: z.string().nullable().describe("ISO date when signal was detected"),
  })).nullable().describe("Detected engagement signals"),
  recommendedActions: z.array(z.object({
    action: z.string().nullable().describe("Action description"), priority: z.enum(["critical", "high", "medium", "low"]).nullable().describe("Action priority"),
    category: z.enum(["outreach", "planning", "compliance", "opportunity", "retention"]).nullable().describe("Action category"),
    sfActionType: z.enum(["Create Task", "Create Event", "Create Case", "Update Opportunity", "Send Email"]).nullable().describe("Salesforce action to take"),
    sfPayload: z.object({ objectType: z.enum(["Task", "Event", "Case", "Opportunity"]).nullable().describe("Salesforce object type"), fields: z.record(z.string()).nullable().describe("Key-value field map for the Salesforce record") }).nullable().describe("Salesforce payload for the action"),
  })).nullable().describe("Recommended engagement actions"),
  reasoning: z.string().nullable().describe("Overall reasoning for the engagement assessment"),
});
export type SFEngagementScoring = z.infer<typeof SFEngagementScoringSchema>;

export const SFComplianceGapSchema = z.object({
  householdName: z.string().nullable().describe("Household display name"), householdId: z.string().nullable().describe("Salesforce household account ID"),
  overallComplianceScore: z.number().min(0).max(100).nullable().describe("Overall compliance score from 0 to 100"),
  status: z.enum(["compliant", "attention-needed", "non-compliant"]).nullable().describe("Overall compliance status"),
  categories: z.array(z.object({
    key: z.enum(["risk_profile_review", "ips_review", "estate_plan_review", "suitability_review", "concentrated_position", "beneficiary_update", "insurance_review"]).nullable().describe("Compliance category key"),
    label: z.string().nullable().describe("Human-readable label for the category"),
    status: z.enum(["current", "expiring_soon", "overdue", "missing", "not_applicable"]).nullable().describe("Current status of this compliance category"),
    lastCompletedDate: z.string().nullable().describe("ISO date when this was last completed"), nextDueDate: z.string().nullable().describe("ISO date when next review is due"),
    daysUntilDue: z.number().nullable().describe("Days until the next due date"), daysOverdue: z.number().nullable().describe("Days past the due date, or null if not overdue"),
    assignedTo: z.string().nullable().describe("Person assigned to this compliance item"), sfDocumentOnFile: z.boolean().nullable().describe("Whether a document is on file in Salesforce"),
    sfTaskId: z.string().nullable().describe("Salesforce task ID if exists"), sfCaseId: z.string().nullable().describe("Salesforce case ID if exists"),
    findings: z.string().nullable().describe("Summary of findings for this category"),
  })).nullable().describe("Compliance categories with status and findings"),
  documentAudit: z.array(z.object({
    documentType: z.string().nullable().describe("Type of document"), status: z.enum(["on-file", "expired", "missing", "pending-signature"]).nullable().describe("Document status"),
    sfContentDocumentId: z.string().nullable().describe("Salesforce content document ID"), uploadDate: z.string().nullable().describe("ISO date of document upload"), expirationDate: z.string().nullable().describe("ISO date of document expiration"),
  })).nullable().describe("Audit of required documents"),
  beneficiaryAudit: z.array(z.object({
    accountName: z.string().nullable().describe("Account name"), accountType: z.string().nullable().describe("Account type"), sfFinancialAccountId: z.string().nullable().describe("Salesforce financial account ID"),
    primaryBeneficiary: z.string().nullable().describe("Primary beneficiary name"), contingentBeneficiary: z.string().nullable().describe("Contingent beneficiary name"),
    designationStatus: z.enum(["complete", "incomplete", "missing", "needs-update"]).nullable().describe("Beneficiary designation status"),
    lastReviewedDate: z.string().nullable().describe("ISO date of last beneficiary review"),
  })).nullable().describe("Beneficiary designation audit"),
  urgentActions: z.array(z.object({
    action: z.string().nullable().describe("Action to take"), category: z.string().nullable().describe("Compliance category"), dueDate: z.string().nullable().describe("ISO date when action is due"),
    priority: z.enum(["critical", "high", "medium"]).nullable().describe("Action priority"),
    sfActionType: z.enum(["Create Task", "Create Case", "Update Record"]).nullable().describe("Salesforce action type"),
    sfPayload: z.record(z.string()).nullable().describe("Salesforce payload fields"),
  })).nullable().describe("Urgent compliance actions required"),
  regulatoryNotes: z.array(z.string()).nullable().describe("Regulatory notes and observations"),
});
export type SFComplianceGap = z.infer<typeof SFComplianceGapSchema>;

export const SFHouseholdFinancialSnapshotSchema = z.object({
  household: z.object({
    name: z.string().nullable().describe("Household name"), householdId: z.string().nullable().describe("Salesforce household ID"), primaryContact: z.string().nullable().describe("Primary contact name"),
    segment: z.enum(["A", "B", "C", "D"]).nullable().describe("Client segment"), status: z.string().nullable().describe("Account status"), serviceModel: z.string().nullable().describe("Service model tier"),
    reviewFrequency: z.string().nullable().describe("Review frequency"), lastReviewDate: z.string().nullable().describe("ISO date of last review"), nextReviewDate: z.string().nullable().describe("ISO date of next review"),
  }).nullable().describe("Household account details"),
  members: z.array(z.object({
    name: z.string().nullable().describe("Member name"), personAccountId: z.string().nullable().describe("Salesforce person account ID"), relationship: z.string().nullable().describe("Relationship to primary"),
    age: z.number().nullable().describe("Member age"), occupation: z.string().nullable().describe("Occupation"), riskTolerance: z.string().nullable().describe("Risk tolerance level"),
  })).nullable().describe("Household members"),
  financialSummary: z.object({
    totalAUM: z.number().nullable().describe("Total assets under management"),
    totalAccounts: z.number().nullable().describe("Total number of accounts"),
    accountsByType: z.array(z.object({ type: z.string().nullable(), count: z.number().nullable(), totalBalance: z.number().nullable() })).nullable().describe("Account breakdown by type"),
    totalNonFinancialAssets: z.number().nullable().describe("Total non-financial assets"), totalLiabilities: z.number().nullable().describe("Total liabilities"),
    estimatedNetWorth: z.number().nullable().describe("Estimated net worth"),
    revenueYTD: z.number().nullable().describe("Year-to-date revenue"),
  }).nullable().describe("Financial summary aggregates"),
  accounts: z.array(z.object({
    sfId: z.string().nullable().describe("Salesforce account ID"), name: z.string().nullable().describe("Account name"), type: z.string().nullable().describe("Account type"), balance: z.number().nullable().describe("Account balance"), status: z.string().nullable().describe("Account status"),
    custodian: z.string().nullable().describe("Custodian name"), primaryOwner: z.string().nullable().describe("Primary owner name"), beneficiaryDesignated: z.boolean().nullable().describe("Whether beneficiary is designated"), holdingsCount: z.number().nullable().describe("Number of holdings"),
  })).nullable().describe("Financial accounts list"),
  topHoldings: z.array(z.object({
    sfId: z.string().nullable().describe("Salesforce holding ID"), name: z.string().nullable().describe("Holding name"), symbol: z.string().nullable().describe("Ticker symbol"),
    marketValue: z.number().nullable().describe("Current market value"), gainLoss: z.number().nullable().describe("Unrealized gain/loss"), weight: z.number().nullable().describe("Portfolio weight as decimal"), accountName: z.string().nullable().describe("Account this holding belongs to"),
  })).nullable().describe("Top holdings by market value"),
  goals: z.array(z.object({
    name: z.string().nullable().describe("Goal name"), type: z.string().nullable().describe("Goal type"), targetValue: z.number().nullable().describe("Target dollar value"), currentValue: z.number().nullable().describe("Current dollar value"),
    progressPct: z.number().min(0).max(1).nullable().describe("Progress percentage from 0 to 1"), targetDate: z.string().nullable().describe("ISO target date"), status: z.string().nullable().describe("Goal status"),
  })).nullable().describe("Financial goals"),
  aiInsights: z.array(z.object({
    insight: z.string().nullable().describe("Insight description"), category: z.enum(["opportunity", "risk", "planning", "compliance"]).nullable().describe("Insight category"),
    priority: z.enum(["high", "medium", "low"]).nullable().describe("Insight priority"), relatedSFObject: z.string().nullable().describe("Related Salesforce object type"), relatedSFRecordId: z.string().nullable().describe("Related Salesforce record ID"),
  })).nullable().describe("AI-generated insights"),
});
export type SFHouseholdFinancialSnapshot = z.infer<typeof SFHouseholdFinancialSnapshotSchema>;

export const SFActionItemElementSchema = z.object({
  rank: z.number().nullable().describe("Priority rank order (1 = highest)"),
  action: z.string().nullable().describe("Action description"), clientName: z.string().nullable().describe("Client name"), householdId: z.string().nullable().describe("Salesforce household ID"),
  priority: z.enum(["critical", "high", "medium", "low"]).nullable().describe("Action priority level"),
  category: z.enum(["outreach", "compliance", "follow-up", "planning", "opportunity", "administrative"]).nullable().describe("Action category"),
  dueDate: z.string().nullable().describe("ISO due date"), daysOverdue: z.number().nullable().describe("Days past the due date, or null if not overdue"),
  sfSourceObject: z.enum(["Task", "Case", "Event", "Opportunity"]).nullable().describe("Salesforce object type that sourced this action"),
  sfSourceRecordId: z.string().nullable().describe("Salesforce record ID"), aiReasoning: z.string().nullable().describe("AI reasoning for this prioritization"),
  estimatedImpact: z.enum(["revenue", "retention", "compliance", "service", "relationship"]).nullable().describe("Expected impact category"),
});
export type SFActionItemElement = z.infer<typeof SFActionItemElementSchema>;

export const SFActionQueueSchema = z.object({
  totalPendingActions: z.number().nullable().describe("Total number of pending actions"), criticalCount: z.number().nullable().describe("Number of critical actions"), highCount: z.number().nullable().describe("Number of high priority actions"),
  mediumCount: z.number().nullable().describe("Number of medium priority actions"), lowCount: z.number().nullable().describe("Number of low priority actions"),
  actions: z.array(SFActionItemElementSchema).nullable().describe("Prioritized list of actions"),
  dailyPriorities: z.object({
    morning: z.array(z.string()).nullable().describe("Actions to complete this morning"),
    afternoon: z.array(z.string()).nullable().describe("Actions to complete this afternoon"), thisWeek: z.array(z.string()).nullable().describe("Actions to complete this week"),
  }).nullable().describe("Actions organized by time of day"),
  bookHealthSummary: z.string().nullable().describe("Summary of overall book of business health"),
});
export type SFActionQueue = z.infer<typeof SFActionQueueSchema>;

export interface SFInputQuery {
  label: string;
  soql: string;
  sfObject: string;
  description: string;
}

export interface SFWriteBackAction {
  sfObject: string;
  operation: "create" | "update" | "upsert";
  fieldMapping: Record<string, string>;
  description: string;
}

export interface AIRenderSchemaConfig<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  schema: T;
  pattern: "A" | "B" | "C";
  temperature: number;
  sfInputQueries: SFInputQuery[];
  writeBackActions: SFWriteBackAction[];
}

export const SF_JSON_RENDER_SCHEMAS: Record<string, AIRenderSchemaConfig> = {
  clientRelationshipIntelligence: {
    name: "Client Relationship Intelligence",
    schema: ClientRelationshipIntelligenceSchema,
    pattern: "A",
    temperature: 0.4,
    sfInputQueries: [
      { label: "Household Details", soql: "SELECT Id, Name, FinServ__TotalAUMPrimary__c, FinServ__ServiceModel__c, FinServ__LastReview__c FROM Account WHERE Id = :householdId AND RecordType.DeveloperName = 'IndustriesHousehold'", sfObject: "Account", description: "Load the household account record for AUM and review dates" },
      { label: "Person Accounts", soql: "SELECT Id, FirstName, LastName, PersonEmail, PersonBirthdate, FinServ__RiskTolerance__c FROM Account WHERE ParentId = :householdId AND IsPersonAccount = true", sfObject: "Account", description: "Load all person accounts in the household" },
      { label: "Recent Activities", soql: "SELECT Id, Subject, ActivityDate, Type, Status FROM Task WHERE WhatId = :householdId AND ActivityDate >= LAST_N_DAYS:90", sfObject: "Task", description: "Load tasks from last 90 days for activity analysis" },
      { label: "Open Cases", soql: "SELECT Id, Subject, Status, Priority, CreatedDate FROM Case WHERE AccountId = :householdId AND IsClosed = false", sfObject: "Case", description: "Load open cases for case analysis" },
      { label: "Active Opportunities", soql: "SELECT Id, Name, StageName, Amount, CloseDate, Probability FROM Opportunity WHERE AccountId = :householdId AND IsClosed = false", sfObject: "Opportunity", description: "Load active opportunities" },
      { label: "Financial Goals", soql: "SELECT Id, Name, FinServ__TargetValue__c, FinServ__ActualValue__c, FinServ__TargetDate__c, FinServ__Status__c FROM FinServ__FinancialGoal__c WHERE FinServ__Account__c = :householdId", sfObject: "FinServ__FinancialGoal__c", description: "Load financial goals for alignment scoring" },
    ],
    writeBackActions: [
      { sfObject: "Task", operation: "create", fieldMapping: { Subject: "recommendedActions[].action", Priority: "recommendedActions[].priority", Type: "recommendedActions[].category", WhatId: "householdId" }, description: "Create tasks from recommended actions" },
    ],
  },
  transcriptToSalesforce: {
    name: "Meeting Transcript → Salesforce Actions",
    schema: TranscriptToSalesforceSchema,
    pattern: "A",
    temperature: 0.3,
    sfInputQueries: [
      { label: "Household Context", soql: "SELECT Id, Name, FinServ__TotalAUMPrimary__c, FinServ__ServiceModel__c FROM Account WHERE Id = :householdId", sfObject: "Account", description: "Load household context for the meeting" },
      { label: "Existing Open Tasks", soql: "SELECT Id, Subject, Status, ActivityDate FROM Task WHERE WhatId = :householdId AND Status != 'Completed' ORDER BY ActivityDate ASC", sfObject: "Task", description: "Load existing open tasks to avoid duplicates" },
      { label: "Recent Events", soql: "SELECT Id, Subject, StartDateTime, EndDateTime FROM Event WHERE WhatId = :householdId AND StartDateTime >= LAST_N_DAYS:30", sfObject: "Event", description: "Load recent events for de-duplication" },
    ],
    writeBackActions: [
      { sfObject: "Task", operation: "create", fieldMapping: { Subject: "salesforceActions.tasks[].Subject", Description: "salesforceActions.tasks[].Description", ActivityDate: "salesforceActions.tasks[].ActivityDate", Priority: "salesforceActions.tasks[].Priority", Status: "salesforceActions.tasks[].Status", WhatId: "salesforceActions.tasks[].WhatId", OwnerId: "salesforceActions.tasks[].OwnerId" }, description: "Create follow-up tasks from the meeting" },
      { sfObject: "Event", operation: "create", fieldMapping: { Subject: "salesforceActions.events[].Subject", Description: "salesforceActions.events[].Description", StartDateTime: "salesforceActions.events[].StartDateTime", EndDateTime: "salesforceActions.events[].EndDateTime", WhatId: "salesforceActions.events[].WhatId" }, description: "Create follow-up events from the meeting" },
      { sfObject: "Case", operation: "create", fieldMapping: { Subject: "salesforceActions.cases[].Subject", Description: "salesforceActions.cases[].Description", Priority: "salesforceActions.cases[].Priority", AccountId: "salesforceActions.cases[].AccountId" }, description: "Create cases for service requests or compliance items from the meeting" },
      { sfObject: "Opportunity", operation: "create", fieldMapping: { Name: "salesforceActions.opportunities[].Name", StageName: "salesforceActions.opportunities[].StageName", Amount: "salesforceActions.opportunities[].Amount", CloseDate: "salesforceActions.opportunities[].CloseDate", AccountId: "salesforceActions.opportunities[].AccountId" }, description: "Create opportunities identified during the meeting" },
    ],
  },
  engagementScoring: {
    name: "Client Engagement Scoring (Salesforce Exclusive)",
    schema: SFEngagementScoringSchema,
    pattern: "A",
    temperature: 0.4,
    sfInputQueries: [
      { label: "Person Account", soql: "SELECT Id, FirstName, LastName, FinServ__RiskTolerance__c, FinServ__LastInteraction__c FROM Account WHERE ParentId = :householdId AND IsPersonAccount = true", sfObject: "Account", description: "Load person accounts for engagement context" },
      { label: "Activities Last 90 Days", soql: "SELECT Id, Subject, Type, Status, ActivityDate FROM Task WHERE WhatId = :householdId AND ActivityDate >= LAST_N_DAYS:90", sfObject: "Task", description: "Load task activities for scoring" },
      { label: "Events Last 90 Days", soql: "SELECT Id, Subject, Type, StartDateTime FROM Event WHERE WhatId = :householdId AND StartDateTime >= LAST_N_DAYS:90", sfObject: "Event", description: "Load event history for scoring" },
      { label: "Cases Opened", soql: "SELECT Id, Subject, Status, CreatedDate FROM Case WHERE AccountId = :householdId AND CreatedDate >= LAST_N_DAYS:90", sfObject: "Case", description: "Load cases for engagement scoring" },
    ],
    writeBackActions: [
      { sfObject: "Task", operation: "create", fieldMapping: { Subject: "recommendedActions[].action", Priority: "recommendedActions[].priority", WhatId: "householdId" }, description: "Create engagement follow-up tasks" },
    ],
  },
  complianceGapAnalysis: {
    name: "Compliance Gap Analysis (Salesforce Exclusive)",
    schema: SFComplianceGapSchema,
    pattern: "A",
    temperature: 0.3,
    sfInputQueries: [
      { label: "Household", soql: "SELECT Id, Name, FinServ__TotalAUMPrimary__c, FinServ__ServiceModel__c, FinServ__LastReview__c, FinServ__NextReview__c FROM Account WHERE Id = :householdId", sfObject: "Account", description: "Load household for compliance context" },
      { label: "Financial Accounts", soql: "SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__Balance__c, FinServ__Status__c FROM FinServ__FinancialAccount__c WHERE FinServ__PrimaryOwner__c IN (SELECT Id FROM Account WHERE ParentId = :householdId AND IsPersonAccount = true)", sfObject: "FinServ__FinancialAccount__c", description: "Load accounts for beneficiary audit" },
      { label: "Compliance Tasks", soql: "SELECT Id, Subject, Status, ActivityDate, Type FROM Task WHERE WhatId = :householdId AND Type IN ('Compliance Review', 'Suitability Review', 'Risk Profile Review')", sfObject: "Task", description: "Load compliance-related tasks" },
      { label: "Compliance Cases", soql: "SELECT Id, Subject, Status, Type, CreatedDate FROM Case WHERE AccountId = :householdId AND Type IN ('Compliance Review', 'Document Request', 'Beneficiary Update')", sfObject: "Case", description: "Load compliance-related cases" },
      { label: "Documents", soql: "SELECT Id, Title, FileType, CreatedDate FROM ContentDocument WHERE Id IN (SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :householdId)", sfObject: "ContentDocument", description: "Load documents on file for audit" },
    ],
    writeBackActions: [
      { sfObject: "Task", operation: "create", fieldMapping: { Subject: "urgentActions[].action", Priority: "urgentActions[].priority", ActivityDate: "urgentActions[].dueDate", WhatId: "householdId" }, description: "Create compliance remediation tasks" },
      { sfObject: "Case", operation: "create", fieldMapping: { Subject: "urgentActions[].action", Priority: "urgentActions[].priority", AccountId: "householdId" }, description: "Create compliance cases for urgent issues" },
    ],
  },
  householdFinancialSnapshot: {
    name: "Household Financial Snapshot (Salesforce Exclusive)",
    schema: SFHouseholdFinancialSnapshotSchema,
    pattern: "B",
    temperature: 0.3,
    sfInputQueries: [
      { label: "Household", soql: "SELECT Id, Name, FinServ__TotalAUMPrimary__c, FinServ__Status__c, FinServ__ServiceModel__c, FinServ__ReviewFrequency__c, FinServ__LastReview__c, FinServ__NextReview__c, FinServ__TotalFinancialAccounts__c, FinServ__TotalNonFinancialAssets__c FROM Account WHERE Id = :householdId", sfObject: "Account", description: "Load full household details" },
      { label: "Person Accounts", soql: "SELECT Id, FirstName, LastName, PersonBirthdate, FinServ__Occupation__c, FinServ__RiskTolerance__c FROM Account WHERE ParentId = :householdId AND IsPersonAccount = true", sfObject: "Account", description: "Load household members" },
      { label: "Financial Accounts", soql: "SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__Balance__c, FinServ__Status__c, FinServ__PrimaryOwner__r.Name FROM FinServ__FinancialAccount__c WHERE FinServ__PrimaryOwner__c IN (SELECT Id FROM Account WHERE ParentId = :householdId AND IsPersonAccount = true)", sfObject: "FinServ__FinancialAccount__c", description: "Load all financial accounts" },
      { label: "Holdings", soql: "SELECT Id, Name, FinServ__Symbol__c, FinServ__MarketValue__c, FinServ__GainLoss__c FROM FinServ__FinancialHolding__c WHERE FinServ__FinancialAccount__r.FinServ__PrimaryOwner__c IN (SELECT Id FROM Account WHERE ParentId = :householdId AND IsPersonAccount = true) ORDER BY FinServ__MarketValue__c DESC LIMIT 10", sfObject: "FinServ__FinancialHolding__c", description: "Load top 10 holdings by market value" },
      { label: "Goals", soql: "SELECT Id, Name, FinServ__TargetValue__c, FinServ__ActualValue__c, FinServ__TargetDate__c, FinServ__Status__c, FinServ__Type__c FROM FinServ__FinancialGoal__c WHERE FinServ__Account__c = :householdId", sfObject: "FinServ__FinancialGoal__c", description: "Load financial goals" },
    ],
    writeBackActions: [],
  },
  actionQueueGenerator: {
    name: "Action Queue Generator (Salesforce Exclusive)",
    schema: SFActionQueueSchema,
    pattern: "C",
    temperature: 0.3,
    sfInputQueries: [
      { label: "Open Tasks", soql: "SELECT Id, Subject, Status, Priority, ActivityDate, Type, What.Name, Who.Name FROM Task WHERE OwnerId = :advisorId AND Status != 'Completed' ORDER BY ActivityDate ASC", sfObject: "Task", description: "Load all open tasks for the advisor" },
      { label: "Open Cases", soql: "SELECT Id, Subject, Status, Priority, CreatedDate, Account.Name FROM Case WHERE OwnerId = :advisorId AND IsClosed = false", sfObject: "Case", description: "Load open cases for prioritization" },
      { label: "Active Opportunities", soql: "SELECT Id, Name, StageName, Amount, CloseDate, Account.Name FROM Opportunity WHERE OwnerId = :advisorId AND IsClosed = false ORDER BY CloseDate ASC", sfObject: "Opportunity", description: "Load active opportunities for pipeline actions" },
      { label: "Upcoming Events", soql: "SELECT Id, Subject, StartDateTime, What.Name FROM Event WHERE OwnerId = :advisorId AND StartDateTime >= TODAY AND StartDateTime <= NEXT_N_DAYS:7", sfObject: "Event", description: "Load upcoming events for schedule context" },
    ],
    writeBackActions: [
      { sfObject: "Task", operation: "update", fieldMapping: { Id: "actions[].sfSourceRecordId", Priority: "actions[].priority", Status: "actions[].status" }, description: "Update task priority/status based on AI prioritization" },
    ],
  },
};
