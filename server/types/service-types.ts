export interface ServiceToOrionMapping {
  service: string;
  orionEndpoint: string | null;
  primarySource: "orion" | "salesforce" | "local" | "computed" | "both";
  notes: string;
}

export const SERVICE_TO_ORION_MAP: ServiceToOrionMapping[] = [
  { service: "dashboardService.getSummaryCards", orionEndpoint: "GET /v1/Portfolio/Representatives/Value", primarySource: "orion", notes: "AUM from Orion rep value, local DB fallback" },
  { service: "dashboardService.getBookSnapshot", orionEndpoint: "GET /v1/Portfolio/Representatives/Value", primarySource: "orion", notes: "AUM from Orion rep value, local DB fallback" },
  { service: "dashboardService.getSalesGoals", orionEndpoint: null, primarySource: "salesforce", notes: "Sales goals from SF custom object" },
  { service: "dashboardService.getTodaysSchedule", orionEndpoint: null, primarySource: "salesforce", notes: "SF Events, local meetings fallback" },
  { service: "dashboardService.getUpcomingMeetings", orionEndpoint: null, primarySource: "salesforce", notes: "SF Events, local meetings fallback" },
  { service: "dashboardService.getAlerts", orionEndpoint: null, primarySource: "local", notes: "Local DB alerts" },
  { service: "dashboardService.getTasks", orionEndpoint: null, primarySource: "salesforce", notes: "SF Tasks, local tasks fallback" },
  { service: "dashboardService.getGoals", orionEndpoint: null, primarySource: "salesforce", notes: "SF FinancialGoal__c" },

  { service: "clientService.getRoster", orionEndpoint: null, primarySource: "local", notes: "Local DB client roster" },
  { service: "clientService.getHouseholds", orionEndpoint: null, primarySource: "local", notes: "Local DB households" },
  { service: "clientService.getProfile", orionEndpoint: null, primarySource: "local", notes: "Local DB client profile" },
  { service: "clientService.getAccounts", orionEndpoint: "POST /v1/Portfolio/Accounts/Positions/Batch", primarySource: "orion", notes: "Orion positions merged into local accounts via orionAccountId" },
  { service: "clientService.getAccountsByHousehold", orionEndpoint: null, primarySource: "local", notes: "Local DB accounts by household" },
  { service: "clientService.getHouseholdMembers", orionEndpoint: null, primarySource: "local", notes: "Local DB household members" },
  { service: "clientService.getLifeEvents", orionEndpoint: null, primarySource: "local", notes: "Local DB life events" },
  { service: "clientService.getTransactions", orionEndpoint: null, primarySource: "local", notes: "Local DB transactions" },
  { service: "clientService.getDocuments", orionEndpoint: null, primarySource: "salesforce", notes: "SF ContentDocument via sfContactId, local fallback" },
  { service: "clientService.getTierDefinitions", orionEndpoint: null, primarySource: "local", notes: "Static tier configuration" },

  { service: "portfolioService.getAllocation", orionEndpoint: null, primarySource: "local", notes: "Computed from local holdings" },
  { service: "portfolioService.getHoldings", orionEndpoint: null, primarySource: "local", notes: "Local DB holdings" },
  { service: "portfolioService.getPerformance", orionEndpoint: null, primarySource: "local", notes: "Local DB performance" },
  { service: "portfolioService.getAlternatives", orionEndpoint: "GET /v1/Reporting/UnmanagedAssets", primarySource: "orion", notes: "Orion unmanaged/outside assets" },
  { service: "portfolioService.getProjection", orionEndpoint: null, primarySource: "computed", notes: "Computed portfolio projection from local account balances with growth assumptions" },
  { service: "portfolioService.getMarket", orionEndpoint: null, primarySource: "computed", notes: "Market index data summary (static pending live market feed)" },

  { service: "taxService.getTLHOpps", orionEndpoint: "POST /v1/Trading/TaxLossHarvesting", primarySource: "orion", notes: "Orion Eclipse TLH via orionAccountId" },
  { service: "taxService.getRebalance", orionEndpoint: "POST /v1/Trading/Rebalance", primarySource: "orion", notes: "Orion rebalance trade proposals via orionAccountId" },
  { service: "taxService.getRothConversionOpps", orionEndpoint: null, primarySource: "computed", notes: "Computed from local IRA account balances with tax rate assumptions" },
  { service: "taxService.getTaxProjection", orionEndpoint: "POST /v1/Reporting/Scope", primarySource: "orion", notes: "Orion Scope managed=16 (Tax Detail)" },
  { service: "taxService.getTaxLots", orionEndpoint: "GET /v1/Portfolio/Accounts/{accountId}/TaxLot", primarySource: "orion", notes: "Orion tax lots via orionAccountId" },
  { service: "taxService.getRMDs", orionEndpoint: "GET /v1/Portfolio/Accounts/{accountId}/RmdCalculation", primarySource: "orion", notes: "Orion per-account RMD via orionAccountId" },

  { service: "analyticsService.getKPIs", orionEndpoint: "GET /v1/Portfolio/Representatives/Value", primarySource: "orion", notes: "AUM from Orion rep value, counts from local DB" },
  { service: "analyticsService.getAUMBySegment", orionEndpoint: "GET /v1/Portfolio/Representatives/Value", primarySource: "both", notes: "Segment from SF/local clients, AUM from Orion rep value with local fallback" },
  { service: "analyticsService.getAtRiskClients", orionEndpoint: null, primarySource: "computed", notes: "Computed from local contact dates + compliance status scoring" },
  { service: "analyticsService.getCapacity", orionEndpoint: null, primarySource: "local", notes: "Client/household counts from local DB" },

  { service: "riskService.getRiskProfile", orionEndpoint: "POST /v1/Integrations/HiddenLevers/RiskProfile", primarySource: "orion", notes: "Orion HiddenLevers; takes Orion client ID directly" },
  { service: "riskService.getStressTest", orionEndpoint: "GET /v1/Integrations/HiddenLevers/StressTest/Client/{clientId}", primarySource: "orion", notes: "Orion HiddenLevers; takes Orion client ID directly" },
  { service: "riskService.getSurveyResults", orionEndpoint: "GET /v1/Integrations/HiddenLevers/GetSurveyResults", primarySource: "orion", notes: "Global survey results from Orion" },

  { service: "billingService.getRevenueYTD", orionEndpoint: "GET /v1/Billing/BillGenerator/Summary", primarySource: "orion", notes: "Orion billing summary, local DB fallback" },

  { service: "planningService.getNetWorth", orionEndpoint: "POST /v1/Portfolio/Accounts/Positions/Batch", primarySource: "orion", notes: "Orion account positions summed, local DB fallback" },
  { service: "planningService.getAggregatedAccounts", orionEndpoint: null, primarySource: "local", notes: "Local DB accounts" },

  { service: "engagementService.getActionQueue", orionEndpoint: null, primarySource: "salesforce", notes: "SF open tasks, local DB fallback" },
  { service: "engagementService.getEngagementScores", orionEndpoint: null, primarySource: "local", notes: "Local client data with lastContactDate scoring" },

  { service: "complianceService.getItems", orionEndpoint: null, primarySource: "local", notes: "Local DB compliance items" },
  { service: "complianceService.getHealthScore", orionEndpoint: null, primarySource: "computed", notes: "Computed from local compliance items" },
  { service: "complianceService.getCategories", orionEndpoint: null, primarySource: "local", notes: "Static compliance category definitions" },

  { service: "configService.getAdvisor", orionEndpoint: null, primarySource: "salesforce", notes: "SF User profile merged into local advisor record" },
  { service: "configService.getOrionMappings", orionEndpoint: null, primarySource: "local", notes: "Static Orion-to-SF field mapping config" },
  { service: "configService.getNavItems", orionEndpoint: null, primarySource: "local", notes: "Static navigation configuration" },
];

