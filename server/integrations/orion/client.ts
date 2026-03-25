import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { logger } from "../../lib/logger";
import type {
  OrionTokenResponse,
  OrionClientHousehold,
  OrionClientVerbose,
  OrionClientValue,
  OrionAccountDetail,
  OrionAccountValue,
  OrionAsset,
  OrionTransactionDetail,
  OrionPerformanceSummary,
  OrionPerformanceInterval,
  OrionAumOverTime,
  OrionGoalTracking,
  OrionBalanceSheet,
  OrionRmdCalculation,
  OrionModelTolerance,
  OrionPortfolioTree,
  OrionTaxLot,
  OrionReportingScopeRequest,
  OrionReportingScopeResponse,
  OrionRepresentativeValue,
  OrionBillingSummary,
  OrionBillingInstance,
  OrionBillingSchedule,
  OrionPlanningNetWorth,
  OrionPlanningAggregatedAccount,
  OrionComplianceRiskTile,
  OrionComplianceAccountAlert,
  OrionOutOfTolerance,
  OrionTaxLossHarvestingRequest,
  OrionRebalanceRequest,
  OrionRebalanceProposal,
  OrionTaxLossHarvestingResult,
  OrionHiddenLeversRiskProfile,
  OrionHiddenLeversStressTest,
  OrionUnmanagedAsset,
  OrionDocument,
  OrionRegistration,
  OrionSurveyResult,
  OrionBeneficiary,
  OrionRepresentativeDetail,
  OrionAccountPosition,
  OrionCostBasisReport,
} from "../../types/orion-api";

export type OrionAccount = {
  id: string;
  accountNumber: string;
  name: string;
  custodian: string;
  accountType: string;
  status: string;
  totalValue: number;
  baseCurrency: string;
  lastUpdated: string;
};

export type OrionHolding = {
  id: string;
  ticker: string;
  description: string;
  quantity: number;
  marketValue: number;
  percentOfAccount: number;
  costBasis: number;
  unrealizedGainLoss: number;
  sector: string;
  assetClass: string;
};

export type OrionPerformance = {
  period: string;
  returnPct: number;
  benchmarkPct: number;
  outperformance: number;
  since: string;
};

export type OrionTransaction = {
  id: string;
  date: string;
  type: "BUY" | "SELL" | "DIVIDEND" | "TRANSFER";
  ticker: string;
  shares: number;
  quantity: number;
  price: number;
  amount: number;
  commission: number;
};

const ORION_CONFIG = {
  baseUrl: process.env.ORION_BASE_URL || "https://api.orionadvisor.com/api/v1",
  testBaseUrl: "https://testapi.orionadvisor.com/api/v1",
  username: process.env.ORION_USERNAME,
  password: process.env.ORION_PASSWORD,
  apiKey: process.env.ORION_API_KEY,
  timeout: Math.max(1000, parseInt(process.env.ORION_TIMEOUT || "30000", 10) || 30000),
  retryAttempts: Math.max(0, Number.isNaN(parseInt(process.env.ORION_RETRY_COUNT ?? "", 10)) ? 3 : parseInt(process.env.ORION_RETRY_COUNT!, 10)),
  retryBaseDelay: 1000,
  retryMaxDelay: 10000,
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function isOrionEnabled(): boolean {
  return process.env.ORION_ENABLED === "true" && !!(ORION_CONFIG.apiKey || ORION_CONFIG.username);
}

async function getOrionToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (!ORION_CONFIG.username || !ORION_CONFIG.password) {
    return null;
  }

  try {
    const response = await axios.post<OrionTokenResponse>(
      `${ORION_CONFIG.baseUrl}/Security/Token`,
      {},
      {
        timeout: 10000,
        headers: {
          Authorization: `Basic ${Buffer.from(`${ORION_CONFIG.username}:${ORION_CONFIG.password}`).toString("base64")}`,
        },
      }
    );
    cachedToken = {
      token: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
    };
    return cachedToken.token;
  } catch (err: unknown) {
    logger.error({ err }, "[Orion Client] Token acquisition failed");
    return null;
  }
}

