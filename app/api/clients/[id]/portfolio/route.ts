import { NextResponse } from "next/server";
import { requireAuth, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
  getClientAccounts as getOrionClientAccounts,
  getClientAssets as getOrionClientAssets,
  getPerformanceWithRiskMetrics,
  getContributionsYTD,
  getCostBasis,
} from "@server/integrations/mulesoft/api";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import {
  getFinancialAccountsByHousehold,
  getTopHoldingsByHousehold,
} from "@server/integrations/salesforce/queries";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import { logger } from "@server/lib/logger";
import { resolveClientIdentity } from "@server/lib/client-identity";

/**
 * Flatten Orion Reporting/Scope performance response into UI-friendly shape.
 * Input: { calculations: [{ performance: -0.0019, startDate, endDate }] }
 * Output: { returnPct, benchmarkPct, alpha, sharpeRatio, maxDrawdown, period }
 */
function flattenPerformance(raw: any): any {
  if (!raw) return null;
  const calcs = raw?.calculations || (Array.isArray(raw) ? raw : []);
  if (calcs.length === 0) return null;
  const perf = calcs.find((c: any) => c.$type === "calculated-performance") || calcs[0];
  if (!perf) return null;
  const returnPct = (perf.performance ?? perf.netReturn ?? 0) * 100;
  const benchmarkPct = (perf.benchmarkReturn ?? perf.benchmark ?? 0) * 100;
  return {
    returnPct: parseFloat(returnPct.toFixed(4)),
    benchmarkPct: parseFloat(benchmarkPct.toFixed(4)),
    alpha: parseFloat((returnPct - benchmarkPct).toFixed(4)),
    sharpeRatio: perf.sharpeRatio ?? perf.sharpe ?? 0,
    maxDrawdown: perf.maxDrawdown ?? perf.maximumDrawdown ?? 0,
    period: `${perf.startDate || ""} – ${perf.endDate || ""}`,
    asOfDate: raw.asOfDate || perf.endDate || null,
  };
}

/**
 * Flatten Orion Reporting/Scope contributions response into UI-friendly shape.
 * Input: { calculations: [{ value: 27086493.94, units: 3179807.02, ... }] }
 * Output: { contributions, withdrawals, netFlow }
 */
function flattenContributions(raw: any): any {
  if (!raw) return null;
  const calcs = raw?.calculations || (Array.isArray(raw) ? raw : []);
  if (calcs.length === 0) return null;
  const activity = calcs.find((c: any) => c.$type === "calculated-activity") || calcs[0];
  if (!activity) return null;
  const value = activity.value ?? 0;
  // Positive value = net contributions; negative = net withdrawals
  return {
    contributions: value >= 0 ? value : 0,
    withdrawals: value < 0 ? Math.abs(value) : 0,
    netFlow: value,
    period: `${activity.startDate || ""} – ${activity.endDate || ""}`,
    asOfDate: raw.asOfDate || activity.endDate || null,
  };
}

/**
 * Parse Orion Reporting/Scope cost-basis response into a lookup map.
 * The response structure varies but typically contains calculations with
 * asset-level cost basis data. Returns a Map of ticker/assetId → costBasis.
 */
function parseCostBasis(raw: any): Map<string, number> {
  const map = new Map<string, number>();
  if (!raw) return map;

  const calcs = raw?.calculations || (Array.isArray(raw) ? raw : []);
  for (const calc of calcs) {
    // Walk the nested calculation tree looking for cost basis values
    const items = calc?.items || calc?.details || calc?.assets || [];
    for (const item of items) {
      const key = item.ticker || item.symbol || item.assetName || item.id;
      const basis = item.costBasis ?? item.cost ?? item.totalCost ?? item.value;
      if (key && typeof basis === "number" && basis > 0) {
        const existing = map.get(key) || 0;
        map.set(key, existing + basis);
      }
    }
    // Also check if the calc itself is an aggregate with cost basis
    if (calc.costBasis ?? calc.cost ?? calc.totalCost) {
      const key = calc.ticker || calc.symbol || calc.assetName || calc.accountId || calc.id;
      if (key) {
        map.set(String(key), calc.costBasis ?? calc.cost ?? calc.totalCost);
      }
    }
  }

  // Also handle flat array responses (some Orion versions return this)
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const key = item.ticker || item.symbol || item.assetName || item.id;
      const basis = item.costBasis ?? item.cost ?? item.totalCost ?? item.value;
      if (key && typeof basis === "number" && basis > 0) {
        map.set(String(key), basis);
      }
    }
  }

  return map;
}

