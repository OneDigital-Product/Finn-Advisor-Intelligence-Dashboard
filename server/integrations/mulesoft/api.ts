import { logger } from "../../lib/logger";
import type { PortfolioAccount } from "../adapters/portfolio-adapter";
import { getAccessToken, getApiBaseUrl, getTimeout, isMulesoftEnabled, clearTokenCache, isCircuitOpen, recordSuccess, recordFailure } from "./client";

// ---------------------------------------------------------------------------
// Bounded LRU cache — evicts oldest entry when full, respects TTL
// ---------------------------------------------------------------------------

/** Revalidation window — when an entry is within this many ms of expiring,
 *  `getWithSWR()` returns the stale data AND signals that a background
 *  refresh should happen. This eliminates "cold cache" pauses where an
 *  advisor waits for Orion while the cache rebuilds. */
const SWR_REVALIDATION_WINDOW = 2 * 60 * 1000; // 2 minutes before TTL expires

class BoundedCache<V> {
  private map = new Map<string, { data: V; ts: number }>();
  constructor(private maxSize: number, private ttl: number) {}

  get(key: string): V | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) { this.map.delete(key); return null; }
    return entry.data;
  }

  /**
   * Stale-while-revalidate read.
   * Returns `{ data, needsRevalidation }`:
   * - If fresh → data + needsRevalidation=false
   * - If within SWR window → data + needsRevalidation=true (caller should refresh in background)
   * - If expired → null + needsRevalidation=true
   */
  getWithSWR(key: string): { data: V | null; needsRevalidation: boolean } {
    const entry = this.map.get(key);
    if (!entry) return { data: null, needsRevalidation: true };
    const age = Date.now() - entry.ts;
    if (age > this.ttl) {
      this.map.delete(key);
      return { data: null, needsRevalidation: true };
    }
    // Within revalidation window — serve stale, signal background refresh
    if (age > this.ttl - SWR_REVALIDATION_WINDOW) {
      return { data: entry.data, needsRevalidation: true };
    }
    return { data: entry.data, needsRevalidation: false };
  }

  set(key: string, data: V): void {
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest) this.map.delete(oldest);
    }
    this.map.set(key, { data, ts: Date.now() });
  }

  /** Return stale entry (ignoring TTL) for fallback on errors */
  getStale(key: string): V | null {
    const entry = this.map.get(key);
    return entry ? entry.data : null;
  }
}

// ---------------------------------------------------------------------------
// In-flight request deduplication — prevents thundering herd on cache miss
// ---------------------------------------------------------------------------
const _inflightRequests = new Map<string, Promise<any>>();

/** Deduplicate concurrent calls: if a fetch for this key is already in-flight,
 *  await the same promise instead of firing a duplicate MuleSoft request. */
function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = _inflightRequests.get(key);
  if (existing) {
    logger.debug({ key }, "[MuleSoft SWR] Joining in-flight request (dedup)");
    return existing as Promise<T>;
  }
  const promise = fetcher().finally(() => {
    _inflightRequests.delete(key);
  });
  _inflightRequests.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// MuleSoft WAD EAPI – authenticated HTTP wrapper
// ---------------------------------------------------------------------------

export async function mulesoftFetch(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<Response> {
  if (isCircuitOpen()) {
    throw new Error(`MuleSoft circuit breaker OPEN — skipping ${path}`);
  }

  const token = await getAccessToken();
  if (!token) {
    recordFailure();
    throw new Error("MuleSoft authentication failed — no access token");
  }

  const url = `${getApiBaseUrl()}${path}`;
  const startMs = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers as Record<string, string> || {}),
      },
      signal: AbortSignal.timeout(getTimeout()),
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    logger.error({ endpoint: path, method: options.method || "GET", duration_ms: durationMs, cache_hit: false, error: String(err) }, "[MuleSoft Timing] Request failed");
    recordFailure();
    throw err;
  }

  const durationMs = Date.now() - startMs;

  if ((response.status === 401 || response.status === 403) && !retried) {
    // Auth failure — do NOT record as circuit breaker failure since retry handles it
    logger.warn({ path, status: response.status, duration_ms: durationMs }, "[MuleSoft API] Auth rejected, clearing token cache and retrying");
    clearTokenCache();
    return mulesoftFetch(path, options, true);
  }

  if (!response.ok) {
    logger.warn({ endpoint: path, method: options.method || "GET", duration_ms: durationMs, status_code: response.status, cache_hit: false }, "[MuleSoft Timing] Non-OK response");
    recordFailure();
    const errorText = await response.text();
    throw new Error(`MuleSoft API error ${response.status} on ${path}: ${errorText}`);
  }

  logger.info({ endpoint: path, method: options.method || "GET", duration_ms: durationMs, status_code: response.status, cache_hit: false }, "[MuleSoft Timing] Request completed");
  recordSuccess();
  return response;
}

// ---------------------------------------------------------------------------
// Safe JSON parser — wraps response.json() to handle non-JSON responses
// ---------------------------------------------------------------------------

async function safeJsonParse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    logger.error(
      { status: response.status, bodyPreview: text?.substring(0, 200) },
      '[MuleSoft API] Failed to parse response as JSON (SyntaxError)'
    );
    throw new Error(`MuleSoft returned non-JSON response (HTTP ${response.status}): ${text?.substring(0, 100)}`);
  }
}

// ---------------------------------------------------------------------------
// Types – matches the Orion Reporting/Scope request contract
// ---------------------------------------------------------------------------

/**
 * Orion Reporting/Scope request body.
 *
 * `managed` is a **bitmask** — combine flags with bitwise OR:
 *   1  = Performance
 *   2  = Activity
 *   4  = Allocation
 *   8  = Portfolio Detail
 *   16 = Tax Detail
 *
 * Example: managed = 16 means "Tax Detail only".
 *          managed = 3  means "Performance + Activity".
 *
 * `calculations` uses `$type` (dollar-sign prefix) per the Orion contract.
 */