let orionClient: AxiosInstance | null = null;

function getOrionClient(): AxiosInstance | null {
  if (!isOrionEnabled()) return null;

  if (!orionClient) {
    orionClient = axios.create({
      baseURL: ORION_CONFIG.baseUrl,
      timeout: ORION_CONFIG.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    orionClient.interceptors.request.use(async (config) => {
      const token = await getOrionToken();
      if (token) {
        config.headers.Authorization = `Session ${token}`;
      } else if (ORION_CONFIG.apiKey) {
        config.headers.Authorization = `Bearer ${ORION_CONFIG.apiKey}`;
      }
      return config;
    });

    orionClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as InternalAxiosRequestConfig & { retryCount?: number };
        if (!config) return Promise.reject(error);

        const statusCode = error.response?.status;
        const isNetworkError = !error.response;
        const isServerError = statusCode && statusCode >= 500;
        const isRateLimited = statusCode === 429;

        if (statusCode && statusCode >= 400 && statusCode < 500 && !isRateLimited) {
          return Promise.reject(error);
        }

        config.retryCount = (config.retryCount || 0) + 1;

        if ((isNetworkError || isServerError || isRateLimited) && config.retryCount <= ORION_CONFIG.retryAttempts) {
          const jitter = 0.5 + Math.random() * 0.5;
          const delay = Math.min(
            ORION_CONFIG.retryBaseDelay * Math.pow(2, config.retryCount - 1) * jitter,
            ORION_CONFIG.retryMaxDelay
          );
          logger.warn(
            { retryCount: config.retryCount, delay: Math.round(delay), statusCode, url: config.url },
            "[Orion Client] Retrying request"
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return orionClient!(config);
        }

        return Promise.reject(error);
      }
    );
  }

  return orionClient;
}

async function validateConnection(): Promise<boolean> {
  if (!isOrionEnabled()) return false;

  try {
    const client = getOrionClient();
    if (!client) return false;
    const response = await client.get("/Portfolio/Clients", { params: { top: 1 } });
    return response.status === 200;
  } catch (err: unknown) {
    logger.error({ err }, "[Orion Client] Validation failed");
    return false;
  }
}

async function getAccounts(): Promise<OrionAccount[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Portfolio/Accounts");
  return response.data || [];
}

async function getAccount(accountId: string): Promise<OrionAccount | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Accounts/${accountId}`);
  return response.data || null;
}

async function getHoldings(accountId: string): Promise<OrionHolding[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Assets`);
  return response.data || [];
}

async function getPerformance(
  accountId: string,
  period = "YTD"
): Promise<OrionPerformance | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Performance/Summary`);
  return response.data || null;
}

async function getTransactions(
  accountId: string,
  sinceDate?: string
): Promise<OrionTransaction[]> {
  const client = getOrionClient();
  if (!client) return [];
  const params: Record<string, string> = {};
  if (sinceDate) params.since = sinceDate;
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Transactions`, { params });
  return response.data || [];
}

async function getHouseholds(): Promise<OrionClientHousehold[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Portfolio/Clients");
  return response.data || [];
}

async function getHouseholdsSimple(): Promise<OrionClientHousehold[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Portfolio/Clients/Simple");
  return response.data || [];
}

async function getHouseholdsValue(): Promise<OrionClientValue[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Portfolio/Clients/Value");
  return response.data || [];
}

async function getHouseholdById(clientId: number): Promise<OrionClientHousehold | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Clients/${clientId}`);
  return response.data || null;
}

async function getHouseholdVerbose(clientId: number): Promise<OrionClientVerbose | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Clients/Verbose/${clientId}`);
  return response.data || null;
}