export type OrionEndpointKey =
  | "auth.getToken"
  | "auth.postToken"
  | "households.list"
  | "households.listSimple"
  | "households.listVerbose"
  | "households.listValue"
  | "households.getById"
  | "households.getVerbose"
  | "households.getValue"
  | "households.search"
  | "households.portfolioTree"
  | "households.accounts"
  | "households.accountsValue"
  | "households.assets"
  | "households.transactions"
  | "households.documents"
  | "households.performance"
  | "households.perfSummary"
  | "households.perfInterval"
  | "households.aumOverTime"
  | "households.goalTracking"
  | "households.balanceSheet"
  | "households.rmdCalculations"
  | "households.modelTolerance"
  | "households.registrations"
  | "accounts.list"
  | "accounts.getById"
  | "accounts.getValue"
  | "accounts.assets"
  | "accounts.assetsValue"
  | "accounts.transactions"
  | "accounts.performance"
  | "accounts.perfSummary"
  | "accounts.taxLot"
  | "accounts.rmdCalculation"
  | "accounts.modelTolerance"
  | "accounts.beneficiaries"
  | "representatives.list"
  | "representatives.getById"
  | "representatives.value"
  | "representatives.accounts"
  | "reporting.scope"
  | "reporting.perfVerbose"
  | "reporting.perfOverview"
  | "compliance.riskTiles"
  | "compliance.accountAlerts"
  | "compliance.outOfTolerance"
  | "billing.createInstance"
  | "billing.getInstance"
  | "billing.overview"
  | "billing.summary"
  | "billing.schedules"
  | "billing.planningFees"
  | "risk.riskProfile"
  | "risk.stressTest"
  | "risk.stressTestClient"
  | "risk.surveyResults"
  | "risk.riskRewardScores"
  | "planning.netWorth"
  | "planning.aggregatedAccounts"
  | "trading.taxLossHarvesting"
  | "trading.rebalance"
  | "bulk.batchAccountPositions"
  | "bulk.dataQueries";