export interface ReportingScopeRequest {
  entity: string;                         // e.g. "Account", "Household"
  entityIds: number[];                    // IDs to scope the report to
  asOfDate: string;                       // ISO date, e.g. "2026-03-18"
  managed?: number;                       // bitmask (see doc above) — optional per Orion contract
  calculations: any[];                    // Nested calculation structures per Orion Reporting/Scope contract
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapClientValueToPortfolioAccount(record: any): PortfolioAccount | null {
  const id = record.id?.toString() || record.clientId?.toString() || record.householdId?.toString() || "";
  if (!id) {
    logger.warn({ record: { name: record.name, clientId: record.clientId } }, "[MuleSoft API] Skipping record with empty id");
    return null;
  }
  return {
    id,
    accountNumber: record.accountNumber || record.number || record.clientNumber || "",
    name: record.name || record.clientName || record.householdName || "",
    custodian: record.custodian || "",
    accountType: record.accountType || record.type || record.registrationType
      || record.accountDescription || "Investment Account",
    status: record.status || "active",
    totalValue: record.totalValue || record.value || record.aum || record.marketValue || 0,
    baseCurrency: record.currency || record.baseCurrency || "USD",
    lastUpdated: record.lastUpdated || record.asOfDate || "",
    managementStyle: record.managementStyle || "",
    isActive: record.isActive ?? true,
    registrationType: record.registrationType || "",
  };
}

// ---------------------------------------------------------------------------
// API functions — paths match the MuleSoft WAD EAPI (lowercase, /api prefix)
// See docs/api-reference/wealth-advisory-dashboard.http for canonical URLs.
// ---------------------------------------------------------------------------

/** Validate MuleSoft connectivity by hitting the clients/value endpoint. */
export async function validateMulesoftConnection(): Promise<boolean> {
  if (!isMulesoftEnabled()) return false;

  try {
    const response = await mulesoftFetch("/api/v1/portfolio/clients/value");
    const data = await safeJsonParse(response);
    const items = data.clients || data.data || data;
    if (!Array.isArray(items)) {
      logger.warn({ responseKeys: Object.keys(data || {}) }, '[MuleSoft API] Unexpected response format in validateMulesoftConnection');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "[MuleSoft API] Connection validation failed");
    return false;
  }
}

// In-memory cache for Orion clients/value — 35K+ records, rarely changes
let _orionClientsCache: { data: PortfolioAccount[]; ts: number } | null = null;
const ORION_CLIENTS_TTL = 15 * 60 * 1000; // 15 min — 35K records, reference data rarely changes

// Request deduplication — prevents thundering herd when cache expires
let _orionClientsPending: Promise<PortfolioAccount[]> | null = null;

/**
 * GET /api/v1/portfolio/clients/value — all client portfolio values.
 *
 * ARCHITECTURE NOTE — Advisor Scoping:
 * Currently returns ALL firm portfolios (35K+ records) because the MuleSoft EAPI
 * does not support filtering by advisor/rep code. The data is scoped to individual
 * advisors client-side by fuzzy-matching against Salesforce household names.
 *
 * When MuleSoft adds repCode/advisorId query parameter support:
 * 1. Set ORION_REP_CODE in .env (e.g., ORION_REP_CODE=MGouldin)
 * 2. This function will automatically append ?repCode= to the request
 * 3. Response drops from 35K → ~500 records, cutting first-load time by ~90%
 * 4. Fuzzy-matching becomes unnecessary (exact match by rep assignment)
 */
export async function getClientsValue(options?: { repCode?: string }): Promise<PortfolioAccount[]> {
  if (!isMulesoftEnabled()) return [];

  const repCode = options?.repCode || process.env.ORION_REP_CODE;

  // ── Stale-while-revalidate ──
  // If cache is fresh → return immediately.
  // If cache is within 2 min of expiring → return stale data AND trigger background refresh.
  // If cache is expired → block on fetch (with deduplication).
  if (_orionClientsCache) {
    const age = Date.now() - _orionClientsCache.ts;
    if (age < ORION_CLIENTS_TTL) {
      // Check SWR window: if within 2 min of expiring, trigger background refresh
      if (age > ORION_CLIENTS_TTL - SWR_REVALIDATION_WINDOW && !_orionClientsPending) {
        logger.info({ age_ms: age, ttl_ms: ORION_CLIENTS_TTL }, "[MuleSoft SWR] Serving stale clients data, triggering background refresh");
        // Fire-and-forget background refresh
        _refreshClientsValue(repCode).catch(() => {});
      } else {
        logger.debug("[MuleSoft Cache] clients/value cache HIT");
      }
      return _orionClientsCache.data;
    }
  }

  // Cache expired — block on fetch with deduplication
  return deduplicatedFetch("clients-value", () => _refreshClientsValue(repCode));
}

/** Internal: actual MuleSoft fetch for clients/value with cache write. */
async function _refreshClientsValue(repCode?: string): Promise<PortfolioAccount[]> {
  // Deduplicate: if a fetch is already in flight, wait for it
  if (_orionClientsPending) return _orionClientsPending;

  _orionClientsPending = (async () => {
    try {
      const endpoint = repCode
        ? `/api/v1/portfolio/clients/value?repCode=${encodeURIComponent(repCode)}`
        : "/api/v1/portfolio/clients/value";
      const response = await mulesoftFetch(endpoint);
      const data = await safeJsonParse(response);
      const items = Array.isArray(data) ? data : data.clients || data.data || data;
      if (!Array.isArray(items)) {
        logger.warn({ responseKeys: Object.keys(data || {}) }, '[MuleSoft API] Unexpected response format in getClientsValue');
        return _orionClientsCache?.data || [];
      }
      const result = items.map(mapClientValueToPortfolioAccount).filter(Boolean) as PortfolioAccount[];
      _orionClientsCache = { data: result, ts: Date.now() };
      logger.info({ count: result.length }, "[MuleSoft SWR] clients/value cache REFRESHED");
      return result;
    } catch (err) {
      logger.error({ err }, "[MuleSoft API] Failed to fetch /api/v1/portfolio/clients/value");
      if (_orionClientsCache) return _orionClientsCache.data;
      return [];
    } finally {
      _orionClientsPending = null;
    }
  })();

  return _orionClientsPending;
}

// In-memory cache for client accounts — keyed by clientId
const CLIENT_ACCOUNTS_CACHE_TTL = 10 * 60 * 1000; // 10 min — account structure rarely changes
const _clientAccountsCache = new BoundedCache<PortfolioAccount[]>(500, CLIENT_ACCOUNTS_CACHE_TTL);

/** GET /api/v1/portfolio/clients/{id}/accounts/value — accounts under a client. */
export async function getClientAccounts(clientId: string): Promise<PortfolioAccount[]> {
  if (!isMulesoftEnabled()) return [];

  // SWR: serve stale data immediately if within revalidation window
  const { data: cached, needsRevalidation } = _clientAccountsCache.getWithSWR(clientId);
  if (cached && !needsRevalidation) {
    logger.debug({ clientId }, "[MuleSoft Cache] accounts cache HIT");
    return cached;
  }
  if (cached && needsRevalidation) {
    // Return stale data, refresh in background with deduplication
    logger.info({ clientId }, "[MuleSoft SWR] Serving stale accounts, background refresh");
    deduplicatedFetch(`accounts-${clientId}`, () => _fetchAndCacheAccounts(clientId)).catch(() => {});
    return cached;
  }

  // Cache miss — block on fetch with deduplication
  return deduplicatedFetch(`accounts-${clientId}`, () => _fetchAndCacheAccounts(clientId));
}

async function _fetchAndCacheAccounts(clientId: string): Promise<PortfolioAccount[]> {
  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/clients/${clientId}/accounts/value`);
    const data = await safeJsonParse(response);
    const items = Array.isArray(data) ? data : data.accounts || data.data || data;
    if (!Array.isArray(items)) {
      logger.warn({ responseKeys: Object.keys(data || {}), clientId }, '[MuleSoft API] Unexpected response format in getClientAccounts');
      return _clientAccountsCache.getStale(clientId) || [];
    }
    const result = items.map(mapClientValueToPortfolioAccount).filter(Boolean) as PortfolioAccount[];
    _clientAccountsCache.set(clientId, result);
    logger.info({ clientId, count: result.length }, "[MuleSoft SWR] accounts cache REFRESHED");
    return result;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Failed to fetch client accounts");
    const stale = _clientAccountsCache.getStale(clientId);
    if (stale) return stale;
    return [];
  }
}

// ---------------------------------------------------------------------------
// Asset mapping helper
// ---------------------------------------------------------------------------

function mapOrionAsset(asset: any): any {
  return {
    id: asset.id || asset.assetId || "",
    ticker: asset.ticker || asset.symbol || "",
    name: asset.name || asset.description || asset.ticker || "",
    currentValue: asset.currentValue || asset.marketValue || asset.value || 0,
    currentPrice: asset.currentPrice || asset.price || 0,
    currentShares: asset.currentShares || asset.shares || asset.quantity || 0,
    costBasis: asset.costBasis || asset.cost || 0,
    assetClass: asset.assetClass || asset.sector || "",
    riskCategory: asset.riskCategory || "",
    productType: asset.productType || asset.productCategory || "",
    accountId: asset.accountId || "",
    accountType: asset.accountType || asset.registrationType || "",
    custodian: asset.custodian || "",
    householdName: asset.householdName || "",
    isManaged: asset.isManaged ?? true,
    isCustodialCash: asset.isCustodialCash ?? false,
    managementStyle: asset.managementStyle || "",
    fundFamily: asset.fundFamily || "",
  };
}

const CLIENT_ASSETS_CACHE_TTL = 10 * 60 * 1000; // 10 min — holdings don't change intraday
const _clientAssetsCache = new BoundedCache<any[]>(500, CLIENT_ASSETS_CACHE_TTL);

/** GET /api/v1/portfolio/clients/{id}/assets — asset holdings for a client.
 *  NOTE: costBasis returns null from this endpoint for all assets (tested 2026-03-20).
 *  Orion may require GET /v1/Reporting/Activity/CostBasis for cost basis data. */
export async function getClientAssets(clientId: string): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  const cached = _clientAssetsCache.get(clientId);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/clients/${clientId}/assets`);
    const data = await safeJsonParse(response);
    const items = Array.isArray(data) ? data : data.assets || data.data || data;
    if (!Array.isArray(items)) {
      logger.warn({ responseKeys: Object.keys(data || {}), clientId }, '[MuleSoft API] Unexpected response format in getClientAssets');
      return [];
    }
    const records = items;
    const result = records.map(mapOrionAsset);
    _clientAssetsCache.set(clientId, result);
    return result;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Failed to fetch client assets");
    const stale = _clientAssetsCache.getStale(clientId);
    if (stale) return stale;
    return [];
  }
}

