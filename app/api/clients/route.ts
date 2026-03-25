import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdvisor, getSessionAdvisor, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { insertClientSchema } from "@shared/schema";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
} from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";
import { backfillFromEnrichedClients, linkLocalClientsToHouseholds } from "@server/lib/client-identity";
import { getEnrichedClientsSnapshot, setEnrichedClientsSnapshot } from "@server/lib/enriched-clients-cache";


// ---------------------------------------------------------------------------
// In-memory cache for the FULL enriched client list (SF + Orion AUM).
// Uses globalThis so the cache persists across hot reloads in Next.js dev.
// ---------------------------------------------------------------------------
const g = globalThis as any;
if (!g._enrichedClientsCache) g._enrichedClientsCache = null;
const ENRICHED_CLIENTS_TTL = 10 * 60 * 1000; // 10 min — enriched list is expensive to rebuild

function getCache(): {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
} | null {
  return g._enrichedClientsCache;
}

function setCache(val: typeof g._enrichedClientsCache) {
  g._enrichedClientsCache = val;
  // Also persist to module-scope snapshot as HMR-resilient secondary
  if (val) setEnrichedClientsSnapshot(val);
}

/** Extract a single string query param (handles arrays gracefully). */
function qp(val: string | null | undefined): string {
  if (!val) return "";
  return val;
}