async function getHouseholdValue(clientId: number): Promise<OrionClientValue | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Clients/${clientId}/Value`);
  return response.data || null;
}

async function searchHouseholds(searchTerm: string): Promise<OrionClientHousehold[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/Simple/Search/${encodeURIComponent(searchTerm)}`);
  return response.data || [];
}

async function getPortfolioTree(clientId: number): Promise<OrionPortfolioTree | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Clients/${clientId}/PortfolioTree`);
  return response.data || null;
}

async function getHouseholdAccounts(clientId: number): Promise<OrionAccountDetail[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/Accounts`);
  return response.data || [];
}

async function getHouseholdAccountsValue(clientId: number): Promise<OrionAccountValue[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/Accounts/Value`);
  return response.data || [];
}

async function getHouseholdAssets(clientId: number, asOfDate?: string): Promise<OrionAsset[]> {
  const client = getOrionClient();
  if (!client) return [];
  const url = asOfDate
    ? `/Portfolio/Clients/${clientId}/Assets/${asOfDate}`
    : `/Portfolio/Clients/${clientId}/Assets`;
  const response = await client.get(url);
  return response.data || [];
}

async function getHouseholdTransactions(clientId: number): Promise<OrionTransactionDetail[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/Transactions`);
  return response.data || [];
}

async function getHouseholdDocuments(clientId: number): Promise<OrionDocument[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/Documents`);
  return response.data || [];
}

async function getHouseholdPerformanceSummary(clientId: number): Promise<OrionPerformanceSummary | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Clients/${clientId}/Performance/Summary`);
  return response.data || null;
}

async function getHouseholdPerformanceInterval(clientId: number): Promise<OrionPerformanceInterval[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/Performance/Interval`);
  return response.data || [];
}

async function getHouseholdAumOverTime(clientId: number): Promise<OrionAumOverTime[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/AumOverTime`);
  return response.data || [];
}

async function getHouseholdGoalTracking(clientId: number): Promise<OrionGoalTracking[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/GoalTracking`);
  return response.data || [];
}

async function getHouseholdBalanceSheet(clientId: number): Promise<OrionBalanceSheet | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Clients/${clientId}/BalanceSheet`);
  return response.data || null;
}

async function getHouseholdRmdCalculations(clientId: number): Promise<OrionRmdCalculation[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/RmdCalculations`);
  return response.data || [];
}

async function getHouseholdModelTolerance(clientId: number): Promise<OrionModelTolerance | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Clients/${clientId}/ModelTolerance`);
  return response.data || null;
}

async function getHouseholdRegistrations(clientId: number): Promise<OrionRegistration[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Clients/${clientId}/Registrations`);
  return response.data || [];
}

async function getAccountValue(accountId: number): Promise<OrionAccountValue | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Value`);
  return response.data || null;
}

async function getAccountAssets(accountId: number): Promise<OrionAsset[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Assets`);
  return response.data || [];
}

async function getAccountAssetsValue(accountId: number): Promise<OrionAsset[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Assets/Value`);
  return response.data || [];
}

async function getAccountTransactions(accountId: number): Promise<OrionTransactionDetail[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Transactions`);
  return response.data || [];
}

async function getAccountPerformanceSummary(accountId: number): Promise<OrionPerformanceSummary | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Accounts/${accountId}/Performance/Summary`);
  return response.data || null;
}

async function getAccountTaxLots(accountId: number): Promise<OrionTaxLot[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Accounts/${accountId}/TaxLot`);
  return response.data || [];
}

async function getAccountRmdCalculation(accountId: number): Promise<OrionRmdCalculation | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Accounts/${accountId}/RmdCalculation`);
  return response.data || null;
}

