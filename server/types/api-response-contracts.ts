export interface ApiEnvelope<T> {
  data: T;
  meta: {
    source: "orion" | "salesforce" | "mixed" | "ai-platform";
    timestamp: string;
    cached: boolean;
    cacheAge?: number;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasNext: boolean;
  };
  errors?: {
    code: string;
    message: string;
    field?: string;
  }[];
}

export interface ApiOrionHousehold {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  representativeId: number;
  isActive: boolean;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
  homePhone: string | null;
  fax: string | null;
  createdDate: string;
  editedDate: string;
  currentValue?: number;
  asOfDate?: string;
}

export type ApiOrionHouseholdListResponse = ApiEnvelope<ApiOrionHousehold[]>;
export type ApiOrionHouseholdDetailResponse = ApiEnvelope<ApiOrionHousehold>;

export interface ApiOrionHouseholdVerbose extends ApiOrionHousehold {
  portfolio: {
    firstName: string;
    lastName: string;
    name: string;
    representativeId: number;
    isActive: boolean;
    startDate: string;
    address1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    email: string | null;
    homePhone: string | null;
    categoryId: number | null;
  };
  billing: {
    feeScheduleId: number | null;
    billingStyle: string | null;
    paymentSource: string | null;
  } | null;
  recurringAdjustments: unknown[];
}

export type ApiOrionHouseholdVerboseResponse = ApiEnvelope<ApiOrionHouseholdVerbose>;

export interface ApiOrionPortfolioTreeNode {
  entityType: "Household" | "Registration" | "Account";
  id: number;
  name: string;
  value: number | null;
  children: ApiOrionPortfolioTreeNode[];
}

export type ApiOrionPortfolioTreeResponse = ApiEnvelope<ApiOrionPortfolioTreeNode>;

export interface ApiOrionAccount {
  id: number;
  name: string;
  custodianId: number | null;
  custodianName?: string;
  custodialAccountNumber: string | null;
  fundFamilyId: number | null;
  managementStyleId: number | null;
  isActive: boolean;
  currentValue: number;
  startDate: string;
  registrationId: number;
  registrationType?: string;
  clientId: number;
}

export type ApiOrionAccountListResponse = ApiEnvelope<ApiOrionAccount[]>;

export interface ApiOrionAsset {
  id: number;
  accountId: number;
  ticker: string | null;
  description: string;
  shares: number;
  price: number;
  marketValue: number;
  costBasis: number;
  unrealizedGainLoss: number;
  assetClassification: string | null;
  sectorClassification: string | null;
  dividendYield: number | null;
  expenseRatio: number | null;
  weight: number;
  asOfDate: string;
}

export type ApiOrionAssetListResponse = ApiEnvelope<ApiOrionAsset[]>;

export interface ApiOrionPerformancePeriod {
  quickDate: string;
  startDate: string;
  endDate: string;
  returnPercent: number;
  benchmarkReturnPercent: number;
  netFlows: number | null;
  beginningMarketValue: number;
  endingMarketValue: number;
}

export type ApiOrionPerformanceResponse = ApiEnvelope<ApiOrionPerformancePeriod[]>;

export interface ApiOrionReportingScopeRequest {
  entity: "Representative" | "Client" | "Account" | "Registration";
  entityIds: number[];
  asOfDate: string;
  managed: number;
}

export interface ApiOrionReportingScopeAllocation {
  assetClassName: string;
  marketValue: number;
  percentage: number;
  targetPercentage: number | null;
  drift: number | null;
}

export interface ApiOrionReportingScopePerformance {
  entityId: number;
  entityName: string;
  periods: ApiOrionPerformancePeriod[];
}

export interface ApiOrionReportingScopeTax {
  accountId: number;
  ticker: string;
  description: string;
  shares: number;
  costBasis: number;
  marketValue: number;
  unrealizedGainLoss: number;
  holdingPeriod: "short-term" | "long-term";
  purchaseDate: string;
  taxLotId: number;
}

export interface ApiOrionReportingScopeResponse {
  allocation?: ApiOrionReportingScopeAllocation[];
  performance?: ApiOrionReportingScopePerformance[];
  activity?: unknown[];
  portfolioDetail?: unknown[];
  taxDetail?: ApiOrionReportingScopeTax[];
}

