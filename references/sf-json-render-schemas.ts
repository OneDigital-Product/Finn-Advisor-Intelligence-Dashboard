// =============================================================================
// SALESFORCE-EXCLUSIVE JSON RENDER SCHEMAS
// @od-oneapp/ai-platform Output System
// =============================================================================
//
//
//
// PATTERN (from @od-oneapp/ai-platform/output):
//   1. Define Zod schema (the shape AI must return)
//   2. Pass to generateStructuredObject() or createObjectOutput()
//   3. AI returns validated JSON matching that shape
//   4. React component renders the typed object
//
// ALL INPUT DATA: Salesforce Financial Services Cloud ONLY.
// No Orion. No external systems. Pure SF CRM + FSC objects.
//
// WIRING PATTERNS:
//   Pattern A: generateStructuredObject() — single object (risk, diagnostic)
//   Pattern B: createObjectOutput() + streamText — streaming (progressive UI)
//   Pattern C: streamElements() — streaming list items (actions, alerts)
// =============================================================================

import { z } from "zod";

// =============================================================================
// SCHEMA 1: CLIENT RELATIONSHIP INTELLIGENCE
// Pattern A — generateStructuredObject()
// SF Objects: Account, Task, Event, ActivityHistory, Case, Opportunity, FinancialGoal
// =============================================================================

export const ClientRelationshipIntelligenceSchema = z.object({
  householdName: z.string(),
  primaryContactName: z.string(),
  relationshipHealthScore: z.number().min(0).max(100).describe("Overall relationship health 0-100"),
  healthLevel: z.enum(["thriving", "healthy", "attention-needed", "at-risk", "critical"]),
  activityAnalysis: z.object({
    totalActivitiesLast90Days: z.number(),
    meetingsCompleted: z.number(),
    callsMade: z.number(),
    emailsSent: z.number(),
    lastContactDate: z.string().describe("ISO date of last meaningful contact"),
    daysSinceLastContact: z.number(),
    contactFrequencyTrend: z.enum(["increasing", "stable", "decreasing", "dormant"]),
    averageDaysBetweenContacts: z.number(),
  }),
  taskAnalysis: z.object({
    openTasksCount: z.number(),
    overdueTasksCount: z.number(),
    highPriorityOverdue: z.array(z.object({ subject: z.string(), dueDate: z.string(), status: z.string() })),
    taskCompletionRate: z.number().min(0).max(1).describe("Completion rate 0.0-1.0 last 6 months"),
  }),
  caseAnalysis: z.object({
    openCasesCount: z.number(),
    averageResolutionDays: z.number(),
    oldestOpenCase: z.object({ subject: z.string(), createdDate: z.string(), daysSinceCreated: z.number() }).nullable(),
  }),
  opportunityAnalysis: z.object({
    activeOpportunities: z.array(z.object({ name: z.string(), stage: z.string(), amount: z.number(), closeDate: z.string(), probability: z.number().min(0).max(100) })),
    totalPipelineValue: z.number(),
    staleOpportunities: z.array(z.object({ name: z.string(), daysSinceActivity: z.number() })),
  }),
  goalAlignment: z.object({
    totalGoals: z.number(),
    onTrackGoals: z.number(),
    offTrackGoals: z.number(),
    nextMilestone: z.object({ goalName: z.string(), targetDate: z.string(), currentProgress: z.number().min(0).max(1) }).nullable(),
  }),
  recommendedActions: z.array(z.object({
    action: z.string(),
    priority: z.enum(["critical", "high", "medium", "low"]),
    category: z.enum(["outreach", "follow-up", "planning", "compliance", "opportunity"]),
    sfObjectToUpdate: z.enum(["Task", "Event", "Case", "Opportunity"]),
    reasoning: z.string(),
  })),
  riskSignals: z.array(z.object({
    signal: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    source: z.string().describe("SF object: ActivityHistory, Task, Case, Opportunity"),
    confidence: z.number().min(0).max(1),
  })),
  executiveSummary: z.string().describe("2-3 sentence narrative summary"),
});
export type ClientRelationshipIntelligence = z.infer<typeof ClientRelationshipIntelligenceSchema>;
export const clientRelationshipIntelligenceConfig = {
  name: "Client Relationship Intelligence",
  schema: ClientRelationshipIntelligenceSchema,
  pattern: "A" as const,
  temperature: 0.4,
  sfInputQueries: {
    household:  "SELECT Id, Name, OwnerId, FinServ__Status__c, FinServ__ReviewFrequency__c, FinServ__ServiceModel__c, FinServ__TotalAUMPrimary__c, FinServ__LastReview__c, FinServ__NextReview__c FROM Account WHERE RecordType.DeveloperName = 'IndustriesHousehold' AND Id = :householdId",
    members:    "SELECT Id, FirstName, LastName, PersonEmail, Phone, FinServ__RiskTolerance__c, FinServ__Occupation__c FROM Account WHERE RecordType.DeveloperName = 'PersonAccount' AND ParentId = :householdId",
    tasks:      "SELECT Id, Subject, Status, Priority, ActivityDate, Type, CreatedDate FROM Task WHERE WhatId = :householdId AND CreatedDate = LAST_N_DAYS:180",
    events:     "SELECT Id, Subject, StartDateTime, EndDateTime, Type FROM Event WHERE WhatId = :householdId AND StartDateTime >= LAST_N_DAYS:180",
    activities: "SELECT Id, Subject, ActivityDate, ActivityType, Status FROM ActivityHistory WHERE AccountId = :householdId ORDER BY ActivityDate DESC LIMIT 50",
    cases:      "SELECT Id, Subject, Status, Priority, CreatedDate, ClosedDate FROM Case WHERE AccountId = :householdId AND IsClosed = false",
    opps:       "SELECT Id, Name, StageName, Amount, CloseDate, Probability, LastActivityDate FROM Opportunity WHERE AccountId = :householdId AND IsClosed = false",
    goals:      "SELECT Id, Name, FinServ__TargetDate__c, FinServ__TargetValue__c, FinServ__ActualValue__c, FinServ__Status__c FROM FinServ__FinancialGoal__c WHERE FinServ__PrimaryOwner__c = :householdId",
  },
  pages: ["Page 1 Dashboard", "Page 2 Clients", "Page 8 Client360", "Page 10 Engagement"],
};