// ---------------------------------------------------------------------------
// AUM Over Time — Historical AUM time series for sparklines & charts
// ---------------------------------------------------------------------------

const AUM_OVER_TIME_CACHE_TTL = 15 * 60 * 1000; // 15 min — historical data rarely changes intraday
const _aumOverTimeCache = new BoundedCache<any[]>(500, AUM_OVER_TIME_CACHE_TTL);

/** GET /api/v1/portfolio/clients/{id}/aumovertime — AUM history for sparklines. */
export async function getAumOverTime(clientId: string): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  const cached = _aumOverTimeCache.get(clientId);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/clients/${clientId}/aumovertime`);
    const data = await safeJsonParse(response);
    const items = Array.isArray(data) ? data : data.aumHistory || data.data || data;
    if (!Array.isArray(items)) {
      logger.warn({ responseKeys: Object.keys(data || {}), clientId }, '[MuleSoft API] Unexpected response format in getAumOverTime');
      return [];
    }
    const result = items.map((pt: any) => ({
      date: pt.date || pt.asOfDate || "",
      aum: pt.aum || pt.value || pt.totalValue || pt.endingValue || 0,
      netFlows: pt.netFlows || pt.flows || 0,
    }));
    _aumOverTimeCache.set(clientId, result);
    return result;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Failed to fetch AUM over time");
    const stale = _aumOverTimeCache.getStale(clientId);
    if (stale) return stale;
    return [];
  }
}

// ---------------------------------------------------------------------------
// Billing — Revenue & fee data from Orion billing engine
// ---------------------------------------------------------------------------

const BILLING_SUMMARY_CACHE_TTL = 30 * 60 * 1000; // 30 min — billing data updates daily at most
let _billingSummaryCache: { data: any; ts: number } | null = null;

const BILLING_INSTANCES_CACHE_TTL = 15 * 60 * 1000;
const _billingInstancesCache = new BoundedCache<any[]>(500, BILLING_INSTANCES_CACHE_TTL);

/** GET /api/v1/billing/billgenerator/summary — firm-level billing summary (total fees, assets, effective rate). */
export async function getBillingSummary(): Promise<any> {
  if (!isMulesoftEnabled()) return null;

  if (_billingSummaryCache && (Date.now() - _billingSummaryCache.ts) < BILLING_SUMMARY_CACHE_TTL) {
    return _billingSummaryCache.data;
  }

  try {
    const response = await mulesoftFetch("/api/v1/billing/billgenerator/summary");
    const data = await safeJsonParse(response);
    const result = {
      totalFees: data.totalFees ?? data.total ?? 0,
      totalAssets: data.totalAssets ?? data.assets ?? 0,
      effectiveRate: data.effectiveRate ?? data.rate ?? 0,
      instanceCount: data.instanceCount ?? data.count ?? 0,
      asOfDate: data.asOfDate || data.date || null,
    };
    _billingSummaryCache = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    logger.error({ err }, "[MuleSoft API] Failed to fetch billing summary");
    if (_billingSummaryCache) return _billingSummaryCache.data;
    return null;
  }
}

/** GET /api/v1/billing/instances/{id} — billing instances for a client/account. */
export async function getBillingInstances(entityId: string): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  const cached = _billingInstancesCache.get(entityId);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/billing/instances/${entityId}`);
    const data = await safeJsonParse(response);
    const items = Array.isArray(data) ? data : data.instances || data.data || data;
    if (!Array.isArray(items)) {
      logger.warn({ responseKeys: Object.keys(data || {}), entityId }, '[MuleSoft API] Unexpected response format in getBillingInstances');
      return [];
    }
    const result = items.map((b: any) => ({
      id: b.id || "",
      name: b.name || "",
      createdDate: b.createdDate || b.date || "",
      status: b.status || "completed",
      totalFees: b.totalFees ?? b.fees ?? b.amount ?? 0,
      totalAssets: b.totalAssets ?? b.assets ?? 0,
      effectiveRate: b.effectiveRate ?? b.rate ?? 0,
    }));
    _billingInstancesCache.set(entityId, result);
    return result;
  } catch (err) {
    logger.error({ err, entityId }, "[MuleSoft API] Failed to fetch billing instances");
    const stale = _billingInstancesCache.getStale(entityId);
    if (stale) return stale;
    return [];
  }
}