export function resolveOrionEndpoint(serviceCall: string): ServiceToOrionMapping | undefined {
  const exact = SERVICE_TO_ORION_MAP.find(m => m.service === serviceCall);
  if (exact) return exact;
  const wildcardPrefix = serviceCall.split(".")[0] + ".";
  return SERVICE_TO_ORION_MAP.find(m => m.service.endsWith(".*") && m.service.startsWith(wildcardPrefix));
}

export function getOrionEndpointsForService(servicePrefix: string): ServiceToOrionMapping[] {
  return SERVICE_TO_ORION_MAP.filter(m => m.service.startsWith(servicePrefix));
}

export function isSalesforceOnlyService(serviceCall: string): boolean {
  const mapping = resolveOrionEndpoint(serviceCall);
  return mapping?.primarySource === "salesforce";
}

export interface DashboardSummaryCard {
  label: string;
  value: number;
  format: string;
  trendPct: number;
  trendDirection: "up" | "down" | "flat";
  source: "orion" | "salesforce" | "computed";
}

export interface BookSnapshot {
  totalAUM: number;
  revenueYTD: number;
  netFlowsMTD: number;
  netFlowsQTD: number;
  netFlowsYTD: number;
}

export interface MeetingDTO {
  id: string;
  advisorId: string;
  clientId: string | null;
  title: string;
  startTime: string;
  endTime: string | null;
  type: string;
  status: string;
  notes: string | null;
  location: string | null;
  source: "salesforce" | "local";
}

export interface TaskDTO {
  id: string;
  advisorId: string;
  clientId: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  category: string;
  source: "salesforce" | "local";
}

export interface DocumentDTO {
  id: string;
  clientId: string;
  name: string;
  type: string;
  status: string;
  uploadDate: string | null;
  expirationDate: string | null;
  fileName: string | null;
  source: "salesforce" | "local";
}

export interface EngagementScore {
  clientId: string;
  clientName: string;
  segment: string;
  lastContactDate: string | null;
  activitiesLast90Days: number;
  engagementLevel: "high" | "medium" | "low";
  source: "salesforce" | "local";
}

export interface RevenueYTD {
  totalFees: number;
  totalAssets: number;
  effectiveRate: number;
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: { street: string; city: string; state: string; zip: string };
  dateOfBirth: string;
  age: number;
  occupation: string;
  employer: string;
  segment: "A" | "B" | "C" | "D";
  status: "Active" | "Onboarding" | "Inactive" | "At-Risk";
  riskTolerance: "Conservative" | "Moderate" | "Moderately Aggressive" | "Aggressive";
  totalAUM: number;
  lastContactDays: number;
  annualIncome: number;
  taxFilingStatus: string;
  stateOfResidence: string;
  advisorId: string;
  onboardedDate: string;
  notes: string;
}

export interface AccountUI {
  id: string;
  clientId: string;
  name: string;
  type: string;
  custodian: string;
  accountNumber: string;
  balance: number;
  contributions_YTD: number;
  beneficiaryDesignated: boolean;
  lastRebalanced: string;
}

export interface HoldingUI {
  id: string;
  accountId: string;
  ticker: string;
  name: string;
  assetClass: string;
  sector: string;
  shares: number;
  costBasis: number;
  marketValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
  weight: number;
  dividendYield: number;
  expenseRatio: number;
}

export interface PerformancePeriodUI {
  period: string;
  returnPct: number;
  benchmarkPct: number;
  alpha: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface AssetAllocationSlice {
  sector: string;
  value: number;
  targetPct: number;
  actualPct: number;
  drift: number;
  color: string;
}

export interface AlertUI {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  read: boolean;
  estimatedValue: number | null;
  clientId: string | null;
  actionUrl: string;
  createdAt: string;
}

export interface SalesGoalUI {
  id: string;
  type: "recurring" | "non-recurring";
  label: string;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
  period: "YTD" | "QTD" | "MTD";
  sourceUrl: string;
}

export interface UpcomingMeetingUI {
  id: string;
  clientName: string;
  clientId: string;
  meetingType: string;
  date: string;
  time: string;
  endTime: string;
  source: "salesforce" | "local";
  location: string | null;
}

export interface GoalsWidget {
  aggregateFundedRatio: number;
  totalGoals: number;
  clientsWithGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  goalsByCategory: Array<{ category: string; count: number; funded: number }>;
}

export interface ActionItemUI {
  id: string;
  clientId: string;
  clientName: string;
  action: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  dueDate: string | null;
  status: string;
}