// ---------------------------------------------------------------------------
// GET /api/clients
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;

  const url = new URL(request.url);

  // -----------------------------------------------------------------------
  // Salesforce UAT users -> fetch live households from MuleSoft -> Salesforce
  // -----------------------------------------------------------------------
  const userEmail = session.userEmail;
  const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;
  if (isSalesforceUser(userEmail) && isMulesoftEnabled()) {
    const searchQuery = qp(url.searchParams.get("search")) || undefined;
    const pageNum = Math.max(1, parseInt(qp(url.searchParams.get("page")) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(qp(url.searchParams.get("limit")) || "50", 10)));
    const sortKey = qp(url.searchParams.get("sort")) || "aum";
    const sortDir = qp(url.searchParams.get("sortDir")) === "asc" ? 1 : -1;

    // Track errors and data sources independently
    const _errors: string[] = [];
    const _dataSources: {
      orion: "live" | "error" | "cached" | "stale-cache";
      salesforce: "live" | "error" | "stale-cache";
      fallback: "none" | "local-db" | "stale-live-cache";
    } = { orion: "live", salesforce: "live", fallback: "none" };

    // -------------------------------------------------------------------
    // Build or reuse the FULL enriched client list (all SF households + Orion AUM).
    // -------------------------------------------------------------------
    let allClients: any[] = [];
    let cachedAdvisor: any = null;

    const cache = getCache();
    const cacheValid =
      cache &&
      cache.userEmail === userEmail &&
      Date.now() - cache.ts < ENRICHED_CLIENTS_TTL;

    if (cacheValid) {
      allClients = cache!.data;
      cachedAdvisor = cache!.advisor;
      _dataSources.orion = "cached";
    } else {
      // Fetch SF households and Orion AUM in PARALLEL — these are independent.
      // SF first page is needed to determine total pagination count.
      // Orion returns 35K portfolio records (cached with SWR at MuleSoft layer).
      let firstPage: any = null;
      let allOrionClients: any[] = [];

      const [sfResult, orionResult] = await Promise.allSettled([
        getLiveHouseholds({ username: sfUsername!, pageSize: 50, offset: 0 }),
        getOrionClientsValue(),
      ]);

      // --- Process SF result ---
      if (sfResult.status === "fulfilled") {
        firstPage = sfResult.value;
      } else {
        _dataSources.salesforce = "error";
        const sfErr = sfResult.reason;
        if (sfErr?.message?.includes('OASP_FSC')) {
          _errors.push('Salesforce: UAT user missing Financial Services Cloud (FSC) license — contact Salesforce admin');
        } else {
          _errors.push(`Salesforce: ${sfErr?.message || 'Unknown error fetching households'}`);
        }
        logger.error({ err: sfErr }, "[Clients] Salesforce household fetch failed");
      }

      // --- Process Orion result ---
      if (orionResult.status === "fulfilled") {
        allOrionClients = orionResult.value;
      } else {
        _dataSources.orion = "error";
        const orionErr = orionResult.reason;
        _errors.push(`Orion: ${orionErr?.message || 'Unknown error fetching portfolio data'}`);
        logger.error({ err: orionErr }, "[Clients] Orion client value fetch failed");
      }

      // If BOTH failed, fall back to local DB
      if (_dataSources.salesforce === "error" && _dataSources.orion === "error") {
        _dataSources.fallback = "local-db";
        logger.error("[Clients] Both Salesforce and Orion failed — falling back to local DB");
        // Fall through to the local DB path below
      } else if (firstPage && firstPage.householdAccounts) {
        // At least SF succeeded — build the enriched list
        cachedAdvisor = firstPage.advisor;

        let allHouseholdAccounts = [...firstPage.householdAccounts];
        let allHouseholdDetails = [...(firstPage.householdDetails || [])];
        const totalSize = firstPage.totalSize || firstPage.householdAccounts.length;

        if (totalSize > 50) {
          // Fetch ALL remaining SF pages in parallel (capped at 6 concurrent).
          // Previous: sequential batches of 3 → 6-15s for 500 clients.
          // Now: single parallel wave → 2-5s regardless of page count.
          const remainingPages = Math.ceil((totalSize - 50) / 50);
          const MAX_CONCURRENT = 6;

          for (let start = 0; start < remainingPages; start += MAX_CONCURRENT) {
            const batch = [];
            for (let j = 0; j < MAX_CONCURRENT && start + j < remainingPages; j++) {
              const pageIdx = start + j + 1;
              batch.push(
                getLiveHouseholds({
                  username: sfUsername!,
                  pageSize: 50,
                  offset: pageIdx * 50,
                })
              );
            }
            const results = await Promise.all(batch);
            for (const r of results) {
              if (r && r.householdAccounts) {
                allHouseholdAccounts.push(...r.householdAccounts);
                if (r.householdDetails) allHouseholdDetails.push(...r.householdDetails);
              }
            }
          }
        }

        // Build a lookup from householdDetails
        const detailMap = new Map<string, any>();
        for (const detail of allHouseholdDetails) {
          if (detail.householdId) detailMap.set(detail.householdId, detail);
        }

        // Build Orion name->AUM lookup for fast matching
        const orionLookup = allOrionClients.map((o) => ({
          name: (o.name || "").toLowerCase(),
          words: new Set(
            (o.name || "")
              .toLowerCase()
              .split(/[\s,&]+/)
              .filter((w: string) => w.length > 2)
          ),
          totalValue: o.totalValue || 0,
        }));

        // Fast name match: find best Orion AUM for a household name.
        const matchOrionAum = (householdName: string): number => {
          const nameLower = householdName.toLowerCase();
          const nameWords = nameLower
            .split(/[\s,&]+/)
            .filter((w: string) => w.length > 2);
          if (nameWords.length === 0) return 0;

          const minScore = nameWords.length >= 2 ? 60 : 30;
          let bestScore = 0;
          let bestAum = 0;

          for (const orion of orionLookup) {
            if (orion.name === nameLower) return orion.totalValue;
            let score = 0;
            for (const word of nameWords) {
              if (orion.words.has(word) || orion.name.includes(word)) score += 30;
            }
            if (score > bestScore) {
              bestScore = score;
              bestAum = orion.totalValue;
            }
          }

          return bestScore >= minScore ? bestAum : 0;
        };

        const mapSfStatus = (sfStatus: string): string => {
          const s = (sfStatus || "").toLowerCase();
          if (s === "active" || s === "client") return "active";
          if (s === "at risk" || s === "at-risk") return "review";
          if (s === "inactive" || s === "closed" || s === "terminated") return "inactive";
          if (s === "prospect" || s === "lead") return "prospect";
          return "active";
        };

        allClients = allHouseholdAccounts.map((acct) => {
          const detail = detailMap.get(acct.Id);
          const finAccounts = detail?.financialAccounts || [];
          const totalFinAssets = acct.FinServ__TotalFinancialAccounts__c || 0;
          const totalNonFinAssets = acct.FinServ__TotalNonfinancialAssets__c || 0;
          const sfAum = totalFinAssets + totalNonFinAssets;
          const createdDate = acct.CreatedDate || "";

          // If Orion failed, we can only use SF AUM
          const orionAum = _dataSources.orion === "error" ? 0 : (sfAum > 0 ? sfAum : matchOrionAum(acct.Name || ""));
          const totalAum = Math.max(sfAum, orionAum);

          const acctName = (acct.Name || "").toUpperCase();
          const acctType = (acct.Type || acct.RecordType?.Name || "").toLowerCase();
          const isBusinessEntity =
            acctType.includes("business") ||
            acctType.includes("corporate") ||
            acctType.includes("organization") ||
            acctType.includes("trust") ||
            /\b(LLC|INC|CORP|LTD|LP|TRUST|FOUNDATION|ESTATE|ASSOC|GROUP|PARTNERS)\b/.test(
              acctName
            );

          return {
            id: acct.Id,
            firstName: acct.Name?.split(" ")[0] || acct.Name || "",
            lastName: acct.Name?.split(" ").slice(1).join(" ") || "",
            email:
              acct.PersonEmail ||
              acct.FinServ__PrimaryContact__r?.Email ||
              detail?.primaryContact?.Email ||
              acct.Email__c ||
              "",
            phone:
              acct.Phone ||
              acct.PersonMobilePhone ||
              acct.FinServ__PrimaryContact__r?.Phone ||
              detail?.primaryContact?.Phone ||
              "",
            occupation:
              acct.PersonTitle ||
              acct.Industry ||
              acct.FinServ__Occupation__c ||
              detail?.occupation ||
              "",
            segment: acct.FinServ__ClientCategory__c || "",
            status: mapSfStatus(acct.FinServ__Status__c || "active"),
            riskTolerance:
              acct.FinServ__InvestmentObjectives__c ||
              acct.Risk_Tolerance__c ||
              detail?.riskTolerance ||
              "moderate",
            totalAum,
            currentAUM: totalAum,
            accountCount: finAccounts.length,
            advisorId: session.userId,
            sfHouseholdId: acct.Id,
            entityType: isBusinessEntity ? "business" : "individual",
            createdDate,
            reviewFrequency: acct.FinServ__ReviewFrequency__c || "",
            lastReview: acct.FinServ__LastReview__c || "",
            nextReview: acct.FinServ__NextReview__c || "",
            serviceModel: acct.FinServ__ServiceModel__c || "",
            financialGoals: detail?.financialGoals?.length || 0,
            documents: detail?.documents?.length || 0,
            topHoldings: detail?.topHoldings || [],
            revenues: detail?.revenues || [],
            recentActivity: detail?.recentActivity || [],
            complianceTasks: detail?.complianceTasks?.length || 0,
            complianceCases: detail?.complianceCases?.length || 0,
            isLiveData: true,
          };
        });

        // Cache the full enriched list
        const totalAumSum = allClients.reduce((s, c) => s + (c.totalAum || 0), 0);
        setCache({
          data: allClients,
          totalAum: totalAumSum,
          advisor: cachedAdvisor,
          ts: Date.now(),
          userEmail: userEmail!,
        });

        // ── Non-blocking crosswalk backfill ──
        // Seed the identity crosswalk with live SF household data.
        // Fire-and-forget: does not slow the response.
        backfillFromEnrichedClients(allClients)
          .then(() => linkLocalClientsToHouseholds())
          .catch((err) => logger.error({ err }, "[Client Identity Backfill] Background backfill failed"));

      } else if (_dataSources.salesforce === "live" && (!firstPage || !firstPage.householdAccounts)) {
        // SF returned successfully but with no data — not an error, just empty
        allClients = [];
      } else if (_dataSources.salesforce === "error" && _dataSources.orion === "live") {
        // Orion alone returns the ENTIRE firm (35K+ portfolios) unfiltered —
        // without SF to scope to this advisor, fall through to local DB.
        _dataSources.fallback = "local-db";
        logger.warn("[Clients] SF unavailable — cannot scope Orion data to advisor, falling back to local DB");
      }
    }

    // ── LIVE DATA INTEGRITY RULE ──
    // For live-integrated SF users, NEVER silently fall back to local seed data.
    // Stale real data is always better than fake demo data.
    if (_dataSources.fallback === "local-db") {
      // Try stale enriched cache first — even expired, it's better than seed data.
      // Check both globalThis (primary) and module-scope snapshot (HMR-resilient secondary).
      const staleCache = getCache() || getEnrichedClientsSnapshot();
      if (staleCache && staleCache.data.length > 0) {
        logger.warn(
          { errors: _errors, staleCacheAge: Date.now() - staleCache.ts },
          "[Clients] Live sources degraded — serving stale cached live data (NOT falling back to local seed DB)"
        );
        allClients = staleCache.data;
        cachedAdvisor = staleCache.advisor;
        _dataSources.orion = "stale-cache";
        _dataSources.salesforce = "stale-cache";
        _dataSources.fallback = "stale-live-cache";
      } else {
        // No stale cache available — return honest error, NOT seed data
        logger.error(
          { errors: _errors },
          "[Clients] Live sources failed and no stale cache available — returning honest error (NOT local seed DB)"
        );
        return NextResponse.json({
          total: 0,
          page: 1,
          limit: 50,
          clients: [],
          isLiveData: false,
          _errors,
          _dataSources: {
            ..._dataSources,
            fallback: "none-available",
          },
          _dataIntegrity: "live-sources-unavailable",
        }, { status: 503 });
      }
    }

    // Serve live (or stale-live) data — never seed data for SF users
    if (allClients.length > 0 || (_dataSources.fallback as string) !== "local-db") {
      // -------------------------------------------------------------------
      // Blend local seed/demo clients into the enriched list so demo
      // walkthroughs (e.g. James Chen) appear alongside live SF data.
      // -------------------------------------------------------------------
      try {
        const localClients = await storage.getClients(session.userId);
        const liveIds = new Set(allClients.map((c: any) => c.salesforceContactId || c.id));
        const aumMap = await storage.getAumByClient(localClients.map((c) => c.id));
        for (const lc of localClients) {
          if (!liveIds.has(lc.id) && !liveIds.has(lc.salesforceContactId)) {
            const aumData = aumMap.get(lc.id);
            allClients.push({
              id: lc.id,
              firstName: lc.firstName,
              lastName: lc.lastName,
              email: lc.email,
              phone: lc.phone,
              segment: lc.segment,
              status: lc.status || "active",
              riskTolerance: lc.riskTolerance,
              dateOfBirth: lc.dateOfBirth,
              occupation: lc.occupation,
              employer: lc.employer,
              totalAum: aumData?.totalAum ?? 0,
              currentAUM: aumData?.totalAum ?? 0,
              entityType: "individual",
              source: "local-db",
              lastContactDate: lc.lastContactDate,
              nextReviewDate: lc.nextReviewDate,
            });
          }
        }
      } catch (blendErr) {
        logger.warn({ err: blendErr }, "[Clients] Failed to blend local demo clients");
      }

      // -------------------------------------------------------------------
      // Server-side search, sort, and paginate the full enriched list
      // -------------------------------------------------------------------
      let filtered = allClients;

      // Entity type filter (business/individual)
      const entityTypeFilter = qp(url.searchParams.get("entityType")) || undefined;
      if (entityTypeFilter) {
        filtered = filtered.filter((c) => c.entityType === entityTypeFilter);
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((c) => {
          const name = `${c.firstName} ${c.lastName}`.toLowerCase();
          return name.includes(q) || c.email?.toLowerCase().includes(q);
        });
      }

      filtered.sort((a, b) => {
        if (sortKey === "aum") return ((a.totalAum || 0) - (b.totalAum || 0)) * sortDir;
        if (sortKey === "name")
          return (
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * sortDir
          );
        return 0;
      });

      const total = filtered.length;
      const start = (pageNum - 1) * limit;
      const paged = filtered.slice(start, start + limit);

      return NextResponse.json({
        total,
        page: pageNum,
        limit,
        clients: paged,
        isLiveData: true,
        isStaleCache: _dataSources.fallback === "stale-live-cache",
        advisor: cachedAdvisor,
        _errors: _errors.length > 0 ? _errors : undefined,
        _dataSources,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Standard path -> local database
  // -----------------------------------------------------------------------
  try {
    let clientList;
    if (session.userType === "associate") {
      clientList = await storage.getClientsByAssociate(session.userId);
    } else {
      const advisorId = session.userId;
      const query = url.searchParams.get("search");
      if (query) {
        clientList = await storage.searchClients(advisorId, query);
      } else {
        clientList = await storage.getClients(advisorId);
      }
    }

    const segmentFilter = url.searchParams.get("segment") || "";
    const statusFilter = url.searchParams.get("status") || "";

    if (segmentFilter) {
      clientList = clientList.filter((c) => c.segment === segmentFilter);
    }
    if (statusFilter) {
      clientList = clientList.filter((c) => c.status === statusFilter);
    }

    const clientIds = clientList.map((c) => c.id);
    const aumMap = await storage.getAumByClient(clientIds);
    const clientsWithAum = clientList.map((client) => {
      const aumData = aumMap.get(client.id);
      return {
        ...client,
        totalAum: aumData?.totalAum ?? 0,
        currentAUM: aumData?.totalAum ?? 0,
        accountCount: aumData?.accountCount ?? 0,
      };
    });

    const paginated = url.searchParams.get("page") || url.searchParams.get("limit");
    if (paginated) {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10))
      );
      const total = clientsWithAum.length;
      const start = (page - 1) * limit;
      const paged = clientsWithAum.slice(start, start + limit);
      return NextResponse.json({
        total, page, limit, clients: paged,
        isLiveData: false,
        _dataSources: { salesforce: "n/a", orion: "n/a", fallback: "local-db" },
        _dataIntegrity: "local-only",
      });
    } else {
      return NextResponse.json({
        clients: clientsWithAum,
        isLiveData: false,
        _dataSources: { salesforce: "n/a", orion: "n/a", fallback: "local-db" },
        _dataIntegrity: "local-only",
      });
    }
  } catch (err) {
    logger.error({ err: err }, "[Clients] Local DB client list fetch failed");
    return NextResponse.json({ message: "Failed to load clients" }, { status: 500 });
  }
} catch (err) {
    logger.error({ err }, "[clients] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/clients
// ---------------------------------------------------------------------------
const createClientSchema = insertClientSchema.omit({ advisorId: true });

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  const session = auth.session;

  try {
    const body = await request.json();
    const validation = validateBody(createClientSchema, body);
    if (validation.error) return validation.error;

    const client = await storage.createClient({
      ...validation.data,
      advisorId: session.userId,
    });
    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