export type ApiReportingScopeResponse = ApiEnvelope<ApiOrionReportingScopeResponse>;

export interface ApiOrionAumDataPoint {
  asOfDate: string;
  value: number;
}

export type ApiOrionAumOverTimeResponse = ApiEnvelope<ApiOrionAumDataPoint[]>;

export interface ApiOrionGoal {
  goalId: number;
  goalName: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  fundedRatio: number;
  targetDate: string | null;
  status: string;
}

export type ApiOrionGoalTrackingResponse = ApiEnvelope<ApiOrionGoal[]>;

export interface ApiOrionRiskTile {
  tileName: string;
  count: number;
  severity: string;
  description: string;
}

export interface ApiOrionAccountAlert {
  accountId: number;
  accountName: string;
  alertType: string;
  alertMessage: string;
  severity: string;
  createdDate: string;
}

export interface ApiOrionOutOfTolerance {
  accountId: number;
  accountName: string;
  clientId: number;
  clientName: string;
  daysOutOfTolerance: number;
  currentDrift: number;
  modelName: string;
}

export type ApiOrionRiskTilesResponse = ApiEnvelope<ApiOrionRiskTile[]>;
export type ApiOrionAccountAlertsResponse = ApiEnvelope<ApiOrionAccountAlert[]>;
export type ApiOrionOutOfToleranceResponse = ApiEnvelope<ApiOrionOutOfTolerance[]>;

export interface ApiOrionBillInstance {
  instanceId: number;
  marketValue: number;
  balanceDue: number;
  householdCount: number;
  isMockBill: boolean;
  asOfDate: string;
}

export type ApiOrionBillInstanceResponse = ApiEnvelope<ApiOrionBillInstance>;

export interface ApiOrionTransaction {
  transactionId: number;
  accountId: number;
  accountName: string;
  transDate: string;
  ticker: string | null;
  description: string;
  transType: string;
  amount: number;
  shares: number | null;
  price: number | null;
}

export type ApiOrionTransactionListResponse = ApiEnvelope<ApiOrionTransaction[]>;

export interface ApiOrionRiskProfile {
  clientId: number;
  riskScore: number;
  riskCategory: string;
  completedDate: string;
  expirationDate: string | null;
}

export type ApiOrionRiskProfileResponse = ApiEnvelope<ApiOrionRiskProfile>;

export interface ApiOrionTaxLot {
  taxLotId: number;
  accountId: number;
  ticker: string;
  description: string;
  shares: number;
  costBasis: number;
  marketValue: number;
  unrealizedGainLoss: number;
  holdingPeriod: "short-term" | "long-term";
  purchaseDate: string;
  adjustedCostBasis: number;
}

export type ApiOrionTaxLotResponse = ApiEnvelope<ApiOrionTaxLot[]>;

export interface ApiOrionRmd {
  accountId: number;
  accountName: string;
  priorYearEndBalance: number;
  distributionPeriod: number;
  rmdAmount: number;
  distributionsTaken: number;
  remainingRmd: number;
  clientAge: number;
}

export type ApiOrionRmdResponse = ApiEnvelope<ApiOrionRmd[]>;

export interface ApiOrionBalanceSheetItem {
  category: string;
  itemName: string;
  value: number;
  type: "asset" | "liability";
}

export interface ApiOrionBalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  items: ApiOrionBalanceSheetItem[];
}

export type ApiOrionBalanceSheetResponse = ApiEnvelope<ApiOrionBalanceSheet>;

export interface ApiOrionRepresentative {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentValue: number;
  clientCount: number;
}

export type ApiOrionRepresentativeResponse = ApiEnvelope<ApiOrionRepresentative>;

export interface ApiSfHousehold {
  Id: string;
  Name: string;
  RecordType: { DeveloperName: "IndustriesHousehold" };
  OwnerId: string;
  FinServ__Status__c: string;
  FinServ__ReviewFrequency__c: string;
  FinServ__ServiceModel__c: string;
  FinServ__TotalAUMPrimary__c: number;
  FinServ__TotalNonFinancialAssets__c: number;
  FinServ__TotalFinancialAccounts__c: number;
  FinServ__LastReview__c: string | null;
  FinServ__NextReview__c: string | null;
  FinServ__InvestmentObjectives__c: string | null;
  CreatedDate: string;
}