// =============================================================================
// SCHEMA 2: MEETING TRANSCRIPT → SALESFORCE ACTIONS
// Pattern A — generateStructuredObject()
// SF Objects: Account, User → writes to Task, Event, Case, Opportunity, InteractionSummary
// =============================================================================

export const TranscriptToSalesforceSchema = z.object({
  meetingMetadata: z.object({
    title: z.string(),
    date: z.string(),
    duration: z.string(),
    attendees: z.array(z.string()),
    householdId: z.string().describe("SF Account.Id for the Household"),
    meetingType: z.enum(["Annual Review", "Quarterly Review", "Ad Hoc", "Onboarding", "Tax Planning", "Estate Review", "Insurance Review", "Portfolio Check-In"]),
  }),
  interactionSummary: z.object({
    summary: z.string().describe("2-3 paragraph summary for FinServ__InteractionSummary__c"),
    clientSentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
    keyTopics: z.array(z.string()),
    clientRequests: z.array(z.string()),
    advisorCommitments: z.array(z.string()),
  }),
  salesforceActions: z.object({
    tasks: z.array(z.object({
      Subject: z.string(), Description: z.string(), ActivityDate: z.string(),
      Priority: z.enum(["High", "Normal", "Low"]), Status: z.literal("Not Started"),
      Type: z.enum(["Call", "Email", "Meeting", "Other"]),
      WhatId: z.string(), OwnerId: z.string(),
      category: z.enum(["planning", "compliance", "administrative", "follow-up", "opportunity"]),
    })),
    events: z.array(z.object({
      Subject: z.string(), Description: z.string(), StartDateTime: z.string(),
      EndDateTime: z.string(), WhatId: z.string(), Location: z.string(), Type: z.string(),
    })),
    cases: z.array(z.object({
      Subject: z.string(), Description: z.string(),
      Priority: z.enum(["High", "Medium", "Low"]),
      Type: z.enum(["Compliance Review", "Document Request", "Service Request", "Beneficiary Update"]),
      AccountId: z.string(), Origin: z.literal("Meeting"),
    })),
    opportunities: z.array(z.object({
      Name: z.string(), StageName: z.string(), Amount: z.number(), CloseDate: z.string(),
      AccountId: z.string(), Type: z.enum(["New Business", "Cross-Sell", "Referral", "Retention"]),
      Description: z.string(),
    })),
  }),
  complianceFlags: z.array(z.object({
    item: z.string(),
    sfComplianceCategory: z.enum(["risk_profile_review", "ips_review", "estate_plan_review", "suitability_review", "concentrated_position", "beneficiary_update", "insurance_review"]),
    urgency: z.enum(["immediate", "within-30-days", "next-review"]),
    createCase: z.boolean(),
  })),
  followUpSchedule: z.object({
    nextContactDate: z.string(), nextContactType: z.enum(["Meeting", "Call", "Email"]),
    createEvent: z.boolean(), subject: z.string(),
  }).nullable(),
});
export type TranscriptToSalesforce = z.infer<typeof TranscriptToSalesforceSchema>;
export const transcriptToSalesforceConfig = {
  name: "Meeting Transcript → Salesforce Actions",
  schema: TranscriptToSalesforceSchema,
  pattern: "A" as const, temperature: 0.3,
  sfInputQueries: {
    household: "SELECT Id, Name, OwnerId FROM Account WHERE Id = :householdId",
    members:   "SELECT Id, FirstName, LastName, PersonEmail FROM Account WHERE RecordType.DeveloperName = 'PersonAccount' AND ParentId = :householdId",
    advisor:   "SELECT Id, Name, Email FROM User WHERE Id = :currentUserId",
  },
  sfWriteBack: ["Task", "Event", "Case", "Opportunity", "FinServ__InteractionSummary__c"],
  pages: ["Page 1 Dashboard", "Page 6 Calendar", "Page 8 Client360"],
};

