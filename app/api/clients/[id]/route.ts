import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateBody, validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { insertClientSchema } from "@shared/schema";
import { calculateHealthScore } from "@server/utils/health-score";
import { generateSparklineData } from "@server/utils/sparkline-data";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
  getClientAccounts as getOrionClientAccounts,
  getClientAssets as getOrionClientAssets,
  getHouseholdMembers as getLiveHouseholdMembers,
  postReportingScope,
} from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";
import { resolveClientIdentity } from "@server/lib/client-identity";
import { resolvePhone } from "@server/lib/resolve-phone";
import { getCache, isCacheValid, getCachedClient, resolveClientFast } from "@server/lib/enriched-clients-cache";

// ── Per-client response cache ──
// Short-circuits the entire monolithic handler when the same client
// is requested again within the TTL. Matches the client-side staleTime (10 min)
// so repeat navigations never re-run the ~800 lines of SF+Orion transformation.
const CLIENT_DETAIL_TTL = 10 * 60 * 1000; // 10 min — matches client-side staleTime + BoundedCache TTLs
const MAX_CACHED_CLIENTS = 200;           // increased from 50 — covers full advisor book
const g = globalThis as any;
if (!g._clientDetailCache) g._clientDetailCache = new Map<string, { json: any; ts: number }>();
const clientDetailCache: Map<string, { json: any; ts: number }> = g._clientDetailCache;

function getCachedClientDetail(key: string): any | null {
  const entry = clientDetailCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CLIENT_DETAIL_TTL) {
    clientDetailCache.delete(key);
    return null;
  }
  return entry.json;
}

