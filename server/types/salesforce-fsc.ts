export interface SFHouseholdAccount {
  Id: string;
  Name: string;
  RecordType?: { DeveloperName: "IndustriesHousehold" };
  OwnerId: string;
  FinServ__Status__c?: string;
  FinServ__ReviewFrequency__c?: string;
  FinServ__ServiceModel__c?: string;
  FinServ__TotalAUMPrimary__c?: number;
  FinServ__LastReview__c?: string | null;
  FinServ__NextReview__c?: string | null;
  FinServ__TotalNonFinancialAssets__c?: number;
  FinServ__TotalFinancialAccounts__c?: number;
  FinServ__InvestmentObjectives__c?: string;
  CreatedDate?: string;
}

export interface SFPersonAccount {
  Id: string;
  FirstName: string;
  LastName: string;
  PersonEmail: string;
  Phone: string;
  PersonBirthdate: string;
  PersonMailingCity: string;
  PersonMailingState: string;
  FinServ__RiskTolerance__c: string;
  FinServ__InvestmentExperience__c?: string;
  FinServ__Occupation__c: string;
  FinServ__EmployerName__c: string | null;
  FinServ__LastInteraction__c?: string;
  ParentId: string;
}

export interface SFUser {
  Id: string;
  Name: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Title: string;
  SmallPhotoUrl: string;
  IsActive: boolean;
  Profile?: { Name: string };
}

export interface SFEvent {
  Id: string;
  Subject: string;
  StartDateTime: string;
  EndDateTime?: string;
  Type?: string;
  WhatId?: string | null;
  What?: { Name: string } | null;
  WhoId?: string | null;
  Who?: { Name: string } | null;
  Location?: string;
}

export interface SFTask {
  Id: string;
  Subject: string;
  Status: string;
  Priority?: string;
  ActivityDate?: string;
  Type?: string;
  WhatId?: string | null;
  What?: { Name: string } | null;
  WhoId?: string | null;
  Who?: { Name: string } | null;
  OwnerId?: string;
  Description?: string;
  CreatedDate?: string;
}

export interface SFCase {
  Id: string;
  Subject: string;
  Status: string;
  Priority?: string;
  Type?: string;
  CreatedDate?: string;
  ClosedDate?: string | null;
  AccountId?: string;
  Account?: { Name: string };
  ContactId?: string | null;
  Description?: string;
  OwnerId?: string;
  IsClosed?: boolean;
}

export interface SFOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount?: number;
  CloseDate?: string;
  Probability?: number;
  AccountId?: string;
  Account?: { Name: string };
  Type?: string;
  LastActivityDate?: string;
  Description?: string;
  IsClosed?: boolean;
}

export interface SFSalesGoal {
  Id?: string;
  Name?: string;
  Goal_Type__c?: "Recurring" | "Non-Recurring";
  Target_Amount__c?: number;
  Current_Amount__c?: number;
  Progress_Pct__c?: number;
  Period__c?: string;
  OwnerId?: string;
  CreatedDate?: string;
  goalType?: "recurring" | "non-recurring";
  label?: string;
  targetAmount?: number;
  currentAmount?: number;
  progressPct?: number;
  period?: string;
}

export interface SFComplianceItem {
  Id?: string;
  Name?: string;
  Category__c?: string;
  Description__c?: string;
  Client_Name__c?: string;
  Account__c?: string;
  Status__c?: string;
  Due_Date__c?: string;
  Last_Completed__c?: string | null;
  Assigned_To__c?: string;
  Related_Task__c?: string | null;
  Related_Case__c?: string | null;
  Related_Document__c?: string | null;
  id?: string;
  category?: "risk_profile_review" | "ips_review" | "estate_plan_review" | "suitability_review" | "concentrated_position" | "beneficiary_update" | "insurance_review";
  title?: string;
  description?: string;
  clientName?: string;
  householdId?: string;
  status?: "current" | "expiring_soon" | "overdue" | "pending";
  dueDate?: string;
  lastCompleted?: string | null;
  assignedTo?: string;
  sfTaskId?: string | null;
  sfCaseId?: string | null;
  sfDocumentId?: string | null;
}