// =============================================================================
// SCHEMA 3: ENGAGEMENT SCORING (Salesforce Exclusive)
// Pattern A — generateStructuredObject()
// SF Objects: Account, Task, Event, ActivityHistory, Case, Opportunity, FinancialAccount
// =============================================================================

export const SFEngagementScoringSchema = z.object({
  clientName: z.string(), householdId: z.string(),
  segment: z.enum(["A", "B", "C", "D"]),
  compositeScore: z.number().min(0).max(100).describe("Weighted composite engagement score"),
  frequency: z.number().min(0).max(100), recency: z.number().min(0).max(100),
  diversity: z.number().min(0).max(100), responsiveness: z.number().min(0).max(100),
  accountStickiness: z.number().min(0).max(100),
  trend: z.enum(["improving", "declining", "stable"]),
  riskOfChurn: z.enum(["low", "moderate", "high", "critical"]),
  sfActivityBreakdown: z.object({
    meetingsLast90Days: z.number(), callsLast90Days: z.number(), emailsLast90Days: z.number(),
    tasksCompletedByClient: z.number(), casesOpenedByClient: z.number(),
    documentsSignedLast90Days: z.number(), portalLoginsLast90Days: z.number(),
    lastMeetingDate: z.string().nullable(), lastCallDate: z.string().nullable(), lastEmailDate: z.string().nullable(),
  }),
  signals: z.array(z.object({
    type: z.enum(["Engagement Drop", "Positive Momentum", "Milestone Approaching", "Compliance Gap", "Service Issue", "Referral Potential", "Churn Risk"]),
    description: z.string(), sfSourceObject: z.string(), sfSourceRecordId: z.string(),
    confidence: z.number().min(0).max(1), detectedDate: z.string(),
  })),
  recommendedActions: z.array(z.object({
    action: z.string(), priority: z.enum(["critical", "high", "medium", "low"]),
    category: z.enum(["outreach", "planning", "compliance", "opportunity", "retention"]),
    sfActionType: z.enum(["Create Task", "Create Event", "Create Case", "Update Opportunity", "Send Email"]),
    sfPayload: z.object({ objectType: z.enum(["Task", "Event", "Case", "Opportunity"]), fields: z.record(z.string()) }),
  })),
  reasoning: z.string().describe("Why this score and these recommendations"),
});
export type SFEngagementScoring = z.infer<typeof SFEngagementScoringSchema>;
export const sfEngagementScoringConfig = {
  name: "Client Engagement Scoring (Salesforce Exclusive)",
  schema: SFEngagementScoringSchema, pattern: "A" as const, temperature: 0.4,
  sfInputQueries: {
    household:  "SELECT Id, Name, FinServ__Status__c, FinServ__ServiceModel__c, FinServ__ReviewFrequency__c, FinServ__TotalAUMPrimary__c, CreatedDate FROM Account WHERE Id = :householdId",
    tasks:      "SELECT Id, Subject, Type, Status, Priority, ActivityDate, CreatedDate FROM Task WHERE WhatId = :householdId AND CreatedDate = LAST_N_DAYS:180",
    events:     "SELECT Id, Subject, StartDateTime, EndDateTime, Type FROM Event WHERE WhatId = :householdId AND StartDateTime >= LAST_N_DAYS:180",
    activities: "SELECT Id, Subject, ActivityDate, ActivityType, Status, CallDurationInSeconds FROM ActivityHistory WHERE AccountId = :householdId ORDER BY ActivityDate DESC LIMIT 50",
    cases:      "SELECT Id, Subject, Status, Priority, CreatedDate, ClosedDate, Type FROM Case WHERE AccountId = :householdId AND CreatedDate = LAST_N_DAYS:365",
    opps:       "SELECT Id, Name, StageName, Amount, CloseDate, LastActivityDate FROM Opportunity WHERE AccountId = :householdId AND IsClosed = false",
    accounts:   "SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__Balance__c, FinServ__Status__c, CreatedDate FROM FinServ__FinancialAccount__c WHERE FinServ__PrimaryOwner__c = :householdId",
  },
  pages: ["Page 9 Analytics", "Page 10 Engagement"],
};