// ---------------------------------------------------------------------------
// Transactions — Trade history (buys, sells, dividends, transfers)
// ---------------------------------------------------------------------------

const CLIENT_TRANSACTIONS_CACHE_TTL = 10 * 60 * 1000; // 10 min
const _clientTransactionsCache = new BoundedCache<any[]>(500, CLIENT_TRANSACTIONS_CACHE_TTL);

/** GET /api/v1/portfolio/clients/{id}/transactions — transaction history for a client. */
export async function getClientTransactions(clientId: string): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  const cached = _clientTransactionsCache.get(clientId);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/clients/${clientId}/transactions`);
    const data = await safeJsonParse(response);
    const items = Array.isArray(data) ? data : data.transactions || data.data || data;
    if (!Array.isArray(items)) {
      logger.warn({ responseKeys: Object.keys(data || {}), clientId }, '[MuleSoft API] Unexpected response format in getClientTransactions');
      return [];
    }
    const result = items.map((t: any) => ({
      id: t.id || t.transactionId || "",
      date: t.date || t.transactionDate || t.tradeDate || "",
      type: t.transType || t.type || t.transactionType || "unknown",
      ticker: t.ticker || t.symbol || "",
      description: t.description || t.name || "",
      quantity: t.quantity || t.shares || 0,
      price: t.price || 0,
      amount: t.amount || t.total || t.netAmount || 0,
      commission: t.commission || t.fees || 0,
      accountId: t.accountId || "",
      accountName: t.accountName || "",
    }));
    _clientTransactionsCache.set(clientId, result);
    return result;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Failed to fetch client transactions");
    const stale = _clientTransactionsCache.getStale(clientId);
    if (stale) return stale;
    return [];
  }
}

/** GET /api/v1/portfolio/accounts/{id}/transactions — transaction history for a single account. */
export async function getAccountTransactions(accountId: string): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  const cacheKey = `acct-${accountId}`;
  const cached = _clientTransactionsCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/accounts/${accountId}/transactions`);
    const data = await safeJsonParse(response);
    const items = Array.isArray(data) ? data : data.transactions || data.data || data;
    if (!Array.isArray(items)) {
      logger.warn({ responseKeys: Object.keys(data || {}), accountId }, '[MuleSoft API] Unexpected response format in getAccountTransactions');
      return [];
    }
    const result = items.map((t: any) => ({
      id: t.id || t.transactionId || "",
      date: t.date || t.transactionDate || t.tradeDate || "",
      type: t.transType || t.type || t.transactionType || "unknown",
      ticker: t.ticker || t.symbol || "",
      description: t.description || t.name || "",
      quantity: t.quantity || t.shares || 0,
      price: t.price || 0,
      amount: t.amount || t.total || t.netAmount || 0,
      commission: t.commission || t.fees || 0,
      accountId: accountId,
      accountName: t.accountName || "",
    }));
    _clientTransactionsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    logger.error({ err, accountId }, "[MuleSoft API] Failed to fetch account transactions");
    const stale = _clientTransactionsCache.getStale(cacheKey);
    if (stale) return stale;
    return [];
  }
}

// ---------------------------------------------------------------------------
// Household APIs — Salesforce-backed via MuleSoft proxy
// ---------------------------------------------------------------------------

/** Response shape from GET /api/v1/household */
export interface HouseholdResponse {
  advisor: {
    id: string;
    name: string;
    email: string;
    username: string;
    division: string;
    /** Revenue goals — from SF Apex REST /household/v3 advisor object */
    recurringWonSalesThisYear?: number;
    ytdWmNonRecurringWonSales?: number;
    wmYtdRecurringSalesGoal?: number;
    wmYtdRecurringSalesPctToGoal?: number;
    wmYtdNonRecurringSalesGoal?: number;
    wmYtdNonRecurringSalesPctToGoal?: number;
  };
  householdAccounts: Array<{
    Id: string;
    Name: string;
    OwnerId: string;
    FinServ__Status__c: string;
    [key: string]: any;
  }>;
  householdDetails: any[];
  openTasks: any[];
  upcomingEvents: any[];
  openCases: any[];
  staleOpportunities: any[];
  recentlyClosedOpportunities: any[];
  totalSize: number;
  pageSize: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
  searchName: string | null;
}

/** Response shape from GET /api/v1/household/members */
export interface HouseholdMembersResponse {
  householdId: string;
  householdName: string;
  members: Array<{
    Id: string;
    FirstName: string;
    LastName: string;
    PersonEmail?: string;
    Phone?: string;
    PersonMailingCity?: string;
    PersonMailingState?: string;
    PersonBirthdate?: string;
    [key: string]: any;
  }>;
  totalSize: number;
  pageSize: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
  searchName: string | null;
}

// ---------------------------------------------------------------------------
// Household cache — data changes infrequently, avoid redundant SF round-trips
// ---------------------------------------------------------------------------
const HOUSEHOLD_CACHE_TTL = 10 * 60 * 1000; // 10 min — SF household data is stable
const _householdCache = new BoundedCache<HouseholdResponse>(500, HOUSEHOLD_CACHE_TTL);

/**
 * GET /api/v1/household — Household summary for an advisor.
 * Proxied by MuleSoft → Salesforce /services/apexrest/household/v3
 *
 * Results are cached per (username, pageSize, offset, searchName) for 3 minutes.
 *
 * @param username  Salesforce username (e.g. "advisor@onedigital.com.uat")
 * @param searchName  Optional filter on household account name
 * @param pageSize  Default 50, max 200
 * @param offset    Zero-based pagination offset
 */
export async function getHouseholds(params: {
  username: string;
  searchName?: string;
  pageSize?: number;
  offset?: number;
}): Promise<HouseholdResponse> {
  if (!isMulesoftEnabled()) throw new Error('MuleSoft not enabled');

  const cacheKey = `${params.username}:${params.pageSize || 50}:${params.offset || 0}:${params.searchName || ''}`;
  const cached = _householdCache.get(cacheKey);
  if (cached) return cached;

  try {
    const qs = new URLSearchParams();
    qs.set("username", params.username);
    if (params.searchName) qs.set("searchName", params.searchName);
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params.offset) qs.set("offset", String(params.offset));

    const response = await mulesoftFetch(`/api/v1/household?${qs.toString()}`);
    const result = await safeJsonParse(response) as HouseholdResponse;
    _householdCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    logger.error({ err, params }, "[MuleSoft API] Failed to GET /api/v1/household");
    // Return stale cache on error if available
    const stale = _householdCache.getStale(cacheKey);
    if (stale) return stale;
    // Throw so callers' try/catch blocks fire correctly
    throw err;
  }
}

// In-memory cache for household members — keyed by username:householdId
const HOUSEHOLD_MEMBERS_CACHE_TTL = 10 * 60 * 1000; // 10 min — member data is stable
const _householdMembersCache = new BoundedCache<HouseholdMembersResponse>(500, HOUSEHOLD_MEMBERS_CACHE_TTL);