export type ApiSfHouseholdListResponse = ApiEnvelope<ApiSfHousehold[]>;

export interface ApiSfPersonAccount {
  Id: string;
  FirstName: string;
  LastName: string;
  PersonEmail: string | null;
  Phone: string | null;
  PersonBirthdate: string | null;
  PersonMailingCity: string | null;
  PersonMailingState: string | null;
  FinServ__RiskTolerance__c: string | null;
  FinServ__InvestmentExperience__c: string | null;
  FinServ__Occupation__c: string | null;
  FinServ__EmployerName__c: string | null;
  FinServ__LastInteraction__c: string | null;
  ParentId: string;
}

export type ApiSfPersonAccountListResponse = ApiEnvelope<ApiSfPersonAccount[]>;

export interface ApiSfFinancialAccount {
  Id: string;
  Name: string;
  FinServ__FinancialAccountType__c: string;
  FinServ__Balance__c: number;
  FinServ__Status__c: string;
  FinServ__HeldAway__c: boolean;
  FinServ__OwnerType__c: string;
  FinServ__PrimaryOwner__c: string;
  FinServ__Custodian__c: string | null;
  FinServ__OpenDate__c: string | null;
}

export type ApiSfFinancialAccountListResponse = ApiEnvelope<ApiSfFinancialAccount[]>;

export interface ApiSfFinancialHolding {
  Id: string;
  Name: string;
  FinServ__Symbol__c: string | null;
  FinServ__MarketValue__c: number;
  FinServ__GainLoss__c: number | null;
  FinServ__Shares__c: number;
  FinServ__Price__c: number;
  FinServ__FinancialAccount__c: string;
  FinServ__FinancialAccount__r: { Name: string };
}

export type ApiSfFinancialHoldingListResponse = ApiEnvelope<ApiSfFinancialHolding[]>;

export interface ApiSfFinancialGoal {
  Id: string;
  Name: string;
  FinServ__Type__c: string;
  FinServ__TargetValue__c: number;
  FinServ__ActualValue__c: number;
  FinServ__TargetDate__c: string | null;
  FinServ__Status__c: string;
  FinServ__PrimaryOwner__c: string;
}

export type ApiSfFinancialGoalListResponse = ApiEnvelope<ApiSfFinancialGoal[]>;

export interface ApiSfRevenue {
  Id: string;
  FinServ__Amount__c: number;
  FinServ__RevenueDate__c: string;
  FinServ__FinancialAccount__r: {
    FinServ__PrimaryOwner__c: string;
  };
}

export type ApiSfRevenueListResponse = ApiEnvelope<ApiSfRevenue[]>;

export interface ApiSfTask {
  Id: string;
  Subject: string;
  Status: string;
  Priority?: string;
  ActivityDate?: string | null;
  Type?: string | null;
  WhatId?: string | null;
  What?: { Name: string } | null;
  WhoId?: string | null;
  Who?: { Name: string } | null;
  OwnerId?: string;
  Description?: string | null;
  CreatedDate?: string;
}

export type ApiSfTaskListResponse = ApiEnvelope<ApiSfTask[]>;

export interface ApiSfEvent {
  Id: string;
  Subject: string;
  StartDateTime: string;
  EndDateTime?: string;
  Type?: string | null;
  WhatId?: string | null;
  What?: { Name: string } | null;
  WhoId?: string | null;
  Who?: { Name: string } | null;
  Location?: string | null;
  OwnerId?: string;
}

export type ApiSfEventListResponse = ApiEnvelope<ApiSfEvent[]>;

export interface ApiSfCase {
  Id: string;
  Subject: string;
  Status: string;
  Priority?: string;
  Type?: string | null;
  CreatedDate?: string;
  ClosedDate?: string | null;
  AccountId?: string | null;
  Account?: { Name: string } | null;
  ContactId?: string | null;
  Description?: string | null;
  OwnerId?: string;
}

export type ApiSfCaseListResponse = ApiEnvelope<ApiSfCase[]>;