// =============================================================================
// SCHEMA 4: COMPLIANCE GAP ANALYSIS (Salesforce Exclusive)
// Pattern A — generateStructuredObject()
// SF Objects: Account, Task, Case, ContentDocumentLink, FinancialAccount, FinancialAccountParty
// =============================================================================

export const SFComplianceGapSchema = z.object({
  householdName: z.string(), householdId: z.string(),
  overallComplianceScore: z.number().min(0).max(100),
  status: z.enum(["compliant", "attention-needed", "non-compliant"]),
  categories: z.array(z.object({
    key: z.enum(["risk_profile_review", "ips_review", "estate_plan_review", "suitability_review", "concentrated_position", "beneficiary_update", "insurance_review"]),
    label: z.string(),
    status: z.enum(["current", "expiring_soon", "overdue", "missing", "not_applicable"]),
    lastCompletedDate: z.string().nullable(), nextDueDate: z.string().nullable(),
    daysUntilDue: z.number().nullable(), daysOverdue: z.number().nullable(),
    assignedTo: z.string(), sfDocumentOnFile: z.boolean(),
    sfTaskId: z.string().nullable(), sfCaseId: z.string().nullable(),
    findings: z.string().describe("AI analysis of this compliance category"),
  })),
  documentAudit: z.array(z.object({
    documentType: z.string(), status: z.enum(["on-file", "expired", "missing", "pending-signature"]),
    sfContentDocumentId: z.string().nullable(), uploadDate: z.string().nullable(), expirationDate: z.string().nullable(),
  })),
  beneficiaryAudit: z.array(z.object({
    accountName: z.string(), accountType: z.string(), sfFinancialAccountId: z.string(),
    primaryBeneficiary: z.string().nullable(), contingentBeneficiary: z.string().nullable(),
    designationStatus: z.enum(["complete", "incomplete", "missing", "needs-update"]),
    lastReviewedDate: z.string().nullable(),
  })),
  urgentActions: z.array(z.object({
    action: z.string(), category: z.string(), dueDate: z.string(),
    priority: z.enum(["critical", "high", "medium"]),
    sfActionType: z.enum(["Create Task", "Create Case", "Update Record"]),
    sfPayload: z.record(z.string()),
  })),
  regulatoryNotes: z.array(z.string()),
});
export type SFComplianceGap = z.infer<typeof SFComplianceGapSchema>;
export const sfComplianceGapConfig = {
  name: "Compliance Gap Analysis (Salesforce Exclusive)",
  schema: SFComplianceGapSchema, pattern: "A" as const, temperature: 0.3,
  sfInputQueries: {
    household:     "SELECT Id, Name, FinServ__Status__c, FinServ__ReviewFrequency__c, FinServ__LastReview__c, FinServ__NextReview__c FROM Account WHERE Id = :householdId",
    members:       "SELECT Id, FirstName, LastName, FinServ__RiskTolerance__c, PersonBirthdate FROM Account WHERE RecordType.DeveloperName = 'PersonAccount' AND ParentId = :householdId",
    tasks:         "SELECT Id, Subject, Status, ActivityDate, Priority FROM Task WHERE WhatId = :householdId AND (Subject LIKE '%review%' OR Subject LIKE '%compliance%' OR Subject LIKE '%beneficiary%' OR Subject LIKE '%IPS%' OR Subject LIKE '%suitability%' OR Subject LIKE '%insurance%' OR Subject LIKE '%estate%')",
    cases:         "SELECT Id, Subject, Status, Type, Priority, CreatedDate, ClosedDate FROM Case WHERE AccountId = :householdId AND (Type = 'Compliance Review' OR Type = 'Document Request' OR Type = 'Beneficiary Update')",
    documents:     "SELECT ContentDocument.Id, ContentDocument.Title, ContentDocument.FileType, ContentDocument.CreatedDate FROM ContentDocumentLink WHERE LinkedEntityId = :householdId",
    accounts:      "SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__Balance__c, FinServ__Status__c FROM FinServ__FinancialAccount__c WHERE FinServ__PrimaryOwner__c = :householdId AND FinServ__Status__c = 'Open'",
    beneficiaries: "SELECT FinancialAccountId, Role, RelatedAccount.Name FROM FinancialAccountParty WHERE FinancialAccountId IN :financialAccountIds AND Role IN ('Beneficiary', 'Contingent Beneficiary')",
  },
  pages: ["Page 11 Compliance", "Page 9 Analytics"],
};