/**
 * GET /api/v1/household/members — Members for a specific household.
 * Proxied by MuleSoft → Salesforce /services/apexrest/household/v3/members
 *
 * @param username     Salesforce username
 * @param householdId  Salesforce household Account Id
 * @param searchName   Optional filter on member name
 * @param pageSize     Default 50, max 200
 * @param offset       Zero-based pagination offset
 */
export async function getHouseholdMembers(params: {
  username: string;
  householdId: string;
  searchName?: string;
  pageSize?: number;
  offset?: number;
}): Promise<HouseholdMembersResponse> {
  if (!isMulesoftEnabled()) throw new Error('MuleSoft not enabled');

  const cacheKey = `${params.username}:${params.householdId}:${params.pageSize || 50}:${params.offset || 0}:${params.searchName || ""}`;
  const cached = _householdMembersCache.get(cacheKey);
  if (cached) return cached;

  try {
    const qs = new URLSearchParams();
    qs.set("username", params.username);
    qs.set("householdId", params.householdId);
    if (params.searchName) qs.set("searchName", params.searchName);
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params.offset) qs.set("offset", String(params.offset));

    const response = await mulesoftFetch(`/api/v1/household/members?${qs.toString()}`);
    const result = await safeJsonParse(response) as HouseholdMembersResponse;
    _householdMembersCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    // ── Handle SALESFORCE:NOT_FOUND as empty members (not an error) ──
    // The SF Apex REST /household/v3/members endpoint returns HTTP 404 with
    // {totalSize:0, members:[]} when a household has no members or is not
    // accessible. MuleSoft wraps this as a 500. This is a valid data state,
    // not an integration failure — return empty members instead of throwing.
    const errMsg = err?.message || "";
    if (errMsg.includes("SALESFORCE:NOT_FOUND") || errMsg.includes('"members":[]')) {
      logger.info(
        { householdId: params.householdId },
        "[MuleSoft API] Household members not found — returning empty result (not an error)"
      );
      const emptyResult: HouseholdMembersResponse = {
        householdId: params.householdId,
        householdName: null as any,
        members: [],
        totalSize: 0,
        pageSize: params.pageSize || 50,
        offset: params.offset || 0,
        hasMore: false,
        nextOffset: null,
        searchName: params.searchName || null,
      };
      _householdMembersCache.set(cacheKey, emptyResult);
      return emptyResult;
    }

    logger.error({ err, params }, "[MuleSoft API] Failed to GET /api/v1/household/members");
    // Return stale cache on error if available
    const stale = _householdMembersCache.getStale(cacheKey);
    if (stale) return stale;
    // Throw so callers' try/catch blocks fire correctly
    throw err;
  }
}

// Cache for reporting scope results — most expensive MuleSoft call
const REPORTING_SCOPE_CACHE_TTL = 5 * 60 * 1000; // 5 min — reporting data is relatively stable
const _reportingScopeCache = new BoundedCache<any>(200, REPORTING_SCOPE_CACHE_TTL);

/**
 * POST /api/v1/reporting/scope — Orion Reporting/Scope master endpoint.
 *
 * Combines performance, allocation, activity, portfolio detail, and tax detail
 * in a single call, controlled by the `managed` bitmask and `calculations` array.
 */
export async function postReportingScope(params: ReportingScopeRequest): Promise<any> {
  if (!isMulesoftEnabled()) return [];

  const cacheKey = JSON.stringify(params);
  const cached = _reportingScopeCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch("/api/v1/reporting/scope", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.error(
        { status: response.status, statusText: response.statusText, body: errorBody?.substring(0, 500), params },
        `[MuleSoft API] Reporting/Scope returned HTTP ${response.status}`
      );
      // Don't throw on 404 — return empty so callers degrade gracefully
      return [];
    }

    const data = await safeJsonParse(response);
    logger.info(
      { hasCalculations: !!data?.calculations, keys: data ? Object.keys(data) : [] },
      "[MuleSoft API] Reporting/Scope response received"
    );
    // The API returns { sessionId, asOfDate, calculations: [...] }.
    // Return the full response so callers can walk the nested tree.
    let result: any;
    if (data && data.calculations) result = data;
    else if (Array.isArray(data)) result = data;
    else result = data?.results || data?.data || data || [];
    _reportingScopeCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    logger.error(
      { err: err?.message || String(err), stack: err?.stack?.substring(0, 300), params },
      "[MuleSoft API] Failed to POST /api/v1/reporting/scope"
    );
    return { data: [], _error: err?.message || String(err) };
  }
}

// ---------------------------------------------------------------------------
// Fix 2: Beneficiary data via group-info calculation
// Per Orion API guidance: $type "group-info" on entity "Account" returns
// account-level metadata including beneficiary designation.
// ---------------------------------------------------------------------------