export interface ApiSfOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  AccountId: string | null;
  Account: { Name: string } | null;
  LastActivityDate: string | null;
  OwnerId: string;
}

export type ApiSfOpportunityListResponse = ApiEnvelope<ApiSfOpportunity[]>;

export interface ApiSfUser {
  Id: string;
  Name: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string | null;
  Title: string | null;
  SmallPhotoUrl: string | null;
  IsActive: boolean;
  Profile: { Name: string };
}

export type ApiSfUserResponse = ApiEnvelope<ApiSfUser>;

export interface ApiSfAssetOrLiability {
  Id: string;
  Name: string;
  FinServ__Amount__c: number;
  FinServ__AssetsAndLiabilitiesType__c: string;
  FinServ__PrimaryOwner__c: string;
}

export type ApiSfAssetsAndLiabilitiesResponse = ApiEnvelope<ApiSfAssetOrLiability[]>;

export interface ApiSfDocument {
  ContentDocument: {
    Id: string;
    Title: string;
    FileType: string;
    CreatedDate: string;
  };
  LinkedEntityId: string;
}

export type ApiSfDocumentListResponse = ApiEnvelope<ApiSfDocument[]>;

export interface ApiSfBeneficiaryParty {
  FinancialAccountId: string;
  Role: string;
  RelatedAccount: { Name: string };
}

export type ApiSfBeneficiaryPartyListResponse = ApiEnvelope<ApiSfBeneficiaryParty[]>;

export interface ApiSfSalesGoal {
  goalType: "recurring" | "non-recurring";
  label: string;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
  period: string;
}

export type ApiSfSalesGoalListResponse = ApiEnvelope<ApiSfSalesGoal[]>;

export interface ApiSfComplianceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  clientName: string;
  householdId: string;
  status: "current" | "expiring_soon" | "overdue" | "pending";
  dueDate: string;
  lastCompleted: string | null;
  assignedTo: string;
  sfTaskId: string | null;
  sfCaseId: string | null;
  sfDocumentId: string | null;
}

export type ApiSfComplianceItemListResponse = ApiEnvelope<ApiSfComplianceItem[]>;

export interface ApiDashboardSummaryResponse {
  totalAUM: number;
  totalAUMChange: number;
  aumTrend: number[];
  totalClients: number;
  clientSegments: { segment: string; count: number }[];
  netFlowsYTD: number;
  netFlowsTrend: number[];
  meetingsToday: number;
  revenueYTD: number;
  salesGoals: ApiSfSalesGoal[];
}

export type ApiDashboardResponse = ApiEnvelope<ApiDashboardSummaryResponse>;

export interface ApiClientRosterEntry {
  sfId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  employer: string | null;
  riskTolerance: string | null;
  dateOfBirth: string | null;
  city: string | null;
  state: string | null;
  householdSfId: string;
  householdName: string;
  status: string;
  segment: string;
  orionHouseholdId: number | null;
  totalAUM: number;
  accountCount: number;
  lastReview: string | null;
  nextReview: string | null;
}

export type ApiClientRosterResponse = ApiEnvelope<ApiClientRosterEntry[]>;

export interface ApiClient360Response {
  household: ApiSfHousehold;
  members: ApiSfPersonAccount[];
  financialAccounts: ApiSfFinancialAccount[];
  goals: ApiSfFinancialGoal[];
  assetsAndLiabilities: ApiSfAssetOrLiability[];
  orionAccounts: ApiOrionAccount[];
  orionPerformance: ApiOrionPerformancePeriod[];
  orionAumHistory: ApiOrionAumDataPoint[];
  orionBalanceSheet: ApiOrionBalanceSheet | null;
  tasks: ApiSfTask[];
  events: ApiSfEvent[];
  cases: ApiSfCase[];
  documents: ApiSfDocument[];
}

export type ApiClient360FullResponse = ApiEnvelope<ApiClient360Response>;

export interface ApiAlertEntry {
  id: string;
  source: "orion" | "salesforce";
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  clientId: string | null;
  clientName: string | null;
  createdAt: string;
  actionUrl: string | null;
  estimatedValue: number | null;
  read: boolean;
}

export type ApiAlertsResponse = ApiEnvelope<ApiAlertEntry[]>;