function setCachedClientDetail(key: string, json: any): void {
  // Evict oldest if at capacity
  if (clientDetailCache.size >= MAX_CACHED_CLIENTS) {
    const oldest = clientDetailCache.keys().next().value;
    if (oldest) clientDetailCache.delete(oldest);
  }
  clientDetailCache.set(key, { json, ts: Date.now() });
}

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/clients/[id]
// ---------------------------------------------------------------------------
export async function GET(request: Request, { params }: RouteContext) {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;
  const { id } = await params;
    const clientId = id;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  // -----------------------------------------------------------------------
  // Performance timing — measures every phase for audit
  // -----------------------------------------------------------------------
  const _t0 = Date.now();
  const _timing: Record<string, number> = {};

  // -----------------------------------------------------------------------
  // Salesforce + Orion household detail for UAT advisors
  // -----------------------------------------------------------------------
  const userEmail = session.userEmail;
  const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;

  // ── Error tracking for independent data source failures ──
  // Declared here so they're accessible in both the live-data and local-DB paths.
  const _errors: string[] = [];
  let sfSuccess = false;
  let orionSuccess = false;
  let usedLocalDb = false;

  // ── Client Identity Resolution ──
  // Resolve the incoming ID through the canonical identity layer.
  // This determines whether we can use the live SF path, and provides
  // cross-system mappings (local UUID ↔ SF household ↔ Orion).
  const identity = await resolveClientIdentity(id, userEmail);
  const liveSfId = identity.salesforceHouseholdId;

  console.log(
    `[Client Identity] GET /api/clients/${id} | ` +
    `type=${identity.inputIdType} | status=${identity.identityStatus} | ` +
    `method=${identity.resolutionMethod} | liveSfId=${liveSfId || "none"} | ` +
    `isLive=${identity.isLiveIntegrated}`
  );

  if (isSalesforceUser(userEmail) && isMulesoftEnabled() && liveSfId) {
    // ── Response cache short-circuit ──
    // If we already built this client's full JSON within the TTL, return it
    // immediately — skips all SF pagination, Orion calls, and transformation.
    const cacheKey = `${userEmail}:${id}`;
    const cachedResponse = getCachedClientDetail(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse, {
        headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300", "X-Cache": "HIT" },
      });
    }

    // ── Phase 1: Salesforce household lookup ──
    // This MUST succeed to identify the client and find the Orion match.
    // If SF household lookup itself fails, we fall through to local DB.
    let sfHousehold: any = null;
    let sfHouseholdResult: any = null;
    let sfHouseholdPage: any = null;

    try {
      // Fast-path: cache hit → SF page 1 → full warm fallback
      const cacheHit = await resolveClientFast(id, userEmail);

      if (cacheHit) {
        const fullName = [cacheHit.firstName, cacheHit.lastName].filter(Boolean).join(" ");
        sfHousehold = {
          Id: cacheHit.id,
          Name: fullName || "Unknown",
          FinServ__Status__c: cacheHit.status === "active" ? "Active" : cacheHit.status,
          FinServ__TotalFinancialAccounts__c: cacheHit.totalAum || 0,
          FinServ__TotalNonfinancialAssets__c: 0,
          PersonEmail: cacheHit.email || "",
          Phone: cacheHit.phone || "",
          PersonTitle: cacheHit.occupation || "",
          FinServ__ClientCategory__c: cacheHit.segment || "A",
          Type: cacheHit.entityType === "business" ? "Business" : "",
          CreatedDate: cacheHit.createdDate || "",
        };
        try {
          sfHouseholdResult = await getLiveHouseholds({
            username: sfUsername!,
            pageSize: 1,
          });
        } catch (_activityErr) {
          sfHouseholdResult = null;
        }
        sfHouseholdPage = sfHouseholdResult;
      }

      if (!sfHousehold) {
        throw new Error(`Household ${id} not found in Salesforce`);
      }
    } catch (sfLookupErr: any) {
      // SF household lookup failed — try stale cache before giving up.
      // For live-integrated users, stale real data is ALWAYS better than seed data.
      const errMsg = sfLookupErr?.message || String(sfLookupErr);
      _errors.push(`Salesforce household lookup: ${errMsg}`);
      logger.error({ err: sfLookupErr }, `[Clients] SF household lookup failed for ${id}`);

      // Try stale detail cache (ignore TTL)
      const staleEntry = clientDetailCache.get(`${userEmail}:${id}`);
      if (staleEntry) {
        logger.warn(
          { id, staleAge: Date.now() - staleEntry.ts },
          "[Clients] Serving stale cached detail for SF client (live lookup failed)"
        );
        return NextResponse.json({
          ...staleEntry.json,
          _errors,
          _dataSources: { orion: "stale-cache", salesforce: "stale-cache", fallback: "stale-live-cache" },
          _dataIntegrity: "stale-live-composite",
        }, {
          headers: { "Cache-Control": "private, no-cache", "X-Cache": "STALE" },
        });
      }

      // No stale cache — return honest error for SF ID (do NOT fall through to seed data)
      if (identity.inputIdType === "salesforce-household") {
        logger.error({ id }, "[Clients] SF lookup failed with no stale cache — returning honest error (NOT seed fallback)");
        return NextResponse.json({
          error: "Client data temporarily unavailable",
          _errors,
          _dataSources: { salesforce: "error", orion: "unknown", fallback: "none-available" },
          _dataIntegrity: "live-sources-unavailable",
        }, { status: 503 });
      }
      // For non-SF IDs (UUIDs), fall through to local DB — that IS their correct data source
    }

    // Only proceed with live data assembly if SF household was found
    if (sfHousehold) {
      const householdName = sfHousehold.Name || "Unknown";
      const householdStatus = sfHousehold.FinServ__Status__c || "Active";

      // Look up householdDetails enrichment for THIS household
      const detailsPage = sfHouseholdPage || sfHouseholdResult;
      const detailMap = new Map<string, any>();
      for (const detail of detailsPage?.householdDetails || []) {
        if (detail.householdId) detailMap.set(detail.householdId, detail);
      }
      const sfDetail = detailMap.get(id) || {};
      const sfAssetsAndLiabilities = sfDetail.assetsAndLiabilities || [];

      // ── Phase 2: Orion data (independent of SF detail data) ──
      let orionAccounts: any[] = [];
      let orionAssets: any[] = [];
      let orionReportData: any[] = [];
      let bestMatch: any = null;

      try {
        // Step 2: Find matching Orion portfolio records by name
        const allOrionClients = await getOrionClientsValue();
        const nameLower = householdName.toLowerCase();
        const nameWords = nameLower.split(/[\s,&]+/).filter((w: string) => w.length > 2);

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
          .filter((o) => o.matchScore >= 40) // Lowered from 60 to catch more matches
          .sort((a, b) => b.matchScore - a.matchScore);

        bestMatch = orionMatches[0];
        if (!bestMatch) {
          const topCandidate = allOrionClients
            .map(o => ({ name: o.name, score: (() => { const n = (o.name || "").toLowerCase(); let s = 0; if (n === nameLower) s = 100; else { for (const w of nameWords) { if (n.includes(w)) s += 30; } } return s; })() }))
            .sort((a, b) => b.score - a.score)[0];
          logger.warn({ clientId: id, householdName, topCandidate: topCandidate?.name, topScore: topCandidate?.score }, "No Orion match found — portfolio data will be empty");
        }

        // Step 3: Fetch Orion accounts + assets first, then use account IDs for reporting
        const orionNumericId = bestMatch?.id ? Number(bestMatch.id) : NaN;
        if (bestMatch && bestMatch.id && !isNaN(orionNumericId)) {
          const today = new Date().toISOString().split("T")[0];
          const yearStart = `${new Date().getFullYear()}-01-01`;

          // Phase A: Fetch accounts and assets (we need account IDs for reporting)
          const _tA = Date.now();
          const [acctsFetched, assetsFetched] = await Promise.all([
            getOrionClientAccounts(bestMatch.id),
            getOrionClientAssets(bestMatch.id),
          ]);

          // Extract Orion Account IDs for reporting scope calls
          const orionAccountIds = acctsFetched
            .map((a: any) => Number(a.id))
            .filter((id: number) => !isNaN(id) && id > 0);
          const reportEntityIds = orionAccountIds.length > 0 ? orionAccountIds : [orionNumericId];
          // Use actual Orion Account IDs (not Client IDs) for Reporting/Scope

          _timing.phaseA_accounts_assets = Date.now() - _tA;

          // Phase B: Fetch reporting data using actual Account IDs
          // CONSOLIDATED: Performance + Allocation + Portfolio Details in ONE call (was 3 separate)
          // Per Mukesh (MuleSoft team, March 23): "create one big call with all the different
          // elements you need instead of doing multiple calls for different objects"
          const _tB = Date.now();
          const [accts, assets, overviewData, taxData_raw] =
            await Promise.all([
              Promise.resolve(acctsFetched),
              Promise.resolve(assetsFetched),

              // Consolidated Call A: Client Overview
              // Combines: Performance + Allocation + Portfolio Details (MV, holdings, income)
              postReportingScope({
                entity: "Account",
                entityIds: reportEntityIds,
                asOfDate: today,
                managed: 16,
                calculations: [
                  // ── Performance (MTD/YTD/1Y/ITD) ──
                  {
                    id: "MTD Performance",
                    $type: "performance",
                    contextChange: {
                      reportCategoryId: 1,
                      quickDate: "MTD",
                      performanceOption: {
                        $type: "performance",
                        calculationMethod: "TWR",
                        calcGrossOfFees: false,
                      },
                    },
                  },
                  {
                    id: "YTD Performance",
                    $type: "performance",
                    contextChange: {
                      reportCategoryId: 1,
                      quickDate: "YTD",
                      performanceOption: {
                        $type: "performance",
                        calculationMethod: "TWR",
                        calcGrossOfFees: false,
                      },
                    },
                  },
                  {
                    id: "1Y Performance",
                    $type: "performance",
                    contextChange: {
                      reportCategoryId: 1,
                      quickDate: "1 Year",
                      performanceOption: {
                        $type: "performance",
                        calculationMethod: "TWR",
                        calcGrossOfFees: false,
                      },
                    },
                  },
                  {
                    id: "ITD Performance",
                    $type: "performance",
                    contextChange: {
                      reportCategoryId: 1,
                      quickDate: "ITD",
                      performanceOption: {
                        $type: "performance",
                        calculationMethod: "TWR",
                        calcGrossOfFees: false,
                      },
                    },
                  },
                  // ── Allocation (grouped by Asset Class) ──
                  {
                    $type: "grouping",
                    grouping: "Asset Class",
                    calculations: [
                      {
                        id: "Allocation by Asset Class",
                        $type: "allocation",
                        contextChange: {
                          reportCategoryId: 4,
                        },
                      },
                    ],
                  },
                  // ── Portfolio Details (Account Ending MV) ──
                  {
                    id: "Account Ending MV",
                    $type: "activity",
                    contextChange: {
                      reportCategoryId: 8,
                      ActivityOption: {
                        $type: "market-value",
                        valuationMethod: "EndingMarketValue",
                        IncludeAccruedInterest: false,
                        inceptionValueMethod: "New Money",
                      },
                      dateRange: {
                        $type: "date-range",
                        startDate: today,
                        endDate: today,
                      },
                    },
                  },
                  // ── Holdings (Asset-level detail + income) ──
                  {
                    $type: "grouping",
                    grouping: "Asset",
                    calculations: [
                      {
                        id: "Asset Name",
                        $type: "group-info",
                        entity: "Undefined",
                        property: "Name",
                      },
                      {
                        id: "Asset Ending MV",
                        $type: "activity",
                        contextChange: {
                          reportCategoryId: 8,
                          ActivityOption: {
                            $type: "market-value",
                            valuationMethod: "EndingMarketValue",
                            IncludeAccruedInterest: false,
                            inceptionValueMethod: "New Money",
                          },
                          dateRange: {
                            $type: "date-range",
                            startDate: today,
                            endDate: today,
                          },
                        },
                      },
                      {
                        id: "Estimated Annual Income",
                        $type: "estimated-annual-income",
                        contextChange: { reportCategoryId: 8 },
                      },
                    ],
                  },
                ],
              }).catch(() => [] as any[]),

              // Call B: Tax Details (separate — different grouping structure)
              postReportingScope({
                entity: "Account",
                entityIds: reportEntityIds,
                asOfDate: today,
                managed: 16,
                calculations: [
                  {
                    $type: "grouping",
                    grouping: "Account",
                    calculations: [
                      {
                        id: "Tax Detail - Aggregate",
                        $type: "cost-basis",
                        contextChange: {
                          reportCategoryId: 16,
                          dateRange: {
                            $type: "date-range",
                            startDate: yearStart,
                            endDate: today,
                          },
                        },
                      },
                      {
                        id: "Tax Detail - Short Term",
                        $type: "shortterm-cost-basis",
                        contextChange: {
                          reportCategoryId: 16,
                          dateRange: {
                            $type: "date-range",
                            startDate: yearStart,
                            endDate: today,
                          },
                        },
                      },
                      {
                        id: "Tax Detail - Long Term",
                        $type: "longterm-cost-basis",
                        contextChange: {
                          reportCategoryId: 16,
                          dateRange: {
                            $type: "date-range",
                            startDate: yearStart,
                            endDate: today,
                          },
                        },
                      },
                      {
                        id: "Tax Detail - Lots",
                        $type: "cost-basis-lots",
                        contextChange: {
                          reportCategoryId: 16,
                          dateRange: {
                            $type: "date-range",
                            startDate: yearStart,
                            endDate: today,
                          },
                        },
                      },
                    ],
                  },
                ],
              }).catch(() => [] as any[]),
            ]);

          _timing.phaseB_reporting_parallel = Date.now() - _tB;
          orionAccounts = accts;
          orionAssets = assets;

          // The Reporting/Scope API returns nested calculation trees.
          // overviewData = consolidated response containing performance + allocation + portfolio
          // taxData_raw = separate call for tax details
          // Tag each with source for targeted parsing downstream.
          orionReportData = [
            { _source: "performance", raw: overviewData },
            { _source: "allocation", raw: overviewData },
            { _source: "portfolio", raw: overviewData },
            { _source: "tax", raw: taxData_raw },
          ].filter((d) => d.raw && (typeof d.raw === "object"));
        }

        orionSuccess = true;
      } catch (orionErr: any) {
        const errMsg = orionErr?.message || String(orionErr);
        _errors.push(`Orion: ${errMsg}`);
        logger.error(
          `[Clients] Orion data fetch failed for ${id} (SF data preserved)`,
          orionErr
        );
        // Orion failed but we continue with SF data + empty Orion fields
      }

      // ── Phase 3: Salesforce detail data (members, tasks, events, etc.) ──
      const _t3 = Date.now();
      // Independent of Orion — if this fails, Orion data is still returned.
      let sfMembers: any[] = [];
      let sfMembersResult: any = null;

      try {
        // Fire off SF household members
        sfMembersResult = await getLiveHouseholdMembers({
          username: sfUsername!,
          householdId: id,
        });
        sfMembers = sfMembersResult?.members || [];
        sfSuccess = true;
      } catch (sfDetailErr: any) {
        const errMsg = sfDetailErr?.message || String(sfDetailErr);
        _errors.push(`Salesforce members/detail: ${errMsg}`);
        logger.error(
          `[Clients] SF household members fetch failed for ${id} (Orion data preserved)`,
          sfDetailErr
        );
        sfMembers = [];
        // SF household lookup itself succeeded (we have sfHousehold), only members failed
        sfSuccess = true; // Household data is still valid
      }

      _timing.phase3_sf_members = Date.now() - _t3;

      // Use primaryContactId from members response to pick the right primary member
      const primaryContactId = sfMembersResult?.primaryContactId || sfMembersResult?.primaryMemberAccountId;
      const primaryMember = primaryContactId
        ? sfMembers.find((m: any) => m.Id === primaryContactId) || sfMembers[0]
        : sfMembers[0];

      // Classify entity type
      const sfType = (sfHousehold.Type || sfHousehold.RecordType?.Name || "").toLowerCase();
      const nameUpper = householdName.toUpperCase();
      const isBusiness =
        sfType.includes("business") ||
        sfType.includes("corporate") ||
        sfType.includes("organization") ||
        sfType.includes("trust") ||
        /\b(LLC|INC|CORP|LTD|LP|TRUST|FOUNDATION|ESTATE|ASSOC|GROUP|PARTNERS)\b/.test(nameUpper);

      // Step 5: Build unified client detail response
      const _resolvedPhone = resolvePhone(primaryMember || {});

      const sfClient = {
        id,
        firstName: householdName.split(" ")[0] || householdName,
        lastName: householdName.split(" ").slice(1).join(" ") || "",
        email:
          primaryMember?.PersonEmail ||
          sfHousehold.PersonEmail ||
          sfHousehold.Email__c ||
          sfHousehold.FinServ__PrimaryContact__r?.Email ||
          "",
        phone:
          _resolvedPhone?.number ||
          sfHousehold.Phone ||
          sfHousehold.PersonMobilePhone ||
          sfHousehold.FinServ__PrimaryContact__r?.Phone ||
          "",
        phoneType: _resolvedPhone?.type || null,
        phoneRaw: _resolvedPhone?.raw || null,
        occupation:
          primaryMember?.Occupation ||
          sfHousehold.PersonTitle ||
          sfHousehold.Industry ||
          sfHousehold.FinServ__Occupation__c ||
          "",
        employer:
          primaryMember?.Employer ||
          sfHousehold.FinServ__Employer__c ||
          sfHousehold.Company ||
          "",
        segment:
          sfHousehold.FinServ__ClientCategory__c || sfHousehold.Segment__c || "A",
        status: householdStatus.toLowerCase(),
        riskTolerance:
          sfHousehold.FinServ__InvestmentObjectives__c ||
          sfHousehold.Risk_Tolerance__c ||
          "moderate",
        advisorId: session.userId,
        sfHouseholdId: id,
        dateOfBirth:
          primaryMember?.PersonBirthdate || sfHousehold.PersonBirthdate || null,
        city:
          primaryMember?.PersonMailingCity ||
          sfHousehold.BillingCity ||
          sfHousehold.ShippingCity ||
          "",
        state:
          primaryMember?.PersonMailingState ||
          sfHousehold.BillingState ||
          sfHousehold.ShippingState ||
          "",
        address:
          primaryMember?.PersonMailingStreet ||
          sfHousehold.BillingStreet ||
          sfHousehold.ShippingStreet ||
          "",
        zip:
          primaryMember?.PersonMailingPostalCode ||
          sfHousehold.BillingPostalCode ||
          sfHousehold.ShippingPostalCode ||
          "",
        entityType: isBusiness ? "business" : "individual",
        description: sfHousehold.Description || sfHousehold.FinServ__Notes__c || "",
        interests: sfHousehold.FinServ__Interests__c || sfHousehold.Hobbies__c || "",
        notes: sfHousehold.FinServ__Notes__c || sfHousehold.Description || "",
        createdDate: sfHousehold.CreatedDate || "",
        reviewFrequency: sfHousehold.FinServ__ReviewFrequency__c || "",
        lastReview: sfHousehold.FinServ__LastReview__c || null,
        nextReview: sfHousehold.FinServ__NextReview__c || null,
        serviceModel: sfHousehold.FinServ__ServiceModel__c || "",
        nonFinancialAssets: sfHousehold.FinServ__TotalNonfinancialAssets__c || 0,
        financialAssets: sfHousehold.FinServ__TotalFinancialAccounts__c || 0,
        isLiveData: true,
      };

      // Extract registration type from Orion account name.
      // Names follow patterns: "Person, IRA", "Person, Roth IRA", "Person - NQ Annuity, Joint"
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
        if (n.includes("nq annuity") || n.includes("non-qual")) return "NQ Annuity";
        if (n.includes("annuity")) return "Annuity";
        if (n.includes("joint")) return "Joint";
        if (n.includes("individual")) return "Individual";
        if (n.includes("custodial") || n.includes("ugma") || n.includes("utma")) return "Custodial";
        return "";
      }

      // Map Orion accounts -> UI account shape
      const accounts = orionAccounts
        .filter((a) => (a.totalValue || 0) > 0 && (a.isActive !== false))
        .map((a: any, i: number) => {
          const acctName = a.name || a.accountType || "Investment Account";
          const regType = a.registrationType || extractRegType(acctName);
          const taxStat = a.taxStatus
            ? a.taxStatus
            : regType.toLowerCase().includes("ira") && !regType.toLowerCase().includes("roth")
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

      // Map Orion assets -> UI holding shape
      const totalAccountValue = accounts.reduce(
        (sum, a) => sum + (parseFloat(a.balance) || 0),
        0
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
          const cb = asset.costBasis || 0;
          const unrealizedGL = cb > 0 ? mv - cb : 0;
          const weight = totalAccountValue > 0 ? (mv / totalAccountValue) * 100 : 0;

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
            isLive: true,
          };
        });

      // ─── Reporting/Scope tree walker ───
      // Recursively flatten the nested calculations tree to find leaf nodes
      // with actual data (performance values, activity values, allocations, etc.).
      function flattenCalcs(node: any): any[] {
        if (!node) return [];
        const results: any[] = [];
        // If the node itself has a $type, it's a calculation node
        if (node.$type) results.push(node);
        // Walk nested calculations arrays
        if (Array.isArray(node.calculations)) {
          for (const child of node.calculations) {
            results.push(...flattenCalcs(child));
          }
        }
        return results;
      }

      function getSourceCalcs(source: string): any[] {
        const entry = orionReportData.find((d: any) => d._source === source);
        if (!entry?.raw) return [];
        return flattenCalcs(entry.raw);
      }

      // Performance: extract calculated-performance nodes
      const perfCalcs = getSourceCalcs("performance");
      const performance: any[] = perfCalcs
        .filter((c: any) => c.$type === "calculated-performance" && c.performance !== undefined && c.performance !== null)
        .map((c: any, i: number) => {
          // Clean period label: "MTD Performance" → "MTD"
          const rawPeriod = c.id || c.period || `P${i}`;
          const period = rawPeriod.replace(/ Performance$/i, "");
          // Orion returns decimal (0.05 = 5%), convert to percentage for display
          const perfValue = Number(c.performance || 0) * 100;
          const benchValue = Number(c.benchmarkPerformance || 0) * 100;
          return {
            id: c.id || `perf-${i}`,
            period,
            returnPct: String(perfValue.toFixed(2)),
            benchmarkPct: String(benchValue.toFixed(2)),
            calculationMethod: c.calculationMethod || "TWR",
          };
        });
      // Performance data extracted from Orion Reporting/Scope

      // Activity: extract calculated-activity nodes (market value, flows)
      const portfolioCalcs = getSourceCalcs("portfolio");
      const activityCalcs = portfolioCalcs
        .filter((c: any) => c.$type === "calculated-activity" || c.value !== undefined);
      const activityData = activityCalcs.map((c: any) => ({
        id: c.id || "",
        value: c.value || 0,
        netFlows: c.netFlows || 0,
        contributions: c.contributions || 0,
        withdrawals: c.withdrawals || 0,
        period: c.id || c.period || "",
      }));

      // Allocation: extract calculated-allocation or grouped allocation data
      const allocCalcs = getSourceCalcs("allocation");
      const allocationData = allocCalcs
        .filter((c: any) =>
          c.$type === "calculated-allocation" ||
          c.$type === "calculated-group" ||
          c.allocation !== undefined ||
          c.percentOfTotal !== undefined
        )
        .map((c: any) => ({
          name: c.groupName || c.assetClass || c.name || c.id || "Other",
          value: c.allocation || c.percentOfTotal || c.weight || 0,
          marketValue: c.marketValue || c.value || 0,
          targetPct: c.targetPct || c.targetAllocation || 0,
          driftPct: c.driftPct || c.drift || 0,
        }));

      // Tax: extract cost basis / gain-loss nodes
      const taxCalcs = getSourceCalcs("tax");
      const taxData = taxCalcs
        .filter((c: any) =>
          c.$type === "calculated-tax" ||
          c.costBasis !== undefined ||
          c.realizedGain !== undefined
        )
        .map((c: any) => ({
          costBasis: c.costBasis || 0,
          realizedGainLoss: c.realizedGain || c.realizedGainLoss || 0,
          unrealizedGainLoss: c.unrealizedGain || c.unrealizedGainLoss || 0,
          taxLiability: c.taxLiability || c.estimatedTax || 0,
        }));

      // Estimated Annual Income: extract from portfolio scope response
      // The request sends "Estimated Annual Income" ($type: estimated-annual-income)
      // grouped by Asset. Sum all matching calc nodes to get total portfolio income.
      const incomeCalcNodes = portfolioCalcs.filter(
        (c: any) => c.id === "Estimated Annual Income" && c.value != null
      );
      const estimatedAnnualIncome = Math.round(
        incomeCalcNodes.reduce((sum: number, c: any) => sum + (c.value || 0), 0)
      );
      console.log(
        `[Income Debug] clientId=${id} | nodes=${incomeCalcNodes.length} | ` +
        `total=$${estimatedAnnualIncome} | values=[${incomeCalcNodes.map((c: any) => c.value).join(", ")}] | ` +
        `totalPortfolioCalcs=${portfolioCalcs.length}`
      );

      // Compute AUM from ACTUAL Orion account values
      const totalAum = accounts.reduce(
        (sum, a) => sum + (parseFloat(a.balance) || 0),
        0
      );

      // TODO: Replace with real Orion AumOverTime data when available via MuleSoft
      // The endpoint GET /Portfolio/Clients/{id}/AumOverTime exists in orion/client.ts
      // but is not yet proxied through MuleSoft EAPI. Using approximation for now.
      const sparklineData =
        totalAum > 0
          ? [
              { date: "6mo", aum: totalAum * 0.94, isApproximate: true },
              { date: "5mo", aum: totalAum * 0.95, isApproximate: true },
              { date: "4mo", aum: totalAum * 0.96, isApproximate: true },
              { date: "3mo", aum: totalAum * 0.97, isApproximate: true },
              { date: "2mo", aum: totalAum * 0.98, isApproximate: true },
              { date: "1mo", aum: totalAum * 0.99, isApproximate: true },
              { date: "now", aum: totalAum, isApproximate: false },
            ]
          : [];
      if (sparklineData.length > 0) {
        logger.warn("[Client Detail] Sparkline AUM data is approximated — Orion AumOverTime not yet available via MuleSoft");
      }

      // Map SF members -> household members shape
      const householdMembers = sfMembers.map((m: any) => {
        const mPhone = resolvePhone(m);
        return {
          id: m.Id,
          clientId: m.Id,
          householdId: id,
          firstName: m.FirstName || "",
          lastName: m.LastName || "",
          email: m.PersonEmail || "",
          phone: mPhone?.number || m.Phone || "",
          phoneType: mPhone?.type || null,
          phoneRaw: mPhone?.raw || null,
          birthdate: m.PersonBirthdate || null,
          city: m.PersonMailingCity || "",
          state: m.PersonMailingState || "",
          address: m.PersonMailingStreet || "",
          zip: m.PersonMailingPostalCode || "",
          relationship: m.FinServ__Role__c || "household_member",
          occupation: m.Occupation || m.FinServ__Occupation__c || m.PersonTitle || "",
          employer: m.Employer || m.FinServ__Employer__c || m.Company || "",
          annualIncome: m.Annual_Income__pc ?? null,
          interests: m.Interests__pc || null,
          maritalStatus: m.Marital_Status__pc || null,
          isLive: true,
        };
      });

      // Map SF tasks — filter to this household where possible
      const householdId = id;
      const allOpenTasks = sfHouseholdResult?.openTasks || [];
      const householdTasks = allOpenTasks.filter(
        (t: any) =>
          t.WhatId === householdId ||
          t.AccountId === householdId ||
          t.What?.Id === householdId
      );
      const filteredTasks =
        householdTasks.length > 0 ? householdTasks : allOpenTasks;
      const tasks = filteredTasks.slice(0, 10).map((t: any) => ({
        id: t.Id,
        title: t.Subject || "Task",
        status: t.Status || "Open",
        priority: t.Priority || "Normal",
        description: t.Description || "",
        dueDate: t.ActivityDate || t.CreatedDate,
        type: t.Type || "",
        whoName: t.Who?.Name || "",
        whatName: t.What?.Name || "",
        ownerId: t.OwnerId || "",
        clientId: householdId,
        clientName: householdName,
        isHouseholdFiltered: householdTasks.length > 0,
      }));

      // Map SF cases -> compliance items
      const mapCaseToComplianceStatus = (
        status?: string,
        priority?: string
      ): string => {
        const s = (status || "").toLowerCase();
        if ((priority || "").toLowerCase() === "high" || s === "escalated")
          return "overdue";
        if (s === "new" || s === "working") return "pending";
        return "expiring_soon";
      };

      const allOpenCases = sfHouseholdResult?.openCases || [];
      const householdCases = allOpenCases.filter(
        (c: any) =>
          c.AccountId === householdId || c.Account?.Id === householdId
      );
      const filteredCases =
        householdCases.length > 0 ? householdCases : allOpenCases;
      const caseComplianceItems = filteredCases.map((c: any) => ({
        id: c.Id || `case-${Math.random().toString(36).slice(2)}`,
        type: c.Type || c.Reason || "Open Case",
        description: [c.Subject, c.Description || c.Status]
          .filter(Boolean)
          .join(" \u2014 "),
        status: mapCaseToComplianceStatus(c.Status, c.Priority),
        dueDate: c.CreatedDate || null,
        completedDate: c.ClosedDate || null,
        ownerId: c.OwnerId || "",
        isLive: true,
      }));

      const detailComplianceTasks = (sfDetail.complianceTasks || []).map(
        (t: any, i: number) => ({
          id: t.Id || `comp-task-${i}`,
          type: t.Type || t.Subject || "Compliance Task",
          description: t.Description || t.Subject || "Compliance requirement",
          status:
            (t.Status || "").toLowerCase() === "completed"
              ? "current"
              : "pending",
          dueDate: t.DueDate || t.ActivityDate || t.CreatedDate || null,
          completedDate: t.CompletedDate || null,
          isLive: true,
        })
      );

      const detailComplianceCases = (sfDetail.complianceCases || []).map(
        (c: any, i: number) => ({
          id: c.Id || `comp-case-${i}`,
          type: c.Type || c.Reason || "Compliance Case",
          description: [c.Subject, c.Description || c.Status]
            .filter(Boolean)
            .join(" \u2014 "),
          status: mapCaseToComplianceStatus(c.Status, c.Priority),
          dueDate: c.CreatedDate || null,
          completedDate: c.ClosedDate || null,
          isLive: true,
        })
      );

      // Deduplicate by ID
      const seenComplianceIds = new Set<string>();
      const complianceItems = [
        ...caseComplianceItems,
        ...detailComplianceTasks,
        ...detailComplianceCases,
      ].filter((item) => {
        if (seenComplianceIds.has(item.id)) return false;
        seenComplianceIds.add(item.id);
        return true;
      });

      // Financial goals from householdDetails
      const financialGoals = (sfDetail.financialGoals || []).map(
        (fg: any, i: number) => ({
          id: fg.Id || `goal-${i}`,
          name:
            fg.Name || fg.FinServ__Description__c || "Financial Goal",
          targetAmount:
            fg.FinServ__TargetValue__c ||
            fg.TargetAmount ||
            fg.targetAmount ||
            0,
          currentAmount:
            fg.FinServ__ActualValue__c ||
            fg.CurrentAmount ||
            fg.currentAmount ||
            0,
          targetDate: fg.FinServ__TargetDate__c || fg.TargetDate || null,
          status: fg.FinServ__Status__c || fg.Status || "active",
          type: fg.FinServ__Type__c || fg.Type || "general",
          isLive: true,
        })
      );

      // Documents from householdDetails
      const sfDocuments = (sfDetail.documents || []).map(
        (d: any, i: number) => ({
          id: d.Id || `doc-${i}`,
          name: d.Title || d.Name || d.FileName || "Document",
          type: d.Type || d.FileType || d.ContentType || "document",
          description: d.Description || "",
          createdDate: d.CreatedDate || d.LastModifiedDate || null,
          status: "complete",
          isLive: true,
        })
      );

      // Recent activity from householdDetails
      const sfActivities = (sfDetail.recentActivity || []).map(
        (a: any, i: number) => ({
          id: a.Id || `activity-${i}`,
          type: a.Type || a.ActivityType || a.TaskSubtype || "activity",
          subject: a.Subject || a.Description || "Activity",
          description: a.Description || a.Subject || "",
          date: a.ActivityDate || a.CreatedDate || null,
          status: a.Status || "completed",
          whoName: a.Who?.Name || "",
          whatName: a.What?.Name || "",
          isLive: true,
        })
      );

      // Revenues from householdDetails
      const sfRevenues = (sfDetail.revenues || []).map(
        (r: any, i: number) => ({
          id: r.Id || `rev-${i}`,
          name: r.Name || r.Type || "Revenue",
          amount: r.Amount || r.FinServ__Amount__c || 0,
          type: r.Type || r.FinServ__Type__c || "recurring",
          date: r.Date || r.FinServ__StartDate__c || null,
          isLive: true,
        })
      );

      // Top holdings from householdDetails (SF-reported, separate from Orion)
      const sfTopHoldings = (sfDetail.topHoldings || []).map(
        (h: any, i: number) => ({
          id: h.Id || `sf-holding-${i}`,
          name:
            h.Name || h.FinServ__Securities__r?.Name || "Holding",
          ticker: h.Ticker || h.Symbol || "",
          marketValue:
            h.MarketValue || h.FinServ__MarketValue__c || 0,
          shares: h.Shares || h.FinServ__Shares__c || 0,
          isLive: true,
        })
      );

      // Health score removed — was a bogus formula (always 100 for any active client).
      // Will reintroduce when real risk/compliance scoring data is available from Orion.
      const healthScore = 0;

      // ---------------------------------------------------------------
      // Computed aggregations from raw Orion data
      // ---------------------------------------------------------------

      // Allocation breakdown: group holdings by sector/assetClass
      const allocationBreakdown: { name: string; value: number; pct: number }[] = [];
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

      // Risk distribution: group holdings by riskCategory
      const riskDistribution: {
        name: string;
        count: number;
        value: number;
        pct: number;
      }[] = [];
      const riskMap = new Map<string, { count: number; value: number }>();
      for (const h of holdings) {
        const cat = h.riskCategory || "Unclassified";
        const entry = riskMap.get(cat) || { count: 0, value: 0 };
        entry.count++;
        entry.value += parseFloat(h.marketValue || "0");
        riskMap.set(cat, entry);
      }
      for (const [name, data] of riskMap) {
        riskDistribution.push({
          name,
          ...data,
          pct: totalAum > 0 ? (data.value / totalAum) * 100 : 0,
        });
      }
      riskDistribution.sort((a, b) => b.value - a.value);

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

      // Account type distribution
      const accountTypeDistribution: {
        name: string;
        count: number;
        value: number;
      }[] = [];
      const typeMap = new Map<string, { count: number; value: number }>();
      for (const a of accounts) {
        const t = a.accountType || "Other";
        const entry = typeMap.get(t) || { count: 0, value: 0 };
        entry.count++;
        entry.value += parseFloat(a.balance || "0");
        typeMap.set(t, entry);
      }
      for (const [name, data] of typeMap) {
        accountTypeDistribution.push({ name, ...data });
      }
      accountTypeDistribution.sort((a, b) => b.value - a.value);

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

      // Managed vs held-away breakdown
      const managedTotal = accounts.reduce(
        (s, a) => s + (a.managedValue || 0),
        0
      );
      const nonManagedTotal = accounts.reduce(
        (s, a) => s + (a.nonManagedValue || 0),
        0
      );
      const managedVsHeldAway = {
        managed: {
          count: accounts.filter((a) => a.managedValue > 0).length,
          value: managedTotal,
        },
        heldAway: {
          count: accounts.filter((a) => (a.nonManagedValue || 0) > 0).length,
          value: nonManagedTotal,
        },
      };

      // Map SF Events -> upcoming events
      const upcomingEvents = (sfHouseholdResult?.upcomingEvents || sfHouseholdResult?.events || []).map((e: any) => ({
        id: e.Id,
        subject: e.Subject,
        startDateTime: e.StartDateTime,
        endDateTime: e.EndDateTime,
        location: e.Location || "",
        type: e.Type || "",
        whoName: e.Who?.Name || "",
        whatName: e.What?.Name || "",
        isAllDayEvent: e.IsAllDayEvent || false,
        isLive: true,
      }));

      // Map SF Opportunities -> stale opportunities
      const staleOpportunities = (sfHouseholdResult?.staleOpportunities || sfHouseholdResult?.opportunities || []).map((o: any) => ({
        id: o.Id,
        name: o.Name,
        stageName: o.StageName,
        closeDate: o.CloseDate,
        lastActivityDate: o.LastActivityDate,
        amount: o.Amount || 0,
        probability: o.Probability ?? null,
        accountName: o.Account?.Name || "",
        type: o.Type || "",
        description: o.Description || "",
        isLive: true,
      }));

      // Map SF Financial Goals with full FinServ__ field names
      const sfFinancialGoals = (sfDetail.financialGoals || []).map((fg: any) => ({
        id: fg.Id,
        name: fg.Name || fg.FinServ__Description__c,
        targetAmount: fg.FinServ__TargetValue__c || 0,
        actualAmount: fg.FinServ__ActualValue__c || 0,
        targetDate: fg.FinServ__TargetDate__c || null,
        status: fg.FinServ__Status__c || "active",
        type: fg.FinServ__Type__c || fg.RecordType?.Name || "Financial Goal",
        isLive: true,
      }));

      // Patch annualIncome onto sfClient so frontend can access client.annualIncome
      // Orion estimatedAnnualIncome = portfolio-derived (dividends, interest, distributions)
      // SF Annual_Income__pc = manually entered by advisor (salary, total household income)
      const sfAnnualIncome = primaryMember?.Annual_Income__pc ?? null;
      const sfClientWithIncome = {
        ...sfClient,
        annualIncome: estimatedAnnualIncome,
        annualIncomeSource: estimatedAnnualIncome > 0 ? "orion_reporting_scope" :
                            (typeof sfAnnualIncome === "number" && sfAnnualIncome > 0) ? "salesforce_member" : "unavailable",
        sfAnnualIncome: typeof sfAnnualIncome === "number" ? sfAnnualIncome : null,
      };

      const responseJson = {
        client: sfClientWithIncome,
        accounts,
        holdings,
        alternativeAssets: [],
        performance,
        activityData,
        allocationData,
        taxData,
        transactions: [],
        activities: sfActivities,
        tasks,
        meetings: [],
        documents: sfDocuments,
        complianceItems,
        lifeEvents: [],
        financialGoals,
        revenues: sfRevenues,
        sfTopHoldings,
        assetsAndLiabilities: sfAssetsAndLiabilities,
        householdMembers,
        upcomingEvents,
        staleOpportunities,
        sfFinancialGoals,
        totalAum,
        currentAUM: totalAum,
        estimatedAnnualIncome,
        healthScore,
        sparklineData,
        documentChecklist: [],
        allocationBreakdown,
        riskDistribution,
        custodianBreakdown,
        accountTypeDistribution,
        topHoldingsByValue,
        sectorExposure,
        managedVsHeldAway,
        isLiveData: true,
        orionMatchName: bestMatch?.name || null,
        orionMatchScore: bestMatch?.matchScore || 0,
        orionAccountCount: orionAccounts.length,
        orionAssetCount: orionAssets.length,
        sfMemberCount: sfMembers.length,
        _errors: _errors.length > 0 ? _errors : undefined,
        _dataSources: {
          orion: orionSuccess ? "live" : "error",
          salesforce: sfSuccess ? "live" : "error",
          fallback: "none" as const,
        },
        _identity: {
          ...identity,
          dataPath: "live" as const,
        },
        _timing: {
          ..._timing,
          response_assembly: Date.now() - (_t3 + (_timing.phase3_sf_members || 0)),
          total: Date.now() - _t0,
        },
      };

      // Cache the assembled response for subsequent requests
      // Only cache if both data sources succeeded (no partial data in cache)
      if (_errors.length === 0) {
        setCachedClientDetail(cacheKey, responseJson);
      }

      return NextResponse.json(responseJson, {
        headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300", "X-Cache": "MISS" },
      });
    } // end if (sfHousehold)
  }

  // -----------------------------------------------------------------------
  // Standard path -> local database
  // -----------------------------------------------------------------------
  try {
    const client = await storage.getClient(id);
    if (!client)
      return NextResponse.json({ message: "Client not found" }, { status: 404 });

    if (session.userType === "associate") {
      const assignedClients = await storage.getClientsByAssociate(session.userId);
      if (!assignedClients.some((c) => c.id === client.id)) {
        return NextResponse.json({ message: "Access denied" }, { status: 403 });
      }
    } else if (session.userType === "advisor") {
      if (client.advisorId !== session.userId) {
        return NextResponse.json({ message: "Access denied" }, { status: 403 });
      }
    }

    const [
      accounts,
      activities,
      tasks,
      meetings,
      documents,
      compliance,
      lifeEvts,
      holdings,
      checklistItems,
      altAssets,
    ] = await Promise.all([
      storage.getAccountsByClient(client.id),
      storage.getActivitiesByClient(client.id),
      storage.getTasksByClient(client.id),
      storage.getMeetingsByClient(client.id),
      storage.getDocumentsByClient(client.id),
      storage.getComplianceItemsByClient(client.id),
      storage.getLifeEvents(client.id),
      storage.getHoldingsByClient(client.id),
      storage.getDocumentChecklist(client.id),
      storage.getAlternativeAssetsByClient(client.id),
    ]);

    const totalAum = accounts.reduce(
      (sum, a) => sum + parseFloat(a.balance as string),
      0
    );
    const currentAUM = totalAum;

    let householdPerformance: any[] = [];
    let householdMembers: any[] = [];
    if (accounts.length > 0 && accounts[0].householdId) {
      try {
        householdPerformance = await storage.getPerformanceByHousehold(
          accounts[0].householdId
        );
      } catch (err) {
        logger.error({ err: err }, "Failed to load household performance:");
        householdPerformance = [];
      }
      try {
        householdMembers = await storage.getHouseholdMembers(
          accounts[0].householdId
        );
      } catch (err) {
        logger.error({ err: err }, "Failed to load household members:");
        householdMembers = [];
      }
    }

    const allTransactions = (
      await Promise.all(
        accounts.slice(0, 5).map((acc) =>
          storage.getTransactionsByAccount(acc.id).catch((err) => {
            logger.error({ err, accountId: acc.id }, "Failed to load transactions for account");
            return [] as any[];
          })
        )
      )
    )
      .flat()
      .sort((a, b) => b.date.localeCompare(a.date));

    const sparklineData = generateSparklineData(accounts, totalAum);
    const firstAum = sparklineData.length >= 2 ? sparklineData[0].aum : 0;
    const aumGrowthRate =
      firstAum > 0
        ? ((sparklineData[sparklineData.length - 1].aum - firstAum) / firstAum) *
          100
        : 0;

    const healthScore = calculateHealthScore({
      activities,
      lastContactDate: client.lastContactDate,
      nextReviewDate: client.nextReviewDate,
      performanceData: householdPerformance,
      complianceItems: compliance,
      aumGrowthRate,
    });

    const meetingsWithTasks = await Promise.all(
      meetings.slice(0, 10).map(async (m) => {
        const mTasks = await storage.getTasksByMeeting(m.id);
        const active = mTasks.filter((t) => t.status !== "completed");
        return {
          ...m,
          taskCount: mTasks.length,
          activeTaskCount: active.length,
          completedTaskCount: mTasks.length - active.length,
          tasks: active.slice(0, 3).map((t) => ({
            id: t.id,
            title: t.title,
            type: t.type,
            priority: t.priority,
            dueDate: t.dueDate,
          })),
        };
      })
    );

    // If we landed here from a failed SF/Orion path, flag it as fallback
    const isLiveUserFallback = isSalesforceUser(userEmail) && isMulesoftEnabled();
    if (isLiveUserFallback) {
      usedLocalDb = true;
    }

    return NextResponse.json({
      client,
      accounts,
      holdings,
      alternativeAssets: altAssets,
      performance: householdPerformance,
      transactions: allTransactions.slice(0, 20),
      activities: activities.slice(0, 10),
      tasks,
      meetings: meetingsWithTasks,
      documents: documents.map(({ fileContent, ...rest }) => ({
        ...rest,
        hasFile: !!fileContent,
      })),
      complianceItems: compliance,
      lifeEvents: lifeEvts,
      householdMembers,
      totalAum,
      currentAUM,
      healthScore,
      sparklineData,
      documentChecklist: checklistItems,
      _errors: _errors.length > 0 ? _errors : undefined,
      _dataSources: {
        orion: orionSuccess ? "live" : "error",
        salesforce: sfSuccess ? "live" : "error",
        fallback: usedLocalDb ? "local-db" : "none",
      },
      _identity: {
        ...identity,
        dataPath: liveSfId ? "local-db" : "local-db-uuid-skip",
      },
    });
  } catch (err) {
    logger.error({ err: err }, `[Clients] Local DB client detail fetch failed for ${id}`);
    return NextResponse.json(
      { message: "Failed to load client details" },
      { status: 500 }
    );
  }
} catch (err) {
    logger.error({ err }, "[clients/[id]] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/clients/[id]  (maps from Express PATCH)
// ---------------------------------------------------------------------------
const updateClientSchema = insertClientSchema
  .omit({ advisorId: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  const session = auth.session;
  const { id } = await params;
    const clientId = id;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  try {
    const body = await request.json();
    const validation = validateBody(updateClientSchema, body);
    if (validation.error) return validation.error;

    const existing = await storage.getClient(id);
    if (!existing)
      return NextResponse.json({ message: "Client not found" }, { status: 404 });

    if (existing.advisorId !== session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const result = await storage.updateClient(id, validation.data);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

// Also support PATCH for backwards compatibility
export { PUT as PATCH };

// ---------------------------------------------------------------------------
// DELETE /api/clients/[id]
// ---------------------------------------------------------------------------
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  const session = auth.session;
  const { id } = await params;
    const clientId = id;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  try {
    const existing = await storage.getClient(id);
    if (!existing)
      return NextResponse.json({ message: "Client not found" }, { status: 404 });

    if (existing.advisorId !== session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    await storage.updateClient(id, { status: "inactive" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