export async function getAccountGroupInfo(entityIds: number[]): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  try {
    return await postReportingScope({
      entity: "Account",
      entityIds,
      asOfDate: new Date().toISOString().split("T")[0],
      calculations: [
        {
          $type: "group-info",
          entity: "Account",
          property: "Name",
        },
      ],
    });
  } catch (err) {
    logger.error({ err, entityIds }, "[MuleSoft API] Failed to fetch account group-info (beneficiary data)");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fix 3: Contributions YTD via activity calculation
// Per Orion API guidance: use $type "activity" with ActivityOption
// "contributions-and-withdrawals" and a YTD date range.
// ---------------------------------------------------------------------------

export async function getContributionsYTD(entityIds: number[], entity: string = "Account"): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  const year = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  try {
    return await postReportingScope({
      entity,
      entityIds,
      asOfDate: today,
      managed: 2, // Activity bitmask
      calculations: [
        {
          $type: "activity",
          contextChange: {
            reportCategoryId: 2,
            dateRange: {
              $type: "date-range",
              startDate: `${year}-01-01`,
              endDate: today,
            },
            ActivityOption: {
              $type: "contributions-and-withdrawals",
            },
          },
        },
      ],
    });
  } catch (err) {
    logger.error({ err, entityIds }, "[MuleSoft API] Failed to fetch contributions YTD");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fix 4: Performance with risk metrics (Sharpe ratio, max drawdown)
// Per Orion API guidance: use managed=1 (Performance) with detailed
// performance calculation to get risk metrics.
// ---------------------------------------------------------------------------

export async function getPerformanceWithRiskMetrics(entityIds: number[], entity: string = "Account"): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];

  const today = new Date().toISOString().split("T")[0];

  try {
    return await postReportingScope({
      entity,
      entityIds,
      asOfDate: today,
      managed: 1, // Performance bitmask
      calculations: [
        {
          $type: "performance",
          contextChange: {
            dateRange: {
              $type: "date-range-expression",
              startDateExpression: "Inception",
              endDateExpression: "Now",
            },
          },
        },
      ],
    });
  } catch (err) {
    logger.error({ err, entityIds }, "[MuleSoft API] Failed to fetch performance with risk metrics");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Cost Basis via Reporting/Scope — uses $type "cost-basis" calculation
// The assets endpoint returns null for costBasis, so we must use Reporting/Scope.
// ---------------------------------------------------------------------------

export async function getCostBasis(entityIds: number[], entity: string = "Account"): Promise<any> {
  if (!isMulesoftEnabled()) return [];

  const today = new Date().toISOString().split("T")[0];

  try {
    return await postReportingScope({
      entity,
      entityIds,
      asOfDate: today,
      managed: 16, // Tax Detail bitmask
      calculations: [
        {
          $type: "cost-basis",
          contextChange: {
            reportCategoryId: 16,
            dateRange: {
              $type: "date-range-expression",
              startDateExpression: "Inception",
              endDateExpression: "Now",
            },
          },
        },
      ],
    });
  } catch (err) {
    logger.error({ err, entityIds }, "[MuleSoft API] Failed to fetch cost basis");
    return [];
  }
}

/**
 * Get contributions/withdrawals for a specific date range (MTD, QTD, or YTD).
 * Used for book-level net flow calculations.
 */
export async function getContributionsForRange(
  entityIds: number[],
  startDate: string,
  endDate: string,
  entity: string = "Account"
): Promise<any> {
  if (!isMulesoftEnabled()) return [];

  try {
    return await postReportingScope({
      entity,
      entityIds,
      asOfDate: endDate,
      managed: 2,
      calculations: [
        {
          $type: "activity",
          contextChange: {
            reportCategoryId: 2,
            dateRange: {
              $type: "date-range",
              startDate,
              endDate,
            },
            ActivityOption: {
              $type: "contributions-and-withdrawals",
            },
          },
        },
      ],
    });
  } catch (err) {
    logger.error({ err, entityIds, startDate, endDate }, "[MuleSoft API] Failed to fetch contributions for range");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Test helper: check if Reporting/Scope endpoint is reachable through MuleSoft
// ---------------------------------------------------------------------------

export async function testReportingScopeAvailability(): Promise<{ available: boolean; status?: number; error?: string; responsePreview?: string }> {
  if (!isMulesoftEnabled()) return { available: false, error: "MuleSoft not enabled" };

  try {
    const response = await mulesoftFetch("/api/v1/reporting/scope", {
      method: "POST",
      body: JSON.stringify({
        entity: "Account",
        entityIds: [1],
        asOfDate: new Date().toISOString().split("T")[0],
        calculations: [{ $type: "performance" }],
      }),
    });
    const body = await response.text().catch(() => "");
    logger.info(
      { status: response.status, bodyPreview: body?.substring(0, 500) },
      "[MuleSoft API] Reporting/Scope availability test response"
    );
    return {
      available: response.ok,
      status: response.status,
      responsePreview: body?.substring(0, 200),
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    logger.warn({ err: msg }, "[MuleSoft API] Reporting/Scope availability test failed");
    return { available: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Priority 3: New Orion Capabilities
// ---------------------------------------------------------------------------

// ── P3.1: Tax Lot Detail ──

const TAX_LOT_TTL = 15 * 60 * 1000;
const _taxLotCache = new BoundedCache<any[]>(200, TAX_LOT_TTL);

/**
 * GET /api/v1/portfolio/accounts/{id}/taxlot — Tax lot detail for an account.
 * Returns individual tax lots with cost basis, gain/loss, and holding period.
 */
export async function getAccountTaxLots(accountId: string | number): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];
  const cacheKey = `taxlots-${accountId}`;
  const cached = _taxLotCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/accounts/${accountId}/taxlot`);
    if (!response.ok) {
      logger.warn({ status: response.status, accountId }, "[MuleSoft API] Tax lot fetch failed");
      return _taxLotCache.getStale(cacheKey) || [];
    }
    const raw = await safeJsonParse(response);
    const lots = (Array.isArray(raw) ? raw : raw?.data || raw?.taxLots || []).map((lot: any) => ({
      accountId: lot.accountId || accountId,
      ticker: lot.ticker || lot.symbol || "",
      description: lot.description || lot.securityName || "",
      purchaseDate: lot.purchaseDate || lot.acquisitionDate || "",
      quantity: lot.quantity || lot.shares || 0,
      costBasis: lot.costBasis || lot.cost || 0,
      marketValue: lot.marketValue || lot.currentValue || 0,
      unrealizedGainLoss: lot.unrealizedGainLoss ?? (lot.marketValue || 0) - (lot.costBasis || 0),
      holdingPeriod: lot.holdingPeriod || (lot.isLongTerm ? "long-term" : "short-term"),
      lotId: lot.lotId || lot.id || 0,
    }));
    _taxLotCache.set(cacheKey, lots);
    return lots;
  } catch (err) {
    logger.error({ err, accountId }, "[MuleSoft API] Tax lot fetch error");
    return _taxLotCache.getStale(cacheKey) || [];
  }
}

// ── P3.2: RMD Calculations ──

const RMD_TTL = 30 * 60 * 1000; // 30 min — RMD changes infrequently
const _rmdCache = new BoundedCache<any>(200, RMD_TTL);

/**
 * GET /api/v1/portfolio/accounts/{id}/rmdcalculation — RMD for a retirement account.
 */
export async function getAccountRmd(accountId: string | number): Promise<any | null> {
  if (!isMulesoftEnabled()) return null;
  const cacheKey = `rmd-${accountId}`;
  const cached = _rmdCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/accounts/${accountId}/rmdcalculation`);
    if (!response.ok) {
      logger.warn({ status: response.status, accountId }, "[MuleSoft API] RMD calculation fetch failed");
      return _rmdCache.getStale(cacheKey) || null;
    }
    const raw = await safeJsonParse(response);
    const rmd = {
      accountId: raw.accountId || accountId,
      accountName: raw.accountName || raw.name || "",
      priorYearEndBalance: raw.priorYearEndBalance || raw.previousYearBalance || 0,
      rmdAmount: raw.rmdAmount || raw.requiredDistribution || 0,
      distributionsTaken: raw.distributionsTaken || raw.distributionsYTD || 0,
      remainingRmd: raw.remainingRmd ?? ((raw.rmdAmount || 0) - (raw.distributionsTaken || 0)),
      distributionDeadline: raw.distributionDeadline || raw.deadline || "",
    };
    _rmdCache.set(cacheKey, rmd);
    return rmd;
  } catch (err) {
    logger.error({ err, accountId }, "[MuleSoft API] RMD calculation error");
    return _rmdCache.getStale(cacheKey) || null;
  }
}

// ── P3.3: Model Tolerance / Portfolio Drift ──

const MODEL_TOLERANCE_TTL = 15 * 60 * 1000;
const _modelToleranceCache = new BoundedCache<any>(200, MODEL_TOLERANCE_TTL);

/**
 * GET /api/v1/portfolio/clients/{id}/modeltolerance — Model drift analysis.
 * Shows target vs actual allocation and tolerance bands.
 */
export async function getModelTolerance(clientId: string | number): Promise<any | null> {
  if (!isMulesoftEnabled()) return null;
  const cacheKey = `modeltolerance-${clientId}`;
  const cached = _modelToleranceCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/clients/${clientId}/modeltolerance`);
    if (!response.ok) {
      logger.warn({ status: response.status, clientId }, "[MuleSoft API] Model tolerance fetch failed");
      return _modelToleranceCache.getStale(cacheKey) || null;
    }
    const raw = await safeJsonParse(response);
    const result = {
      modelName: raw.modelName || raw.model?.name || "Unknown Model",
      allocations: (raw.allocations || raw.assetClasses || []).map((a: any) => ({
        assetClass: a.assetClass || a.name || a.category || "",
        targetPct: a.targetPct ?? a.target ?? 0,
        currentPct: a.currentPct ?? a.actual ?? a.current ?? 0,
        driftPct: a.driftPct ?? ((a.currentPct ?? a.actual ?? 0) - (a.targetPct ?? a.target ?? 0)),
        inTolerance: a.inTolerance ?? (Math.abs(a.driftPct ?? 0) <= (a.tolerancePct ?? 5)),
      })),
      overallDrift: raw.overallDrift ?? raw.totalDrift ?? 0,
      inTolerance: raw.inTolerance ?? true,
    };
    _modelToleranceCache.set(cacheKey, result);
    return result;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Model tolerance error");
    return _modelToleranceCache.getStale(cacheKey) || null;
  }
}

// ── P3.4: Balance Sheet / Net Worth ──

const BALANCE_SHEET_TTL = 15 * 60 * 1000;
const _balanceSheetCache = new BoundedCache<any>(200, BALANCE_SHEET_TTL);

/**
 * GET /api/v1/portfolio/clients/{id}/balancesheet — Complete balance sheet.
 * Combines Orion managed assets with held-away assets for full net worth picture.
 */
export async function getBalanceSheet(clientId: string | number): Promise<any | null> {
  if (!isMulesoftEnabled()) return null;
  const cacheKey = `balancesheet-${clientId}`;
  const cached = _balanceSheetCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/portfolio/clients/${clientId}/balancesheet`);
    if (!response.ok) {
      logger.warn({ status: response.status, clientId }, "[MuleSoft API] Balance sheet fetch failed");
      return _balanceSheetCache.getStale(cacheKey) || null;
    }
    const raw = await safeJsonParse(response);
    const result = {
      assets: (raw.assets || []).map((a: any) => ({
        category: a.category || a.type || "Other",
        value: a.value || a.amount || 0,
      })),
      liabilities: (raw.liabilities || []).map((l: any) => ({
        category: l.category || l.type || "Other",
        value: l.value || l.amount || 0,
      })),
      totalAssets: raw.totalAssets || (raw.assets || []).reduce((s: number, a: any) => s + (a.value || 0), 0),
      totalLiabilities: raw.totalLiabilities || (raw.liabilities || []).reduce((s: number, l: any) => s + (l.value || 0), 0),
      netWorth: raw.netWorth ?? (
        (raw.totalAssets || 0) - (raw.totalLiabilities || 0)
      ),
    };
    _balanceSheetCache.set(cacheKey, result);
    return result;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Balance sheet error");
    return _balanceSheetCache.getStale(cacheKey) || null;
  }
}

// ── P3.5: Hidden Levers Stress Testing ──

const STRESS_TEST_TTL = 30 * 60 * 1000;
const _stressTestCache = new BoundedCache<any>(100, STRESS_TEST_TTL);

/**
 * GET /api/v1/integrations/hiddenlevers/stresstest/client/{id} — Stress test results.
 */
export async function getStressTest(clientId: string | number): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];
  const cacheKey = `stresstest-${clientId}`;
  const cached = _stressTestCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/integrations/hiddenlevers/stresstest/client/${clientId}`);
    if (!response.ok) {
      logger.warn({ status: response.status, clientId }, "[MuleSoft API] Stress test fetch failed");
      return _stressTestCache.getStale(cacheKey) || [];
    }
    const raw = await safeJsonParse(response);
    const scenarios = (Array.isArray(raw) ? raw : raw?.scenarios || raw?.results || []).map((s: any) => ({
      scenarioName: s.scenarioName || s.name || "Unknown Scenario",
      portfolioImpactPct: s.portfolioImpactPct ?? s.portfolioImpact ?? 0,
      portfolioImpactDollar: s.portfolioImpactDollar ?? s.dollarImpact ?? 0,
      benchmarkImpactPct: s.benchmarkImpactPct ?? s.benchmarkImpact ?? 0,
    }));
    _stressTestCache.set(cacheKey, scenarios);
    return scenarios;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Stress test error");
    return _stressTestCache.getStale(cacheKey) || [];
  }
}

/**
 * GET /api/v1/integrations/hiddenlevers/riskprofile — Client risk profile.
 */
export async function getRiskProfile(clientId: string | number): Promise<any | null> {
  if (!isMulesoftEnabled()) return null;
  const cacheKey = `riskprofile-${clientId}`;
  const cached = _stressTestCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/integrations/hiddenlevers/riskprofile?clientId=${clientId}`);
    if (!response.ok) return _stressTestCache.getStale(cacheKey) || null;
    const raw = await safeJsonParse(response);
    const result = {
      clientId: raw.clientId || clientId,
      riskScore: raw.riskScore ?? 0,
      riskCategory: raw.riskCategory || "Unknown",
      maxDrawdown: raw.maxDrawdown ?? 0,
      volatility: raw.volatility ?? 0,
      sharpeRatio: raw.sharpeRatio ?? 0,
    };
    _stressTestCache.set(cacheKey, result);
    return result;
  } catch (err) {
    logger.error({ err, clientId }, "[MuleSoft API] Risk profile error");
    return _stressTestCache.getStale(cacheKey) || null;
  }
}