async function getAccountModelTolerance(accountId: number): Promise<OrionModelTolerance | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Accounts/${accountId}/ModelTolerance`);
  return response.data || null;
}

async function getAccountBeneficiaries(accountId: number): Promise<OrionBeneficiary[]> {
  const client = getOrionClient();
  if (!client) return [];
  // Orion endpoint: GET /Portfolio/Accounts/AccountInformation/Beneficiaries/{accountId}
  // NOTE: This requires an accountId, NOT a repId (representative ID).
  const response = await client.get(`/Portfolio/Accounts/AccountInformation/Beneficiaries/${accountId}`);
  return response.data || [];
}

async function getRepresentativesValue(): Promise<OrionRepresentativeValue[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Portfolio/Representatives/Value");
  return response.data || [];
}

async function getRepresentativeById(repId: number): Promise<OrionRepresentativeDetail | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Portfolio/Representatives/${repId}`);
  return response.data || null;
}

async function postReportingScope(request: OrionReportingScopeRequest): Promise<OrionReportingScopeResponse[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.post("/Reporting/Scope", request);
  return response.data || [];
}

async function postReportingPerformanceOverview(body: OrionReportingScopeRequest): Promise<OrionReportingScopeResponse[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.post("/Reporting/Performance/Overview", body);
  return response.data || [];
}

async function getComplianceRiskTiles(): Promise<OrionComplianceRiskTile[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Compliance/RiskDashboard/RiskTiles");
  return response.data || [];
}

async function getComplianceAccountAlerts(): Promise<OrionComplianceAccountAlert[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Compliance/RiskDashboard/AccountAlerts");
  return response.data || [];
}

async function getComplianceOutOfTolerance(daysOut: number): Promise<OrionOutOfTolerance[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Compliance/RiskDashboard/OutOfTolerance/${daysOut}`);
  return response.data || [];
}

async function getBillingSummary(): Promise<OrionBillingSummary | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get("/Billing/BillGenerator/Summary");
  return response.data || null;
}

async function getBillingInstance(instanceId: number): Promise<OrionBillingInstance | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Billing/Instances/${instanceId}`);
  return response.data || null;
}

async function getBillingSchedules(): Promise<OrionBillingSchedule[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Billing/Schedules");
  return response.data || [];
}

async function getPlanningNetWorth(clientId: number): Promise<OrionPlanningNetWorth | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get(`/Planning/NetWorth/${clientId}`);
  return response.data || null;
}

async function getPlanningAggregatedAccounts(clientId: number): Promise<OrionPlanningAggregatedAccount[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Planning/Accounts/Aggregated/${clientId}`);
  return response.data || [];
}

async function postTaxLossHarvesting(request: OrionTaxLossHarvestingRequest): Promise<OrionTaxLossHarvestingResult[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.post("/Trading/TaxLossHarvesting", request);
  return response.data || [];
}

async function postRebalance(request: OrionRebalanceRequest): Promise<OrionRebalanceProposal[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.post("/Trading/Rebalance", request);
  return response.data || [];
}

async function getRiskProfile(body: { clientId: number; portfolioId?: number }): Promise<OrionHiddenLeversRiskProfile | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.post("/Integrations/HiddenLevers/RiskProfile", body);
  return response.data || null;
}

async function getStressTestClient(clientId: number): Promise<OrionHiddenLeversStressTest[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Integrations/HiddenLevers/StressTest/Client/${clientId}`);
  return response.data || [];
}

async function getSurveyResults(): Promise<OrionSurveyResult[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Integrations/HiddenLevers/GetSurveyResults");
  return response.data || [];
}

async function getUnmanagedAssets(): Promise<OrionUnmanagedAsset[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get("/Reporting/UnmanagedAssets");
  return response.data || [];
}

async function batchAccountPositions(accountIds: number[]): Promise<OrionAccountPosition[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.post("/Portfolio/Accounts/Positions/Batch", { accountIds });
  return response.data || [];
}

async function getRmdByRep(repId: number): Promise<OrionRmdCalculation[]> {
  const client = getOrionClient();
  if (!client) return [];
  const response = await client.get(`/Portfolio/Accounts/AccountInformation/Rmd/${repId}`);
  return response.data || [];
}