// Reuse globalThis cache from GET /api/clients
const g = globalThis as any;
if (!g._enrichedClientsCache) g._enrichedClientsCache = null;
const ENRICHED_CLIENTS_TTL = 10 * 60 * 1000;

function getCache(): {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
} | null {
  return g._enrichedClientsCache;
}

// Allocation bar color map
const ALLOCATION_COLORS: Record<string, string> = {
  EQ: "#3B82F6",
  FI: "#14B8A6",
  ALT: "#A855F7",
  CA: "#F59E0B",
};

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/clients/[id]/portfolio
// Tier 2 — heavy endpoint (3-8s): Orion accounts, assets, computed allocation
// ---------------------------------------------------------------------------
export async function GET(request: Request, { params }: RouteContext) {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;
  const { id } = await params;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  // -----------------------------------------------------------------------
  // Salesforce + Orion portfolio data for UAT advisors
  // -----------------------------------------------------------------------
  const userEmail = session.userEmail;
  const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;

  // ── Client Identity Resolution ──
  const identity = await resolveClientIdentity(id, userEmail);
  const liveSfId = identity.salesforceHouseholdId;

  if (isSalesforceUser(userEmail) && isMulesoftEnabled() && liveSfId) {
    try {
      // Step 1: Resolve SF household name (needed for Orion name matching)
      let householdName = "Unknown";

      const cache = getCache();
      const cacheHit =
        cache &&
        cache.userEmail === userEmail &&
        Date.now() - cache.ts < ENRICHED_CLIENTS_TTL
          ? cache.data.find((c: any) => c.id === id)
          : null;

      if (cacheHit) {
        householdName =
          [cacheHit.firstName, cacheHit.lastName].filter(Boolean).join(" ") ||
          "Unknown";
      } else {
        // Cache miss — paginate through SF to find the household
        let offset = 0;
        const pageSize = 50;
        let sfHousehold: any = null;

        while (!sfHousehold) {
          const page = await getLiveHouseholds({
            username: sfUsername!,
            pageSize,
            offset,
          });
          if (!page || !page.householdAccounts) break;

          sfHousehold = page.householdAccounts.find(
            (h: any) => h.Id === id
          );

          if (sfHousehold || !page.hasMore) break;
          offset += pageSize;
          if (offset > pageSize * 12) break;
        }

        if (!sfHousehold) {
          throw new Error(`Household ${id} not found in Salesforce`);
        }
        householdName = sfHousehold.Name || "Unknown";
      }

      // Step 2: Find matching Orion client by fuzzy name match
      const allOrionClients = await getOrionClientsValue();
      const nameLower = householdName.toLowerCase();
      const nameWords = nameLower
        .split(/[\s,&]+/)
        .filter((w: string) => w.length > 2);

      const orionMatches = allOrionClients
        .map((orion) => {
          const orionName = (orion.name || "").toLowerCase();
          let score = 0;
          if (orionName === nameLower) score = 100;
          else {
            for (const word of nameWords) {
              if (orionName.includes(word)) score += 30;
            }
          }
          return { ...orion, matchScore: score };
        })
        .filter((o) => o.matchScore >= 60)
        .sort((a, b) => b.matchScore - a.matchScore);

      const bestMatch = orionMatches[0];

      // Step 3: Fetch Orion accounts + assets in parallel
      let orionAccounts: any[] = [];
      let orionAssets: any[] = [];
      let performanceData: any[] = [];
      let contributionsData: any[] = [];
      const _errors: string[] = [];
      let orionAccountsLoaded = false;
      let costBasisData: any = [];

      const orionNumericId = bestMatch?.id ? Number(bestMatch.id) : NaN;
      if (bestMatch && bestMatch.id && !isNaN(orionNumericId)) {
        const [acctsFetched, assetsFetched] = await Promise.all([
          getOrionClientAccounts(bestMatch.id),
          getOrionClientAssets(bestMatch.id),
        ]);
        orionAccounts = acctsFetched;
        orionAssets = assetsFetched;
        orionAccountsLoaded = orionAccounts.length > 0;

        // Fetch performance metrics and contributions using Orion account IDs
        const accountIds = orionAccounts
          .filter((a) => a.id && !isNaN(Number(a.id)))
          .map((a) => Number(a.id));

        if (accountIds.length > 0) {
          const [perfResult, contribResult, costBasisResult] = await Promise.allSettled([
            getPerformanceWithRiskMetrics(accountIds),
            getContributionsYTD(accountIds),
            getCostBasis(accountIds),
          ]);
          if (perfResult.status === "fulfilled") {
            performanceData = perfResult.value;
          } else {
            _errors.push(`Performance: ${perfResult.reason?.message || "Unknown error"}`);
            logger.error({ err: perfResult.reason }, "[Portfolio] Performance fetch failed");
          }
          if (contribResult.status === "fulfilled") {
            contributionsData = contribResult.value;
          } else {
            _errors.push(`Contributions: ${contribResult.reason?.message || "Unknown error"}`);
            logger.error({ err: contribResult.reason }, "[Portfolio] Contributions fetch failed");
          }
          if (costBasisResult.status === "fulfilled") {
            costBasisData = costBasisResult.value;
          } else {
            _errors.push(`CostBasis: ${costBasisResult.reason?.message || "Unknown error"}`);
            logger.error({ err: costBasisResult.reason }, "[Portfolio] CostBasis fetch failed");
          }
        }
      }

      // Step 4: Extract registration type from Orion account name
      function extractRegType(name: string): string {
        if (!name) return "";
        const n = name.toLowerCase();
        if (n.includes("roth ira")) return "Roth IRA";
        if (n.includes("rollover ira")) return "Rollover IRA";
        if (n.includes("sep ira") || n.includes("sep-ira")) return "SEP IRA";
        if (n.includes("simple ira")) return "SIMPLE IRA";
        if (n.includes(", ira")) return "IRA";
        if (n.includes("401(k)") || n.includes("401k")) return "401(k)";
        if (n.includes("403(b)") || n.includes("403b")) return "403(b)";
        if (n.includes("529")) return "529 Plan";
        if (n.includes("trust")) return "Trust";
        if (n.includes("nq annuity") || n.includes("non-qual"))
          return "NQ Annuity";
        if (n.includes("annuity")) return "Annuity";
        if (n.includes("joint")) return "Joint";
        if (n.includes("individual")) return "Individual";
        if (n.includes("custodial") || n.includes("ugma") || n.includes("utma"))
          return "Custodial";
        return "";
      }

      // Step 5: Map Orion accounts -> UI account shape
      const accounts = orionAccounts
        .filter((a) => (a.totalValue || 0) > 0 && a.isActive !== false)
        .map((a: any, i: number) => {
          const acctName = a.name || a.accountType || "Investment Account";
          const regType = a.registrationType || extractRegType(acctName);
          const taxStat = a.taxStatus
            ? a.taxStatus
            : regType.toLowerCase().includes("ira") &&
                !regType.toLowerCase().includes("roth")
              ? "tax-deferred"
              : regType.toLowerCase().includes("roth")
                ? "tax-free"
                : "taxable";
          return {
            id: a.id || `orion-${i}`,
            clientId: id,
            householdId: id,
            name: acctName,
            accountNumber: a.accountNumber || "",
            accountType: regType || a.accountType || acctName,
            registrationType: regType,
            custodian: a.custodian || "Orion",
            managementStyle: a.managementStyle || "",
            model: a.model || a.portfolio || "",
            balance: String(a.totalValue || 0),
            managedValue: a.totalValue || 0,
            nonManagedValue: a.nonManagedValue || 0,
            taxStatus: taxStat,
            status: a.status || "active",
            fundFamily: a.fundFamily || "",
            startDate: a.startDate || a.lastUpdated || null,
            registrationId: a.registrationId || "",
            isLive: true,
          };
        });

      // Step 6: Map Orion assets -> UI holding shape
      const totalAccountValue = accounts.reduce(
        (sum, a) => sum + (parseFloat(a.balance) || 0),
        0
      );

      // Parse cost basis from Reporting/Scope response and merge into holdings
      const costBasisMap = parseCostBasis(costBasisData);
      logger.info(
        { costBasisEntries: costBasisMap.size, fromReportingScope: costBasisData?.calculations?.length || 0 },
        "[Portfolio] Cost basis data parsed"
      );

      const holdings = orionAssets
        .filter((asset: any) => {
          const cv = asset.currentValue || 0;
          const shares = asset.currentShares || 0;
          const hasTicker = asset.ticker && asset.ticker.trim() !== "";
          return cv !== 0 || shares !== 0 || hasTicker;
        })
        .map((asset: any, i: number) => {
          const mv = asset.currentValue || 0;
          const shares = asset.currentShares || 0;
          // Prefer cost basis from Reporting/Scope (the assets endpoint returns null)
          const cbFromScope = costBasisMap.get(asset.ticker) || costBasisMap.get(String(asset.id)) || 0;
          const cb = cbFromScope > 0 ? cbFromScope : (asset.costBasis || 0);
          const unrealizedGL = cb > 0 ? mv - cb : 0;
          const weight =
            totalAccountValue > 0 ? (mv / totalAccountValue) * 100 : 0;

          return {
            id: asset.id || `asset-${i}`,
            accountId: asset.accountId || accounts[0]?.id || "",
            ticker: asset.ticker || "\u2014",
            name: asset.name || "Unknown",
            shares,
            marketValue: String(mv),
            costBasis: String(cb),
            unrealizedGainLoss: String(unrealizedGL),
            weight: String(parseFloat(weight.toFixed(2))),
            sector: asset.assetClass || "Other",
            riskCategory: asset.riskCategory || "",
            productType: asset.productType || "",
            custodian: asset.custodian || "",
            isManaged: asset.isManaged || false,
            isCustodialCash: asset.isCustodialCash || false,
            fundFamily: asset.fundFamily || "",
            currentPrice: asset.currentPrice || 0,
            isLive: true,
          };
        });

      // Step 7: Compute aggregations
      const totalAum = accounts.reduce(
        (sum, a) => sum + (parseFloat(a.balance) || 0),
        0
      );

      // Allocation breakdown: group holdings by sector/assetClass
      const allocationBreakdown: { name: string; value: number; pct: number }[] =
        [];
      const sectorMap = new Map<string, number>();
      for (const h of holdings) {
        const sector = h.sector || "Other";
        sectorMap.set(
          sector,
          (sectorMap.get(sector) || 0) + parseFloat(h.marketValue || "0")
        );
      }
      for (const [name, value] of sectorMap) {
        allocationBreakdown.push({
          name,
          value,
          pct: totalAum > 0 ? (value / totalAum) * 100 : 0,
        });
      }
      allocationBreakdown.sort((a, b) => b.value - a.value);

      // Custodian breakdown: group accounts by custodian
      const custodianBreakdown: {
        name: string;
        count: number;
        value: number;
      }[] = [];
      const custMap = new Map<string, { count: number; value: number }>();
      for (const a of accounts) {
        const cust = a.custodian || "Unknown";
        const entry = custMap.get(cust) || { count: 0, value: 0 };
        entry.count++;
        entry.value += parseFloat(a.balance || "0");
        custMap.set(cust, entry);
      }
      for (const [name, data] of custMap) {
        custodianBreakdown.push({ name, ...data });
      }
      custodianBreakdown.sort((a, b) => b.value - a.value);

      // Top holdings by value (top 10)
      const topHoldingsByValue = [...holdings]
        .sort(
          (a, b) =>
            parseFloat(b.marketValue || "0") - parseFloat(a.marketValue || "0")
        )
        .slice(0, 10)
        .map((h) => ({
          ticker: h.ticker,
          name: h.name,
          marketValue: parseFloat(h.marketValue || "0"),
          weight: parseFloat(h.weight || "0"),
          sector: h.sector,
        }));

      // Sector exposure: group by productType
      const sectorExposure: {
        name: string;
        count: number;
        value: number;
        pct: number;
      }[] = [];
      const prodMap = new Map<string, { count: number; value: number }>();
      for (const h of holdings) {
        const pt = h.productType || "Unknown";
        const entry = prodMap.get(pt) || { count: 0, value: 0 };
        entry.count++;
        entry.value += parseFloat(h.marketValue || "0");
        prodMap.set(pt, entry);
      }
      for (const [name, data] of prodMap) {
        sectorExposure.push({
          name,
          ...data,
          pct: totalAum > 0 ? (data.value / totalAum) * 100 : 0,
        });
      }
      sectorExposure.sort((a, b) => b.value - a.value);

      // Primary custodian: the one with the highest total value
      const primaryCustodian = custodianBreakdown[0]?.name || "";

      // Simplified allocation bar for header
      const simplified: Record<string, number> = {
        EQ: 0,
        FI: 0,
        ALT: 0,
        CA: 0,
      };
      orionAssets.forEach((a: any) => {
        const cls = (
          a.assetClass ||
          a.productType ||
          ""
        ).toLowerCase();
        if (
          cls.includes("equity") ||
          cls.includes("stock") ||
          cls.includes("common")
        )
          simplified.EQ += a.currentValue || 0;
        else if (cls.includes("fixed") || cls.includes("bond"))
          simplified.FI += a.currentValue || 0;
        else if (
          cls.includes("cash") ||
          cls.includes("money market") ||
          cls.includes("equivalent")
        )
          simplified.CA += a.currentValue || 0;
        else simplified.ALT += a.currentValue || 0;
      });

      const totalValue = orionAssets.reduce(
        (sum: number, a: any) => sum + (a.currentValue || 0),
        0
      );
      const allocationBar = Object.entries(simplified)
        .map(([key, val]) => ({
          label: key,
          pct: totalValue > 0 ? Math.round((val / totalValue) * 100) : 0,
          color: ALLOCATION_COLORS[key] || "#6B7280",
        }))
        .filter((a) => a.pct > 0);

      if (_errors.length > 0) {
        logger.error({ errors: _errors, clientId: id }, "[Portfolio] Partial data — some ReportingScope calls failed");
      }

      return NextResponse.json({
        accounts,
        holdings,
        holdingsCount: holdings.length,
        accountCount: accounts.length,
        totalAum,
        allocationBar,
        primaryCustodian,
        allocationBreakdown,
        custodianBreakdown,
        topHoldingsByValue,
        sectorExposure,
        performance: flattenPerformance(performanceData),
        contributions: flattenContributions(contributionsData),
        isLiveData: true,
        _errors: _errors.length > 0 ? _errors : undefined,
        _dataSources: {
          orion: orionAccountsLoaded ? "live" : "error",
          reportingScope: _errors.length === 0 ? "live" : "partial",
        },
        _identity: { ...identity, dataPath: "live" as const },
      }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
    } catch (err) {
      logger.error({ err }, `[Portfolio] SF/Orion fetch failed for ${id}, trying direct SF`);
    }

    // ── Direct SF SOQL fallback — financial accounts + top holdings ──
    if (isSalesforceEnabled() && isValidSalesforceId(id)) {
      try {
        const [sfAccounts, sfHoldings] = await Promise.allSettled([
          getFinancialAccountsByHousehold(id),
          getTopHoldingsByHousehold(id, 30),
        ]);

        const accounts = (sfAccounts.status === "fulfilled" ? sfAccounts.value : []).map((a: any) => ({
          id: a.Id,
          name: a.Name || "Account",
          accountType: a.FinServ__FinancialAccountType__c || "Unknown",
          balance: a.FinServ__Balance__c || 0,
          status: a.FinServ__Status__c || "Active",
          heldAway: a.FinServ__HeldAway__c || false,
          custodian: a.FinServ__Custodian__c || "",
          openDate: a.FinServ__OpenDate__c || null,
        }));

        const holdings = (sfHoldings.status === "fulfilled" ? sfHoldings.value : []).map((h: any) => ({
          ticker: h.FinServ__Symbol__c || h.Name || "???",
          name: h.Name || "",
          marketValue: h.FinServ__MarketValue__c || 0,
          shares: h.FinServ__Shares__c || 0,
          price: h.FinServ__Price__c || 0,
          gainLoss: h.FinServ__GainLoss__c || 0,
          accountName: h.FinServ__FinancialAccount__r?.Name || "",
        }));

        if (accounts.length > 0 || holdings.length > 0) {
          const totalAum = accounts.reduce((s: number, a: any) => s + a.balance, 0);
          return NextResponse.json({
            accounts,
            holdings,
            totalAum,
            allocation: [],
            performance: null,
            cashFlow: null,
            costBasis: [],
            isLiveData: true,
            source: "sf-direct",
          }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
        }
      } catch (err) {
        logger.warn({ err }, `[Portfolio] Direct SF fallback also failed for ${id}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Fallback: local database
  // -----------------------------------------------------------------------
  try {
    const client = await storage.getClient(id);
    if (!client)
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );

    if (session.userType === "associate") {
      const assignedClients = await storage.getClientsByAssociate(
        session.userId
      );
      if (!assignedClients.some((c) => c.id === client.id)) {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        );
      }
    } else if (session.userType === "advisor") {
      if (client.advisorId !== session.userId) {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        );
      }
    }

    const [accounts, holdings] = await Promise.all([
      storage.getAccountsByClient(client.id),
      storage.getHoldingsByClient(client.id),
    ]);

    const totalAum = accounts.reduce(
      (sum, a) => sum + parseFloat(a.balance as string),
      0
    );

    // Allocation breakdown from local holdings
    const allocationBreakdown: { name: string; value: number; pct: number }[] =
      [];
    const sectorMap = new Map<string, number>();
    for (const h of holdings) {
      const sector = (h as any).sector || "Other";
      const mv = parseFloat((h as any).marketValue || "0");
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + mv);
    }
    for (const [name, value] of sectorMap) {
      allocationBreakdown.push({
        name,
        value,
        pct: totalAum > 0 ? (value / totalAum) * 100 : 0,
      });
    }
    allocationBreakdown.sort((a, b) => b.value - a.value);

    // Custodian breakdown from local accounts
    const custodianBreakdown: {
      name: string;
      count: number;
      value: number;
    }[] = [];
    const custMap = new Map<string, { count: number; value: number }>();
    for (const a of accounts) {
      const cust = (a as any).custodian || "Unknown";
      const entry = custMap.get(cust) || { count: 0, value: 0 };
      entry.count++;
      entry.value += parseFloat(a.balance as string) || 0;
      custMap.set(cust, entry);
    }
    for (const [name, data] of custMap) {
      custodianBreakdown.push({ name, ...data });
    }
    custodianBreakdown.sort((a, b) => b.value - a.value);

    // Top holdings by value
    const topHoldingsByValue = [...holdings]
      .sort(
        (a, b) =>
          parseFloat((b as any).marketValue || "0") -
          parseFloat((a as any).marketValue || "0")
      )
      .slice(0, 10)
      .map((h: any) => ({
        ticker: h.ticker || "",
        name: h.name || "Unknown",
        marketValue: parseFloat(h.marketValue || "0"),
        weight: parseFloat(h.weight || "0"),
        sector: h.sector || "Other",
      }));

    // Sector exposure from local holdings
    const sectorExposure: {
      name: string;
      count: number;
      value: number;
      pct: number;
    }[] = [];
    const prodMap = new Map<string, { count: number; value: number }>();
    for (const h of holdings) {
      const pt = (h as any).productType || (h as any).sector || "Unknown";
      const entry = prodMap.get(pt) || { count: 0, value: 0 };
      entry.count++;
      entry.value += parseFloat((h as any).marketValue || "0");
      prodMap.set(pt, entry);
    }
    for (const [name, data] of prodMap) {
      sectorExposure.push({
        name,
        ...data,
        pct: totalAum > 0 ? (data.value / totalAum) * 100 : 0,
      });
    }
    sectorExposure.sort((a, b) => b.value - a.value);

    const primaryCustodian = custodianBreakdown[0]?.name || "";

    // Simplified allocation bar from local holdings
    const simplified: Record<string, number> = {
      EQ: 0,
      FI: 0,
      ALT: 0,
      CA: 0,
    };
    for (const h of holdings) {
      const cls = (
        (h as any).sector ||
        (h as any).productType ||
        ""
      ).toLowerCase();
      const mv = parseFloat((h as any).marketValue || "0");
      if (
        cls.includes("equity") ||
        cls.includes("stock") ||
        cls.includes("common")
      )
        simplified.EQ += mv;
      else if (cls.includes("fixed") || cls.includes("bond"))
        simplified.FI += mv;
      else if (
        cls.includes("cash") ||
        cls.includes("money market") ||
        cls.includes("equivalent")
      )
        simplified.CA += mv;
      else simplified.ALT += mv;
    }
    const localTotalValue = holdings.reduce(
      (sum, h) => sum + parseFloat((h as any).marketValue || "0"),
      0
    );
    const allocationBar = Object.entries(simplified)
      .map(([key, val]) => ({
        label: key,
        pct:
          localTotalValue > 0
            ? Math.round((val / localTotalValue) * 100)
            : 0,
        color: ALLOCATION_COLORS[key] || "#6B7280",
      }))
      .filter((a) => a.pct > 0);

    return NextResponse.json({
      accounts,
      holdings,
      holdingsCount: holdings.length,
      accountCount: accounts.length,
      totalAum,
      allocationBar,
      primaryCustodian,
      allocationBreakdown,
      custodianBreakdown,
      topHoldingsByValue,
      sectorExposure,
      isLiveData: false,
      _identity: { ...identity, dataPath: (liveSfId ? "local-db" : "local-db-uuid-skip") as const },
    }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    logger.error({ err: err }, `[Portfolio] Local DB fetch failed for ${id}`);
    return NextResponse.json(
      { message: "Failed to fetch portfolio data" },
      { status: 500 }
    );
  }
} catch (err) {
    logger.error({ err }, "[clients/[id]/portfolio] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