// ── P3.6: Rebalance Proposals ──

const REBALANCE_TTL = 10 * 60 * 1000;
const _rebalanceCache = new BoundedCache<any[]>(100, REBALANCE_TTL);

/**
 * POST /api/v1/trading/rebalance — Generate rebalance proposal for accounts.
 */
export async function getRebalanceProposal(accountIds: number[], options?: { modelId?: number; taxSensitive?: boolean }): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];
  const cacheKey = `rebalance-${accountIds.sort().join(",")}`;
  const cached = _rebalanceCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/trading/rebalance`, {
      method: "POST",
      body: JSON.stringify({
        accountIds,
        modelId: options?.modelId,
        taxSensitive: options?.taxSensitive ?? false,
      }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status, accountIds }, "[MuleSoft API] Rebalance proposal fetch failed");
      return _rebalanceCache.getStale(cacheKey) || [];
    }
    const raw = await safeJsonParse(response);
    const proposals = (Array.isArray(raw) ? raw : raw?.proposals || raw?.trades || []).map((p: any) => ({
      accountId: p.accountId || 0,
      ticker: p.ticker || p.symbol || "",
      description: p.description || p.securityName || "",
      currentShares: p.currentShares || 0,
      currentWeight: p.currentWeight ?? 0,
      targetWeight: p.targetWeight ?? 0,
      proposedShares: p.proposedShares ?? 0,
      proposedTradeShares: p.proposedTradeShares ?? p.tradeShares ?? 0,
      tradeSide: p.tradeSide || (p.proposedTradeShares > 0 ? "Buy" : "Sell"),
      estimatedTradeAmount: p.estimatedTradeAmount ?? p.tradeAmount ?? 0,
      modelId: p.modelId ?? options?.modelId ?? 0,
      modelName: p.modelName || "",
    }));
    _rebalanceCache.set(cacheKey, proposals);
    return proposals;
  } catch (err) {
    logger.error({ err, accountIds }, "[MuleSoft API] Rebalance proposal error");
    return _rebalanceCache.getStale(cacheKey) || [];
  }
}

// ── P4.4: Compliance Dashboard ──

const COMPLIANCE_TTL = 15 * 60 * 1000;
const _complianceCache = new BoundedCache<any>(10, COMPLIANCE_TTL);

/**
 * GET /api/v1/compliance/riskdashboard/risktiles — Risk dashboard tiles.
 */
export async function getComplianceRiskTiles(): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];
  const cacheKey = "compliance-risktiles";
  const cached = _complianceCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/compliance/riskdashboard/risktiles`);
    if (!response.ok) {
      logger.warn({ status: response.status }, "[MuleSoft API] Compliance risk tiles failed");
      return _complianceCache.getStale(cacheKey) || [];
    }
    const raw = await safeJsonParse(response);
    const tiles = (Array.isArray(raw) ? raw : raw?.tiles || raw?.data || []).map((t: any) => ({
      title: t.title || t.name || "Unknown",
      count: t.count || t.total || 0,
      severity: t.severity || t.level || "info",
      category: t.category || t.type || "general",
    }));
    _complianceCache.set(cacheKey, tiles);
    return tiles;
  } catch (err) {
    logger.error({ err }, "[MuleSoft API] Compliance risk tiles error");
    return _complianceCache.getStale(cacheKey) || [];
  }
}