async function getReportingActivityCostBasis(entity: string, entityId: number): Promise<OrionCostBasisReport | null> {
  const client = getOrionClient();
  if (!client) return null;
  const response = await client.get("/Reporting/Activity/CostBasis", { params: { entity, entityId } });
  return response.data || null;
}

export {
  getOrionClient,
  getOrionToken,
  validateConnection,
  isOrionEnabled,
  getAccounts,
  getAccount,
  getHoldings,
  getPerformance,
  getTransactions,
  getHouseholds,
  getHouseholdsSimple,
  getHouseholdsValue,
  getHouseholdById,
  getHouseholdVerbose,
  // ── ACTIVELY USED (called by MuleSoft adapter or route handlers) ──
  postReportingScope,               // Core: Reporting/Scope for performance, tax, allocation, income
  getAccountBeneficiaries,          // Estate planning: beneficiary designations
  getRepresentativeById,            // Auth: advisor lookup

  // ── AVAILABLE FOR FUTURE USE ──
  // These functions wrap Orion REST API endpoints and are ready to use when
  // the corresponding UI features are built. Not currently called in production.
  // Household-level
  getHouseholdValue,                // Future: household AUM dashboard
  searchHouseholds,                 // Future: household search/autocomplete
  getPortfolioTree,                 // Future: portfolio hierarchy view
  getHouseholdAccounts,             // Future: household-level account list
  getHouseholdAccountsValue,        // Future: household account values
  getHouseholdAssets,               // Future: household-level asset view
  getHouseholdTransactions,         // Future: household transaction history
  getHouseholdDocuments,            // Future: document vault
  getHouseholdPerformanceSummary,   // Future: household performance
  getHouseholdPerformanceInterval,  // Future: performance over custom intervals
  getHouseholdAumOverTime,          // Future: real AUM sparkline (replaces approximation)
  getHouseholdGoalTracking,         // Future: financial goal tracking
  getHouseholdBalanceSheet,         // Future: balance sheet view
  getHouseholdRmdCalculations,      // Future: RMD calculations
  getHouseholdModelTolerance,       // Future: model tolerance/drift
  getHouseholdRegistrations,        // Future: registration types
  // Account-level
  getAccountValue,                  // Future: single account value
  getAccountAssets,                 // Future: single account holdings
  getAccountAssetsValue,            // Future: account asset values
  getAccountTransactions,           // Future: account transaction log
  getAccountPerformanceSummary,     // Future: account performance
  getAccountTaxLots,                // Future: tax lot detail view
  getAccountRmdCalculation,         // Future: account-level RMD
  getAccountModelTolerance,         // Future: account model tolerance
  // Representative-level
  getRepresentativesValue,          // Future: multi-advisor AUM comparison
  // Reporting
  postReportingPerformanceOverview, // Future: performance overview report
  getReportingActivityCostBasis,    // Future: activity-based cost basis
  // Compliance
  getComplianceRiskTiles,           // Future: compliance dashboard tiles
  getComplianceAccountAlerts,       // Future: compliance alert feed
  getComplianceOutOfTolerance,      // Future: out-of-tolerance accounts
  // Billing
  getBillingSummary,                // Future: real revenue data (replaces 85bps estimate)
  getBillingInstance,               // Future: billing detail
  getBillingSchedules,              // Future: billing schedule management
  // Planning
  getPlanningNetWorth,              // Future: planning net worth calc
  getPlanningAggregatedAccounts,    // Future: aggregated planning view
  // Trading
  postTaxLossHarvesting,            // Future: automated tax loss harvesting
  postRebalance,                    // Future: portfolio rebalancing
  // Risk & Analysis
  getRiskProfile,                   // Future: risk profiling
  getStressTestClient,              // Future: stress test scenarios
  getSurveyResults,                 // Future: client survey data
  getUnmanagedAssets,               // Future: held-away asset tracking
  batchAccountPositions,            // Future: batch position queries
  getRmdByRep,                      // Future: rep-level RMD aggregation
};
