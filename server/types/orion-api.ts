export interface OrionTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface OrionClientHousehold {
  id: number;
  name: string;
  isActive: boolean;
  createdDate: string;
  portfolio: string;
  managedValue: number;
  nonManagedValue: number;
  totalValue: number;
  startDate: string;
  endDate: string | null;
  hasNewPortfolio: boolean;
  userDefinedFields?: Record<string, string | number | boolean | null>;
}

export interface OrionClientVerbose extends OrionClientHousehold {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  dateOfBirth: string;
  taxId: string;
  representative: { id: number; name: string };
  registrations: OrionRegistration[];
}

export interface OrionClientValue {
  id: number;
  name: string;
  currentValue: number;
  asOfDate: string;
}

export interface OrionAccountDetail {
  id: number;
  name: string;
  number: string;
  accountType: string;
  custodian: string;
  status: string;
  managedValue: number;
  nonManagedValue: number;
  totalValue: number;
  fundFamily: string;
  portfolio: string;
  model: string;
  clientId: number;
  registrationId: number;
  startDate: string;
  taxStatus: string;
}

export interface OrionAccountValue extends OrionAccountDetail {
  currentValue: number;
  asOfDate: string;
}

export interface OrionRegistration {
  id: number;
  name: string;
  registrationType: string;
  ownerName: string;
  accounts: OrionAccountDetail[];
}

export interface OrionAsset {
  id: number;
  ticker: string;
  description: string;
  quantity: number;
  marketValue: number;
  percentOfAccount: number;
  costBasis: number;
  unrealizedGainLoss: number;
  sector: string;
  assetClass: string;
  asOfDate: string;
}

export interface OrionTransactionDetail {
  id: number;
  date: string;
  transType: string;
  ticker: string;
  description: string;
  quantity: number;
  price: number;
  amount: number;
  commission: number;
  accountId: number;
}

export interface OrionPerformanceSummary {
  entityId: number;
  entityName: string;
  periods: OrionPerformancePeriod[];
}

export interface OrionPerformancePeriod {
  periodName: string;
  startDate: string;
  endDate: string;
  beginningValue: number;
  endingValue: number;
  netFlows: number;
  gainLoss: number;
  returnPct: number;
  benchmarkReturnPct: number;
  alpha: number;
}

export interface OrionPerformanceInterval {
  date: string;
  value: number;
  cumulativeReturn: number;
  benchmarkReturn: number;
}

export interface OrionAumOverTime {
  date: string;
  aum: number;
  netFlows: number;
}

export interface OrionGoalTracking {
  goalId: number;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  fundedRatio: number;
  targetDate: string;
  onTrack: boolean;
}