/**
 * GET /api/v1/compliance/riskdashboard/accountalerts — Account-level compliance alerts.
 */
export async function getComplianceAccountAlerts(): Promise<any[]> {
  if (!isMulesoftEnabled()) return [];
  const cacheKey = "compliance-accountalerts";
  const cached = _complianceCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await mulesoftFetch(`/api/v1/compliance/riskdashboard/accountalerts`);
    if (!response.ok) {
      logger.warn({ status: response.status }, "[MuleSoft API] Compliance account alerts failed");
      return _complianceCache.getStale(cacheKey) || [];
    }
    const raw = await safeJsonParse(response);
    const alerts = (Array.isArray(raw) ? raw : raw?.alerts || raw?.data || []).map((a: any) => ({
      accountId: a.accountId || 0,
      accountName: a.accountName || a.name || "Unknown",
      alertType: a.alertType || a.type || "Unknown",
      message: a.message || a.description || "",
      severity: a.severity || a.level || "info",
      createdDate: a.createdDate || a.date || "",
    }));
    _complianceCache.set(cacheKey, alerts);
    return alerts;
  } catch (err) {
    logger.error({ err }, "[MuleSoft API] Compliance account alerts error");
    return _complianceCache.getStale(cacheKey) || [];
  }
}

// ---------------------------------------------------------------------------
// Calendar — Microsoft Graph via MuleSoft (Outlook events)
// ---------------------------------------------------------------------------

const CALENDAR_CACHE_TTL = 5 * 60 * 1000; // 5 min
const _calendarCache = new BoundedCache<any[]>(50, CALENDAR_CACHE_TTL);

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  startFormatted: string;
  endFormatted: string;
  duration: number;
  location?: string | null;
  isAllDay: boolean;
  organizer?: string | null;
  attendees?: string[];
  bodyPreview?: string;
  webLink?: string | null;
  clientName?: string | null;
  meetingType?: string | null;
  source?: string;
  status: "upcoming" | "in-progress" | "completed";
}

/**
 * GET /api/v1/calendar — Outlook calendar events via MuleSoft → Microsoft Graph.
 *
 * @param userId   Advisor's Microsoft Entra ID (NOT email)
 * @param startDateTime  ISO 8601 with fractional seconds
 * @param endDateTime    ISO 8601 with fractional seconds
 * @param timezone       Short code: ET, CT, MT, PT
 */
export async function getCalendarEvents(params: {
  userId: string;
  startDateTime: string;
  endDateTime: string;
  timezone?: string;
}): Promise<CalendarEvent[]> {
  if (!isMulesoftEnabled()) return [];

  const cacheKey = `${params.userId}:${params.startDateTime}:${params.endDateTime}`;
  const cached = _calendarCache.get(cacheKey);
  if (cached) return cached;

  try {
    const qs = new URLSearchParams();
    qs.set("userId", params.userId);
    qs.set("startDateTime", params.startDateTime);
    qs.set("endDateTime", params.endDateTime);
    if (params.timezone) qs.set("timezone", params.timezone);

    const response = await mulesoftFetch(`/api/v1/calendar?${qs.toString()}`);
    const data = await safeJsonParse(response);

    // MuleSoft wraps each Graph event in { exceptionPayload, payload, attributes }
    // Unwrap to get the actual event object from payload
    const rawEvents = Array.isArray(data) ? data : data.records || data.value || data.events || data.data || [];
    const events = rawEvents.map((item: any) => item.payload || item);

    const now = new Date();

    const mapped: CalendarEvent[] = events.map((e: any) => {
      const startStr = e.start?.dateTime || e.startDateTime || e.start || "";
      const endStr = e.end?.dateTime || e.endDateTime || e.end || "";
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      let status: "upcoming" | "in-progress" | "completed" = "upcoming";
      if (now >= startDate && now <= endDate) status = "in-progress";
      else if (now > endDate) status = "completed";

      const attendeeList = (e.attendees || []).map((a: any) =>
        typeof a === "string" ? a : (a.emailAddress?.name || a.name || a.emailAddress?.address || "")
      ).filter(Boolean);

      return {
        id: e.id || e.iCalUId || crypto.randomUUID(),
        subject: e.subject || e.title || "Untitled",
        start: startStr,
        end: endStr,
        startFormatted: startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        endFormatted: endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        duration: durationMin,
        location: typeof e.location === "string" ? e.location : (e.location?.displayName || null),
        isAllDay: e.isAllDay || false,
        organizer: e.organizer?.emailAddress?.name || e.organizer?.name || e.organizer || null,
        attendees: attendeeList,
        bodyPreview: (e.bodyPreview || e.body?.content || e.description || "").slice(0, 200),
        webLink: e.webLink || null,
        clientName: e.clientName || null,
        meetingType: e.meetingType || null,
        source: e.source || "outlook",
        status,
      };
    });

    // Sort by start time
    mapped.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    _calendarCache.set(cacheKey, mapped);
    return mapped;
  } catch (err) {
    logger.error({ err, params: { userId: params.userId } }, "[MuleSoft API] Calendar fetch failed");
    const stale = _calendarCache.getStale(cacheKey);
    if (stale) return stale;
    return [];
  }
}