// =============================================================================
// SCHEMA 5: HOUSEHOLD FINANCIAL SNAPSHOT (Salesforce Exclusive)
// Pattern B — createObjectOutput() + streamText (progressive rendering)
// SF Objects: Account, FinancialAccount, FinancialHolding, Revenue, AssetsAndLiabilities, FinancialGoal
// =============================================================================

export const SFHouseholdFinancialSnapshotSchema = z.object({
  household: z.object({
    name: z.string(), householdId: z.string(), primaryContact: z.string(),
    segment: z.enum(["A", "B", "C", "D"]), status: z.string(), serviceModel: z.string(),
    reviewFrequency: z.string(), lastReviewDate: z.string().nullable(), nextReviewDate: z.string().nullable(),
  }),
  members: z.array(z.object({
    name: z.string(), personAccountId: z.string(), relationship: z.string(),
    age: z.number(), occupation: z.string().nullable(), riskTolerance: z.string().nullable(),
  })),
  financialSummary: z.object({
    totalAUM: z.number().describe("Sum of FinServ__FinancialAccount__c balances"),
    totalAccounts: z.number(),
    accountsByType: z.array(z.object({ type: z.string(), count: z.number(), totalBalance: z.number() })),
    totalNonFinancialAssets: z.number(), totalLiabilities: z.number(),
    estimatedNetWorth: z.number().describe("AUM + non-financial assets - liabilities"),
    revenueYTD: z.number(),
  }),
  accounts: z.array(z.object({
    sfId: z.string(), name: z.string(), type: z.string(), balance: z.number(), status: z.string(),
    custodian: z.string().nullable(), primaryOwner: z.string(), beneficiaryDesignated: z.boolean(), holdingsCount: z.number(),
  })),
  topHoldings: z.array(z.object({
    sfId: z.string(), name: z.string(), symbol: z.string().nullable(),
    marketValue: z.number(), gainLoss: z.number(), weight: z.number().describe("Percentage of total AUM"), accountName: z.string(),
  })),
  goals: z.array(z.object({
    name: z.string(), type: z.string(), targetValue: z.number(), currentValue: z.number(),
    progressPct: z.number().min(0).max(1), targetDate: z.string(), status: z.string(),
  })),
  aiInsights: z.array(z.object({
    insight: z.string(), category: z.enum(["opportunity", "risk", "planning", "compliance"]),
    priority: z.enum(["high", "medium", "low"]), relatedSFObject: z.string(), relatedSFRecordId: z.string(),
  })),
});
export type SFHouseholdFinancialSnapshot = z.infer<typeof SFHouseholdFinancialSnapshotSchema>;
export const sfHouseholdFinancialSnapshotConfig = {
  name: "Household Financial Snapshot (Salesforce Exclusive)",
  schema: SFHouseholdFinancialSnapshotSchema, pattern: "B" as const, temperature: 0.3,
  sfInputQueries: {
    household:     "SELECT Id, Name, FinServ__Status__c, FinServ__ServiceModel__c, FinServ__ReviewFrequency__c, FinServ__TotalAUMPrimary__c, FinServ__TotalNonFinancialAssets__c, FinServ__LastReview__c, FinServ__NextReview__c FROM Account WHERE Id = :householdId",
    members:       "SELECT Id, FirstName, LastName, PersonBirthdate, FinServ__Occupation__c, FinServ__RiskTolerance__c FROM Account WHERE RecordType.DeveloperName = 'PersonAccount' AND ParentId = :householdId",
    accounts:      "SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__Balance__c, FinServ__Status__c, FinServ__Custodian__c FROM FinServ__FinancialAccount__c WHERE FinServ__PrimaryOwner__c = :householdId ORDER BY FinServ__Balance__c DESC",
    holdings:      "SELECT Id, Name, FinServ__Symbol__c, FinServ__MarketValue__c, FinServ__GainLoss__c, FinServ__FinancialAccount__r.Name FROM FinServ__FinancialHolding__c WHERE FinServ__FinancialAccount__r.FinServ__PrimaryOwner__c = :householdId ORDER BY FinServ__MarketValue__c DESC LIMIT 20",
    revenue:       "SELECT Id, FinServ__Amount__c FROM FinServ__Revenue__c WHERE FinServ__FinancialAccount__r.FinServ__PrimaryOwner__c = :householdId AND FinServ__RevenueDate__c = THIS_YEAR",
    assetsLiabs:   "SELECT Id, Name, FinServ__Amount__c, FinServ__AssetsAndLiabilitiesType__c FROM FinServ__AssetsAndLiabilities__c WHERE FinServ__PrimaryOwner__c = :householdId",
    goals:         "SELECT Id, Name, FinServ__Type__c, FinServ__TargetValue__c, FinServ__ActualValue__c, FinServ__TargetDate__c, FinServ__Status__c FROM FinServ__FinancialGoal__c WHERE FinServ__PrimaryOwner__c = :householdId",
    beneficiaries: "SELECT FinancialAccountId, Role FROM FinancialAccountParty WHERE FinancialAccountId IN :financialAccountIds AND Role IN ('Beneficiary', 'Contingent Beneficiary')",
  },
  pages: ["Page 1 Dashboard", "Page 2 Clients", "Page 8 Client360", "Page 9 Analytics"],
};