export interface OrionBalanceSheet {
  assets: Array<{ category: string; value: number }>;
  liabilities: Array<{ category: string; value: number }>;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface OrionRmdCalculation {
  accountId: number;
  accountName: string;
  priorYearEndBalance: number;
  rmdAmount: number;
  distributionsTaken: number;
  remainingRmd: number;
  distributionDeadline: string;
}

export interface OrionModelTolerance {
  modelName: string;
  allocations: Array<{
    assetClass: string;
    targetPct: number;
    currentPct: number;
    driftPct: number;
    inTolerance: boolean;
  }>;
  overallDrift: number;
  inTolerance: boolean;
}

export interface OrionPortfolioTree {
  clientId: number;
  clientName: string;
  registrations: Array<{
    registrationId: number;
    registrationName: string;
    accounts: Array<{
      accountId: number;
      accountName: string;
      accountNumber: string;
      value: number;
    }>;
  }>;
}

export interface OrionTaxLot {
  accountId: number;
  ticker: string;
  description: string;
  purchaseDate: string;
  quantity: number;
  costBasis: number;
  marketValue: number;
  unrealizedGainLoss: number;
  holdingPeriod: "short-term" | "long-term";
  lotId: number;
}

export interface OrionReportingScopeRequest {
  entity: "Representative" | "Client" | "Account" | "Registration";
  entityIds: number[];
  managed: number;
  startDate?: string;
  endDate?: string;
  benchmark?: string;
}

export interface OrionReportingScopeResponse {
  entityId: number;
  entityName: string;
  performance?: OrionPerformancePeriod[];
  allocation?: OrionAllocationDetail[];
  activity?: OrionActivityDetail[];
  portfolioDetail?: OrionPortfolioDetailItem[];
  taxDetail?: OrionTaxDetailItem[];
}

export interface OrionAllocationDetail {
  assetClass: string;
  marketValue: number;
  percentOfTotal: number;
  targetPct: number;
  driftPct: number;
}

export interface OrionActivityDetail {
  date: string;
  type: string;
  description: string;
  amount: number;
  ticker: string;
}

export interface OrionPortfolioDetailItem {
  accountId: number;
  accountName: string;
  value: number;
  holdings: OrionAsset[];
}

export interface OrionTaxDetailItem {
  accountId: number;
  ticker: string;
  costBasis: number;
  marketValue: number;
  unrealizedGainLoss: number;
  holdingPeriod: string;
}

export interface OrionRepresentative {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  totalAum: number;
  clientCount: number;
}

export interface OrionRepresentativeValue {
  id: number;
  name: string;
  currentValue: number;
  asOfDate: string;
}

export interface OrionBillingInstance {
  id: number;
  name: string;
  createdDate: string;
  status: string;
  totalFees: number;
  totalAssets: number;
  effectiveRate: number;
}

export interface OrionBillingSummary {
  totalFees: number;
  totalAssets: number;
  effectiveRate: number;
  instanceCount: number;
}

export interface OrionBillingSchedule {
  id: number;
  name: string;
  frequency: string;
  nextBillDate: string;
}

export interface OrionPlanningNetWorth {
  clientId: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  asOfDate: string;
  breakdown: Array<{ category: string; value: number }>;
}

export interface OrionPlanningAggregatedAccount {
  accountId: number;
  accountName: string;
  accountType: string;
  balance: number;
  custodian: string;
  isManaged: boolean;
}

export interface OrionComplianceRiskTile {
  title: string;
  count: number;
  severity: string;
  category: string;
}

export interface OrionComplianceAccountAlert {
  accountId: number;
  accountName: string;
  alertType: string;
  message: string;
  severity: string;
  createdDate: string;
}

export interface OrionOutOfTolerance {
  accountId: number;
  accountName: string;
  modelName: string;
  driftPct: number;
  daysOutOfTolerance: number;
}

export interface OrionTaxLossHarvestingRequest {
  accountIds: number[];
  minLossThreshold?: number;
  excludeWashSale?: boolean;
}

export interface OrionTaxLossHarvestingResult {
  accountId: number;
  ticker: string;
  description: string;
  unrealizedLoss: number;
  estimatedTaxSavings: number;
  holdingPeriod: string;
  washSaleRisk: boolean;
  suggestedReplacement: string | null;
}

export interface OrionRebalanceProposal {
  accountId: number;
  ticker: string;
  description: string;
  currentShares: number;
  currentWeight: number;
  targetWeight: number;
  proposedShares: number;
  proposedTradeShares: number;
  tradeSide: "Buy" | "Sell";
  estimatedTradeAmount: number;
  modelId: number;
  modelName: string;
}

export interface OrionRebalanceRequest {
  accountIds: number[];
  modelId?: number;
  useSleeveLevel?: boolean;
  taxSensitive?: boolean;
}

export interface OrionHiddenLeversRiskProfile {
  clientId: number;
  riskScore: number;
  riskCategory: string;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
}

export interface OrionHiddenLeversStressTest {
  scenarioName: string;
  portfolioImpactPct: number;
  portfolioImpactDollar: number;
  benchmarkImpactPct: number;
}

export interface OrionUnmanagedAsset {
  id: number;
  name: string;
  value: number;
  assetType: string;
  custodian: string;
  lastUpdated: string;
}

export interface OrionDocument {
  fileId: number;
  fileName: string;
  fileType: string;
  uploadDate: string;
  fileSize: number;
}

export interface OrionUserDefinedField {
  fieldName: string;
  fieldValue: string;
  fieldType: string;
}

export interface OrionHiddenLeversRiskProfileRequest {
  clientId: number;
  portfolioId?: number;
}

export interface OrionSurveyResult {
  questionId: number;
  questionText: string;
  answer: string;
  score: number;
}

export interface OrionBeneficiary {
  accountId: number;
  beneficiaryName: string;
  beneficiaryType: string;
  percentage: number;
  relationship: string;
}

export interface OrionRepresentativeDetail {
  id: number;
  name: string;
  repNumber: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export interface OrionAccountPosition {
  accountId: number;
  ticker: string;
  description: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedGainLoss: number;
}

export interface OrionCostBasisReport {
  entityId: number;
  entityType: string;
  totalCostBasis: number;
  totalMarketValue: number;
  unrealizedGainLoss: number;
  items: Array<{
    ticker: string;
    description: string;
    costBasis: number;
    marketValue: number;
    gainLoss: number;
  }>;
}

export interface OrionPaginatedResponse<T> {
  results: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