export interface SFFinancialAccount {
  Id: string;
  Name: string;
  FinServ__FinancialAccountType__c: string;
  FinServ__Balance__c: number;
  FinServ__Status__c: string;
  FinServ__HeldAway__c?: boolean;
  FinServ__OwnerType__c?: string;
  FinServ__PrimaryOwner__c: string;
  FinServ__Custodian__c: string | null;
  FinServ__OpenDate__c?: string;
}

export interface SFFinancialHolding {
  Id: string;
  Name: string;
  FinServ__Symbol__c: string | null;
  FinServ__MarketValue__c: number;
  FinServ__GainLoss__c: number;
  FinServ__Shares__c: number;
  FinServ__Price__c: number;
  FinServ__FinancialAccount__c: string;
  FinServ__FinancialAccount__r: { Name: string };
}

export interface SFFinancialGoal {
  Id: string;
  Name: string;
  FinServ__Type__c: string;
  FinServ__TargetValue__c: number;
  FinServ__ActualValue__c: number;
  FinServ__TargetDate__c: string;
  FinServ__Status__c: string;
  FinServ__PrimaryOwner__c?: string;
}

export interface SFRevenue {
  Id: string;
  FinServ__Amount__c: number;
  FinServ__RevenueDate__c?: string;
}

export interface SFAssetsAndLiabilities {
  Id: string;
  Name: string;
  FinServ__Amount__c: number;
  FinServ__AssetsAndLiabilitiesType__c: string;
}

export interface SFFinancialAccountParty {
  FinancialAccountId: string;
  Role: string;
  RelatedAccount: { Name: string };
}

export interface SFActivityHistory {
  Id: string;
  Subject: string;
  ActivityDate: string;
  ActivityType: string;
  Status: string;
  CallType?: string;
  CallDurationInSeconds?: number;
}

export interface SFContentDocumentLink {
  ContentDocument: {
    Id: string;
    Title: string;
    FileType: string;
    CreatedDate: string;
  };
}

export interface SFInteractionSummary {
  Id?: string;
  FinServ__Account__c: string;
  FinServ__Description__c: string;
  FinServ__InteractionDate__c: string;
  FinServ__CreatedBy__c?: string;
}

export interface SFQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface SFWriteResult {
  id: string;
  success: boolean;
  errors: Array<{ statusCode: string; message: string; fields: string[] }>;
}

export interface SFPayloadEnvelope<T = Record<string, unknown>> {
  objectPayloads: {
    accounts?: SFQueryResult<SFPersonAccount>;
    events?: SFQueryResult<SFEvent>;
    tasks?: SFQueryResult<SFTask>;
    cases?: SFQueryResult<SFCase>;
    opportunities?: SFQueryResult<SFOpportunity>;
    financialGoals?: SFQueryResult<SFFinancialGoal>;
    salesGoals?: SFQueryResult<SFSalesGoal>;
    activityHistories?: SFQueryResult<SFActivityHistory>;
    complianceReviews?: SFQueryResult<T>;
    [key: string]: SFQueryResult<unknown> | undefined;
  };
  derivedMetrics: SFDerivedMetrics;
  advisorContext: {
    advisorId: string;
    advisorName: string;
    reportDate: string;
  };
}

export interface SFDerivedMetrics {
  clientCountSummary: {
    totalHouseholds: number;
    segmentation: Record<string, number>;
  };
  meetingsTodayCount: {
    count: number;
    meetings: string[];
  };
  actionQueueSummary: {
    totalPending: number;
    breakdown: { tasks_not_started: number; tasks_in_progress: number; cases_open: number };
  };
  complianceHealth: {
    overallHealthPct: number;
    current: number;
    expiringSoon: number;
    overdue: number;
    pending: number;
  };
}