// =============================================================================
// SCHEMA 6: ACTION QUEUE GENERATOR (Salesforce Exclusive)
// Pattern C — streamElements() (items stream into UI one at a time)
// SF Objects: Task (all open), Case (all open), Event (7 days), Opportunity (stale)
// =============================================================================

export const SFActionItemElementSchema = z.object({
  rank: z.number().describe("1 = most urgent"),
  action: z.string(), clientName: z.string(), householdId: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  category: z.enum(["outreach", "compliance", "follow-up", "planning", "opportunity", "administrative"]),
  dueDate: z.string().nullable(), daysOverdue: z.number().nullable(),
  sfSourceObject: z.enum(["Task", "Case", "Event", "Opportunity"]),
  sfSourceRecordId: z.string(), aiReasoning: z.string(),
  estimatedImpact: z.enum(["revenue", "retention", "compliance", "service", "relationship"]),
});
export type SFActionItemElement = z.infer<typeof SFActionItemElementSchema>;

export const SFActionQueueSchema = z.object({
  totalPendingActions: z.number(), criticalCount: z.number(), highCount: z.number(),
  mediumCount: z.number(), lowCount: z.number(),
  actions: z.array(SFActionItemElementSchema),
  dailyPriorities: z.object({
    morning: z.array(z.string()).describe("Top 3 things to do first"),
    afternoon: z.array(z.string()), thisWeek: z.array(z.string()),
  }),
  bookHealthSummary: z.string().describe("1-2 sentence overall assessment"),
});
export type SFActionQueue = z.infer<typeof SFActionQueueSchema>;
export const sfActionQueueConfig = {
  name: "Action Queue Generator (Salesforce Exclusive)",
  schema: SFActionQueueSchema, elementSchema: SFActionItemElementSchema,
  pattern: "C" as const, temperature: 0.3,
  sfInputQueries: {
    tasks:  "SELECT Id, Subject, Status, Priority, ActivityDate, Type, WhatId, What.Name, WhoId, Who.Name, CreatedDate FROM Task WHERE OwnerId = :currentUserId AND Status != 'Completed' AND Status != 'Deferred' ORDER BY ActivityDate ASC NULLS LAST",
    cases:  "SELECT Id, Subject, Status, Priority, Type, CreatedDate, AccountId, Account.Name FROM Case WHERE OwnerId = :currentUserId AND IsClosed = false ORDER BY Priority DESC",
    events: "SELECT Id, Subject, StartDateTime, EndDateTime, WhatId, What.Name, Type FROM Event WHERE OwnerId = :currentUserId AND StartDateTime >= TODAY AND StartDateTime <= NEXT_N_DAYS:7 ORDER BY StartDateTime ASC",
    opps:   "SELECT Id, Name, StageName, Amount, CloseDate, AccountId, Account.Name, LastActivityDate FROM Opportunity WHERE OwnerId = :currentUserId AND IsClosed = false AND LastActivityDate < LAST_N_DAYS:14 ORDER BY Amount DESC",
  },
  pages: ["Page 1 Dashboard", "Page 10 Engagement"],
};

// =============================================================================
// EXPORTS
// =============================================================================

export const SF_JSON_RENDER_SCHEMAS = {
  clientRelationshipIntelligence: clientRelationshipIntelligenceConfig,
  transcriptToSalesforce: transcriptToSalesforceConfig,
  engagementScoring: sfEngagementScoringConfig,
  complianceGapAnalysis: sfComplianceGapConfig,
  householdFinancialSnapshot: sfHouseholdFinancialSnapshotConfig,
  actionQueueGenerator: sfActionQueueConfig,
} as const;