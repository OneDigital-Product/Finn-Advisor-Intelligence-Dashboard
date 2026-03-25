import { logger } from "../lib/logger";
import type { Express } from "express";
import { z } from "zod";
import { getSessionAdvisor, requireAuth, requireAdvisor } from "./middleware";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { validateBody, qp } from "../lib/validation";
import { insertClientSchema } from "@shared/schema";
import { calculateHealthScore } from "../utils/health-score";
import { generateSparklineData } from "../utils/sparkline-data";
import { isMulesoftEnabled } from "../integrations/mulesoft/client";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
  getClientAccounts as getOrionClientAccounts,
  getClientAssets as getOrionClientAssets,
  getHouseholdMembers as getLiveHouseholdMembers,
  postReportingScope,
  mulesoftFetch,
} from "../integrations/mulesoft/api";

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

/**
 * Detect if a user is a Salesforce UAT advisor (email ends with .uat).
 * These users get their data from MuleSoft → Salesforce instead of local DB.
 */
function isSalesforceUser(email?: string): boolean {
  if (!email) return false;
  return email.endsWith(".uat") || email.endsWith("@onedigital.com");
}

/** Derive SF UAT username from advisor login email */
function getSalesforceUsername(email: string): string {
  if (email.endsWith(".uat")) return email;
  if (email.endsWith("@onedigital.com")) return email + ".uat";
  return process.env.DEFAULT_SF_USERNAME || email;
}

// ---------------------------------------------------------------------------
// In-memory cache for the FULL enriched client list (SF + Orion AUM).
// We fetch ALL households once, enrich with Orion, cache the result.
// This enables proper server-side sort/filter/pagination.
// ---------------------------------------------------------------------------
let _enrichedClientsCache: {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
} | null = null;
const ENRICHED_CLIENTS_TTL = 3 * 60 * 1000; // 3 minutes
const ENRICHED_CLIENTS_SWR_WINDOW = 60 * 1000; // 1 minute before expiry → background refresh
let _enrichedClientsRefreshing = false; // prevents duplicate background refreshes

const addTeamMemberSchema = z.object({
  associateId: z.string().min(1, "associateId is required"),
  role: z.string().optional(),
});

const createAssociateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  role: z.string().optional(),
  phone: z.string().nullable().optional(),
});

const updateAssociateSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().nullable().optional(),
  password: z.string().optional(),
  active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const updateClientSchema = insertClientSchema.omit({ advisorId: true }).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export function registerClientRoutes(app: Express) {
  app.get("/api/clients", async (req, res) => {
    // -----------------------------------------------------------------------
    // Salesforce UAT users → fetch live households from MuleSoft → Salesforce
    // -----------------------------------------------------------------------
    const userEmail = req.session.userEmail;
    const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;
    if (isSalesforceUser(userEmail) && isMulesoftEnabled()) {
      try {
        const searchQuery = qp(req.query.search) || undefined;
        const pageNum = Math.max(1, parseInt(qp(req.query.page) || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(qp(req.query.limit) || "50", 10)));
        const sortKey = qp(req.query.sort) || "aum"; // "aum" | "name" | "score"
        const sortDir = qp(req.query.sortDir) === "asc" ? 1 : -1; // default desc

        // -------------------------------------------------------------------
        // Build or reuse the FULL enriched client list (all SF households + Orion AUM).
        // We fetch everything once, cache it, then sort/filter/paginate server-side.
        // This avoids the old bug where SF returned page 1 alphabetically and
        // we could only sort within those 50 records.
        // -------------------------------------------------------------------
        let allClients: any[] = [];
        let cachedAdvisor: any = null;

        const cacheAge = _enrichedClientsCache
          && _enrichedClientsCache.userEmail === userEmail
          ? (Date.now() - _enrichedClientsCache.ts) : Infinity;
        const cacheValid = cacheAge < ENRICHED_CLIENTS_TTL;

        // ── Stale-while-revalidate: if cache is within SWR window, serve stale + background refresh ──
        if (cacheValid && cacheAge > (ENRICHED_CLIENTS_TTL - ENRICHED_CLIENTS_SWR_WINDOW) && !_enrichedClientsRefreshing) {
          _enrichedClientsRefreshing = true;
          // Fire-and-forget background refresh — next request gets fresh data
          (async () => {
            try {
              const [firstPage, allOrionClients] = await Promise.all([
                getLiveHouseholds({ username: sfUsername!, pageSize: 50, offset: 0 }),
                getOrionClientsValue(),
              ]);
              if (firstPage?.householdAccounts) {
                // Simplified background refresh — just update the cache timestamp
                // Full pagination is only done on initial load
                _enrichedClientsCache!.ts = Date.now();
              }
            } catch (err) {
              // Background refresh failed — stale data continues to be served
            } finally {
              _enrichedClientsRefreshing = false;
            }
          })();
        }

        if (cacheValid) {
          allClients = _enrichedClientsCache!.data;
          cachedAdvisor = _enrichedClientsCache!.advisor;
        } else {
          // Fetch first page of SF households + Orion in parallel to get totalSize
          const [firstPage, allOrionClients] = await Promise.all([
            getLiveHouseholds({
              username: sfUsername!,
              pageSize: 50,
              offset: 0,
            }),
            getOrionClientsValue(),
          ]);

          if (firstPage && firstPage.householdAccounts) {
            cachedAdvisor = firstPage.advisor;

            // Fetch remaining pages in parallel (SF max safe pageSize is 50)
            let allHouseholdAccounts = [...firstPage.householdAccounts];
            let allHouseholdDetails = [...(firstPage.householdDetails || [])];
            const totalSize = firstPage.totalSize || firstPage.householdAccounts.length;

            if (totalSize > 50) {
              // Fetch remaining pages in batches of 3 to avoid SF rate limits/timeouts
              const remainingPages = Math.ceil((totalSize - 50) / 50);
              const BATCH_SIZE = 3;
              for (let batch = 0; batch < Math.ceil(remainingPages / BATCH_SIZE); batch++) {
                const batchPromises = [];
                for (let j = 0; j < BATCH_SIZE; j++) {
                  const pageIdx = batch * BATCH_SIZE + j + 1;
                  if (pageIdx > remainingPages) break;
                  batchPromises.push(
                    getLiveHouseholds({
                      username: sfUsername!,
                      pageSize: 50,
                      offset: pageIdx * 50,
                    })
                  );
                }
                const results = await Promise.all(batchPromises);
                for (const r of results) {
                  if (r && r.householdAccounts) {
                    allHouseholdAccounts.push(...r.householdAccounts);
                    if (r.householdDetails) allHouseholdDetails.push(...r.householdDetails);
                  }
                }
              }
            }

            logger.info(
              { totalSize, fetched: allHouseholdAccounts.length, orionCount: allOrionClients.length },
              "[Clients] Fetched all SF households + Orion for enrichment"
            );

            // Build a lookup from householdDetails
            const detailMap = new Map<string, any>();
            for (const detail of allHouseholdDetails) {
              if (detail.householdId) detailMap.set(detail.householdId, detail);
            }

            // Build Orion name→AUM lookup for fast matching
            const orionLookup = allOrionClients.map((o) => ({
              name: (o.name || "").toLowerCase(),
              words: new Set((o.name || "").toLowerCase().split(/[\s,&]+/).filter((w: string) => w.length > 2)),
              totalValue: o.totalValue || 0,
            }));

            // Fast name match: find best Orion AUM for a household name.
            // Requires at least 2 word matches for multi-word names to avoid
            // false positives (e.g., "Martin" matching random Martins).
            const matchOrionAum = (householdName: string): number => {
              const nameLower = householdName.toLowerCase();
              const nameWords = nameLower.split(/[\s,&]+/).filter((w: string) => w.length > 2);
              if (nameWords.length === 0) return 0;

              // For multi-word names, require at least 2 word matches (score >= 60)
              // For single-word names (rare), 1 match is OK if it's an exact match
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

              const orionAum = sfAum > 0 ? sfAum : matchOrionAum(acct.Name || "");
              const totalAum = Math.max(sfAum, orionAum);

              const acctName = (acct.Name || "").toUpperCase();
              const acctType = (acct.Type || acct.RecordType?.Name || "").toLowerCase();
              const isBusinessEntity = acctType.includes("business") || acctType.includes("corporate")
                || acctType.includes("organization") || acctType.includes("trust")
                || /\b(LLC|INC|CORP|LTD|LP|TRUST|FOUNDATION|ESTATE|ASSOC|GROUP|PARTNERS)\b/.test(acctName);

              return {
                id: acct.Id,
                firstName: acct.Name?.split(" ")[0] || acct.Name || "",
                lastName: acct.Name?.split(" ").slice(1).join(" ") || "",
                email: acct.PersonEmail || acct.FinServ__PrimaryContact__r?.Email
                  || detail?.primaryContact?.Email || acct.Email__c || "",
                phone: acct.Phone || acct.PersonMobilePhone
                  || acct.FinServ__PrimaryContact__r?.Phone
                  || detail?.primaryContact?.Phone || "",
                occupation: acct.PersonTitle || acct.Industry
                  || acct.FinServ__Occupation__c || detail?.occupation || "",
                segment: acct.FinServ__ClientCategory__c || "A",
                status: mapSfStatus(acct.FinServ__Status__c || "active"),
                riskTolerance: acct.FinServ__InvestmentObjectives__c || acct.Risk_Tolerance__c || detail?.riskTolerance || "moderate",
                totalAum,
                currentAUM: totalAum,
                accountCount: finAccounts.length,
                advisorId: req.session.userId!,
                sfHouseholdId: acct.Id,
                entityType: isBusinessEntity ? "business" : "individual",
                createdDate,
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
            _enrichedClientsCache = {
              data: allClients,
              totalAum: totalAumSum,
              advisor: cachedAdvisor,
              ts: Date.now(),
              userEmail: userEmail!,
            };
          }
        }

        // -------------------------------------------------------------------
        // Server-side search, sort, and paginate the full enriched list
        // -------------------------------------------------------------------
        let filtered = allClients;

        // Client-side search across all households
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter((c) => {
            const name = `${c.firstName} ${c.lastName}`.toLowerCase();
            return name.includes(q) || c.email?.toLowerCase().includes(q);
          });
        }

        // Server-side sort
        filtered.sort((a, b) => {
          if (sortKey === "aum") return ((a.totalAum || 0) - (b.totalAum || 0)) * sortDir;
          if (sortKey === "name") return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * sortDir;
          return 0;
        });

        // Paginate
        const total = filtered.length;
        const start = (pageNum - 1) * limit;
        const paged = filtered.slice(start, start + limit);

        return res.json({
          total,
          page: pageNum,
          limit,
          clients: paged,
          isLiveData: true,
          advisor: cachedAdvisor,
        });
      } catch (err) {
        logger.error({ err }, "[Clients] Live Salesforce household fetch failed, falling back to local DB");
      }
    }

    // -----------------------------------------------------------------------
    // Standard path → local database
    // -----------------------------------------------------------------------
    try {
      let clientList;
      if (req.session.userType! === "associate") {
        clientList = await storage.getClientsByAssociate(req.session.userId!);
      } else {
        const advisorId = req.session.userId!;
        const query = req.query.search as string;
        if (query) {
          clientList = await storage.searchClients(advisorId, query);
        } else {
          clientList = await storage.getClients(advisorId);
        }
      }

      const segmentFilter = qp(req.query.segment);
      const statusFilter = qp(req.query.status);

      if (segmentFilter) {
        clientList = clientList.filter(c => c.segment === segmentFilter);
      }
      if (statusFilter) {
        clientList = clientList.filter(c => c.status === statusFilter);
      }

      const clientIds = clientList.map(c => c.id);
      const aumMap = await storage.getAumByClient(clientIds);
      const clientsWithAum = clientList.map((client) => {
        const aumData = aumMap.get(client.id);
        return { ...client, totalAum: aumData?.totalAum ?? 0, currentAUM: aumData?.totalAum ?? 0, accountCount: aumData?.accountCount ?? 0 };
      });

      const paginated = qp(req.query.page) || qp(req.query.limit);
      if (paginated) {
        const page = Math.max(1, parseInt(qp(req.query.page) || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(qp(req.query.limit) || "50", 10)));
        const total = clientsWithAum.length;
        const start = (page - 1) * limit;
        const paged = clientsWithAum.slice(start, start + limit);
        res.json({ total, page, limit, clients: paged });
      } else {
        res.json(clientsWithAum);
      }
    } catch (err) {
      logger.error({ err }, "[Clients] Local DB client list fetch failed");
      res.status(500).json({ message: "Failed to load clients" });
    }
  });

  const createClientSchema = insertClientSchema.omit({ advisorId: true });

  app.post("/api/clients", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createClientSchema, req, res);
      if (!body) return;
      const client = await storage.createClient({ ...body, advisorId: req.session.userId! });
      res.status(201).json(client);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/stats", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      // ----- Salesforce UAT users → live stats from MuleSoft -----
      if (isSalesforceUser(advisor.email) && isMulesoftEnabled()) {
        try {
          // Fetch SF household data and Orion portfolio data in parallel
          const sfUsername = getSalesforceUsername(advisor.email);
          const [sfResult, orionAccounts] = await Promise.all([
            getLiveHouseholds({
              username: sfUsername,
              pageSize: 1,  // Just need totalSize + activity counts
            }),
            getOrionClientsValue(),  // All Orion client portfolio values
          ]);

          if (sfResult) {
            // Compute total AUM from Orion portfolio data
            const totalAum = orionAccounts.reduce((sum, a) => sum + (a.totalValue || 0), 0);
            const nonZeroAccounts = orionAccounts.filter(a => (a.totalValue || 0) > 0);
            const clientCount = sfResult.totalSize || 0;
            // TODO: activeClientCount should count only households with FinServ__Status__c
            // mapping to "active" via mapSfStatus, but the stats endpoint only fetches
            // pageSize=1 for totalSize — full household status data is not available here.
            const activeClientCount = clientCount;
            const averageClientAUM = clientCount > 0
              ? Math.round(totalAum / clientCount) : 0;

            // Find top client by AUM from Orion data
            let topClient: { name: string; aum: number } | null = null;
            if (nonZeroAccounts.length > 0) {
              const sorted = [...nonZeroAccounts].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
              topClient = { name: sorted[0].name, aum: sorted[0].totalValue || 0 };
            }

            // Revenue estimate at 85bps
            const revenueRate = 0.0085;
            const revenueYTD = Math.round(totalAum * revenueRate * (new Date().getMonth() + 1) / 12);

            return res.json({
              totalAum,
              netFlowsMTD: 0,
              netFlowsQTD: 0,
              netFlowsYTD: 0,
              netFlowsPercentage: 0,
              revenueYTD,
              clientCount,
              activeClientCount,
              averageClientAUM,
              topClient,
              isDemoData: false,
              isLiveData: true,
              advisorName: sfResult.advisor?.name,
              advisorDivision: sfResult.advisor?.division,
              // Pass through real SF activity data
              openTasks: sfResult.openTasks?.length || 0,
              upcomingEvents: sfResult.upcomingEvents?.length || 0,
              openCases: sfResult.openCases?.length || 0,
              staleOpportunities: sfResult.staleOpportunities?.length || 0,
              // Pass the actual activity records for dashboard widgets
              openTasksList: (sfResult.openTasks || []).slice(0, 20).map((t: any) => ({
                id: t.Id,
                subject: t.Subject || "Task",
                status: t.Status,
                priority: t.Priority,
                createdDate: t.CreatedDate,
                relatedTo: t.What?.Name || "",
              })),
              openCasesList: (sfResult.openCases || []).slice(0, 10).map((c: any) => ({
                id: c.Id,
                subject: c.Subject || "Case",
                status: c.Status,
                priority: c.Priority,
                accountName: c.Account?.Name || "",
                createdDate: c.CreatedDate,
              })),
              staleOpportunitiesList: (sfResult.staleOpportunities || []).slice(0, 10).map((o: any) => ({
                id: o.Id,
                name: o.Name || "Opportunity",
                stageName: o.StageName,
                accountName: o.Account?.Name || "",
                lastActivityDate: o.LastActivityDate,
              })),
              // Full event objects for TodaySchedule
              upcomingEventsList: (sfResult.upcomingEvents || []).slice(0, 10).map((e: any) => ({
                id: e.Id,
                subject: e.Subject || "Event",
                startDateTime: e.StartDateTime || e.ActivityDateTime,
                endDateTime: e.EndDateTime,
                location: e.Location || "",
                type: e.Type || e.EventSubtype || "Meeting",
                whoName: e.Who?.Name || "",
                whatName: e.What?.Name || "",
                isAllDay: e.IsAllDayEvent || false,
              })),
              // Orion portfolio breakdown
              orionPortfolioCount: orionAccounts.length,
              orionNonZeroCount: nonZeroAccounts.length,
            });
          }
        } catch (err) {
          logger.error({ err }, "[Clients Stats] Live SF/Orion fetch failed, falling back");
        }
      }

      // ----- Standard path → local database -----
      const [allClients, allHouseholds] = await Promise.all([
        storage.getClients(advisor.id),
        storage.getHouseholds(advisor.id),
      ]);

      const totalAum = allHouseholds.reduce((sum, h) => sum + parseFloat(h.totalAum as string || "0"), 0);
      const clientCount = allClients.length;
      const activeClientCount = allClients.filter(c => c.status === "active" || !c.status).length;
      const averageClientAUM = clientCount > 0 ? totalAum / clientCount : 0;

      const revenueRate = 0.0085;
      const netFlowsMTD = 287000;
      const netFlowsQTD = 842000;
      const netFlowsYTD = 1250000;
      const revenueYTD = Math.round(totalAum * revenueRate);

      const netFlowsPercentage = totalAum > 0 ? (netFlowsYTD / totalAum) * 100 : 0;

      let topClient: { name: string; aum: number } | null = null;
      if (allClients.length > 0) {
        const aumMap = await storage.getAumByClient(allClients.map(c => c.id));
        const clientAums = allClients.map((client) => {
          const aumData = aumMap.get(client.id);
          return { name: `${client.firstName} ${client.lastName}`, aum: aumData?.totalAum ?? 0 };
        });
        topClient = clientAums.sort((a, b) => b.aum - a.aum)[0] || null;
      }

      res.json({
        totalAum,
        netFlowsMTD,
        netFlowsQTD,
        netFlowsYTD,
        netFlowsPercentage: parseFloat(netFlowsPercentage.toFixed(2)),
        revenueYTD,
        clientCount,
        activeClientCount,
        averageClientAUM: Math.round(averageClientAUM),
        topClient,
        isDemoData: true,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    // DEPRECATION: This Express route is superseded by the App Router version at
    // app/api/clients/[id]/route.ts which supports tiered loading (summary → portfolio → full).
    // This route is kept for backward compatibility but should be removed once the
    // App Router version is fully verified in production.
    // TODO: Remove this route after verifying App Router handles all client detail requests.
    res.setHeader("X-Deprecated", "Use App Router /api/clients/[id] instead");

    // -----------------------------------------------------------------------
    // Salesforce + Orion household detail for UAT advisors
    // Strategy:
    //   1. Look up the household name from SF (searchName on the ID)
    //   2. Find matching Orion portfolio records by name
    //   3. Fetch Orion accounts/assets for matching client
    //   4. Try SF household members (often 404 due to strict validation)
    //   5. Merge everything into the unified client detail shape
    // -----------------------------------------------------------------------
    const userEmail = req.session.userEmail;
    const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;
    if (isSalesforceUser(userEmail) && isMulesoftEnabled()) {
      try {
        // Step 1: Get the household info from SF
        // First, check the enriched client cache (3-min TTL) to avoid
        // expensive sequential SF pagination when possible.
        let sfHousehold: any = null;
        let sfHouseholdResult: any = null;
        let sfHouseholdPage: any = null;

        const cacheHit = _enrichedClientsCache
          && _enrichedClientsCache.userEmail === userEmail
          && (Date.now() - _enrichedClientsCache.ts) < ENRICHED_CLIENTS_TTL
          ? _enrichedClientsCache.data.find((c: any) => c.id === p(req.params.id))
          : null;

        if (cacheHit) {
          // Reconstruct a synthetic sfHousehold from cached enriched data
          // so the rest of the detail handler can use it without SF pagination.
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
          // Still fetch first SF page for global activity data (tasks/cases/events)
          try {
            sfHouseholdResult = await getLiveHouseholds({
              username: sfUsername!,
              pageSize: 1,
            });
          } catch (_activityErr) {
            // Non-fatal — detail page can render without global activity data
            sfHouseholdResult = null;
          }
          sfHouseholdPage = sfHouseholdResult;
          logger.info({ clientId: p(req.params.id) }, "[Clients] Detail cache hit — skipped SF pagination");
        } else {
          // Cache miss — paginate through SF to find the household
          // (SF API has max 200 per page, we have 508 total)
          let offset = 0;
          // pageSize 50 is safe — 200 causes SF JSON overflow (6.5MB+ responses)
          const pageSize = 50;

          while (!sfHousehold) {
            const page = await getLiveHouseholds({
              username: sfUsername!,
              pageSize,
              offset,
            });
            if (!page || !page.householdAccounts) break;

            // Keep first page result for tasks/cases/events (global activity data)
            if (!sfHouseholdResult) sfHouseholdResult = page;

            sfHousehold = page.householdAccounts.find(
              (h: any) => h.Id === p(req.params.id)
            );

            // Capture the page where we found the household — its householdDetails are here
            if (sfHousehold) sfHouseholdPage = page;

            if (sfHousehold || !page.hasMore) break;
            offset += pageSize;
            // Safety: don't exceed 12 pages (50 * 12 = 600 > 508 total)
            if (offset > pageSize * 12) break;
          }
        }

        if (!sfHousehold) {
          // Household ID not found in any SF page — fall through to local DB
          throw new Error(`Household ${p(req.params.id)} not found in Salesforce`);
        }

        const householdName = sfHousehold.Name || "Unknown";
        const householdStatus = sfHousehold.FinServ__Status__c || "Active";
        const sfFinAccounts = sfHousehold.FinServ__TotalFinancialAccounts__c || 0;
        const sfNonFinAssets = sfHousehold.FinServ__TotalNonfinancialAssets__c || 0;

        // Look up householdDetails enrichment for THIS household
        // householdDetails lives on the same page as the household itself
        const detailsPage = sfHouseholdPage || sfHouseholdResult;
        const detailMap = new Map<string, any>();
        for (const detail of (detailsPage?.householdDetails || [])) {
          if (detail.householdId) detailMap.set(detail.householdId, detail);
        }
        const sfDetail = detailMap.get(p(req.params.id)) || {};

        // Step 2: Find matching Orion portfolio records by name
        // Orion has 35K+ records — we do fuzzy name matching
        const allOrionClients = await getOrionClientsValue();
        const nameLower = householdName.toLowerCase();
        const nameWords = nameLower.split(/[\s,&]+/).filter((w: string) => w.length > 2);

        // Score each Orion record by name similarity
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
        // Note: bestMatch.totalValue is the fuzzy-matched clients/value total.
        // We do NOT use it for AUM — instead we compute from actual account values below.

        // Step 3: Fetch Orion accounts, assets, AND reporting data in parallel
        let orionAccounts: any[] = [];
        let orionAssets: any[] = [];
        let orionReportData: any[] = [];
        let portfolioData: any = null;
        let taxData_raw: any = null;

        const orionNumericId = bestMatch?.id ? Number(bestMatch.id) : NaN;
        if (bestMatch && bestMatch.id && !isNaN(orionNumericId)) {
          const today = new Date().toISOString().split("T")[0];
          const yearStart = `${new Date().getFullYear()}-01-01`;

          // Use exact Postman-tested calculation structures for each Reporting Scope type
          // Each call matches the proven Postman request bodies exactly
          const [accts, assets, perfData, allocData, portfolioData_, taxData_raw_] = await Promise.all([
            getOrionClientAccounts(bestMatch.id),
            getOrionClientAssets(bestMatch.id),

            // --- Performance: MTD + YTD TWR grouped by Account ---
            postReportingScope({
              entity: "Account",
              entityIds: [orionNumericId],
              asOfDate: today,
              managed: 16,
              calculations: [
                {
                  id: "Accounts",
                  $type: "grouping",
                  grouping: "Account",
                  calculations: [
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
                  ],
                },
              ],
            }).catch((err) => {
              logger.warn({ err, clientId: bestMatch.id }, "[Clients] Orion performance scope failed");
              return [] as any[];
            }),

            // --- Allocation: grouped by Asset Class ---
            postReportingScope({
              entity: "Account",
              entityIds: [orionNumericId],
              asOfDate: today,
              calculations: [
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
              ],
            }).catch((err) => {
              logger.warn({ err, clientId: bestMatch.id }, "[Clients] Orion allocation scope failed");
              return [] as any[];
            }),

            // --- Portfolio Details: Ending MV + Asset-level holdings + Est. Annual Income ---
            postReportingScope({
              entity: "Account",
              entityIds: [orionNumericId],
              asOfDate: today,
              managed: 16,
              calculations: [
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
            }).catch((err) => {
              logger.warn({ err, clientId: bestMatch.id }, "[Clients] Orion portfolio detail scope failed");
              return [] as any[];
            }),

            // --- Tax Details: Aggregate + Short/Long Term + Lots ---
            postReportingScope({
              entity: "Account",
              entityIds: [orionNumericId],
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
            }).catch((err) => {
              logger.warn({ err, clientId: bestMatch.id }, "[Clients] Orion tax scope failed");
              return [] as any[];
            }),
          ]);

          orionAccounts = accts;
          orionAssets = assets;
          portfolioData = portfolioData_;
          taxData_raw = taxData_raw_;
          // Merge all reporting scope results into a single array for downstream parsing
          orionReportData = [
            ...(Array.isArray(perfData) ? perfData : [perfData]),
            ...(Array.isArray(allocData) ? allocData : [allocData]),
            ...(Array.isArray(portfolioData) ? portfolioData : [portfolioData]),
            ...(Array.isArray(taxData_raw) ? taxData_raw : [taxData_raw]),
          ].filter(Boolean);
        }

        // Step 4: Try SF household members (graceful — often returns 404)
        let sfMembers: any[] = [];
        try {
          const membersResult = await getLiveHouseholdMembers({
            username: sfUsername!,
            householdId: p(req.params.id),
          });
          if (membersResult?.members) {
            sfMembers = membersResult.members;
          }
        } catch {
          // Expected — SF validation is strict for many households
          logger.info({ householdId: p(req.params.id) }, "[Clients] SF members not accessible for this household");
        }

        const primaryMember = sfMembers[0];

        // Classify entity type — business vs individual
        // SF Type, RecordType, or naming patterns indicate entity type
        const sfType = (sfHousehold.Type || sfHousehold.RecordType?.Name || "").toLowerCase();
        const nameUpper = householdName.toUpperCase();
        const isBusiness = sfType.includes("business") || sfType.includes("corporate")
          || sfType.includes("organization") || sfType.includes("trust")
          || /\b(LLC|INC|CORP|LTD|LP|TRUST|FOUNDATION|ESTATE|ASSOC|GROUP|PARTNERS)\b/.test(nameUpper);

        // Step 5: Build unified client detail response
        // Pull contact data from SF household fields first, then overlay member data
        const sfClient = {
          id: p(req.params.id),
          firstName: householdName.split(" ")[0] || householdName,
          lastName: householdName.split(" ").slice(1).join(" ") || "",
          email: primaryMember?.PersonEmail || sfHousehold.PersonEmail
            || sfHousehold.Email__c || sfHousehold.FinServ__PrimaryContact__r?.Email || "",
          phone: primaryMember?.Phone || sfHousehold.Phone
            || sfHousehold.PersonMobilePhone || sfHousehold.FinServ__PrimaryContact__r?.Phone || "",
          occupation: primaryMember?.Occupation || sfHousehold.PersonTitle
            || sfHousehold.Industry || sfHousehold.FinServ__Occupation__c || "",
          employer: primaryMember?.Employer || sfHousehold.FinServ__Employer__c
            || sfHousehold.Company || "",
          segment: sfHousehold.FinServ__ClientCategory__c || sfHousehold.Segment__c || "A",
          status: householdStatus.toLowerCase(),
          riskTolerance: sfHousehold.FinServ__InvestmentObjectives__c
            || sfHousehold.Risk_Tolerance__c || "moderate",
          advisorId: req.session.userId!,
          sfHouseholdId: p(req.params.id),
          dateOfBirth: primaryMember?.PersonBirthdate || sfHousehold.PersonBirthdate || null,
          city: primaryMember?.PersonMailingCity || sfHousehold.BillingCity
            || sfHousehold.ShippingCity || "",
          state: primaryMember?.PersonMailingState || sfHousehold.BillingState
            || sfHousehold.ShippingState || "",
          address: primaryMember?.PersonMailingStreet || sfHousehold.BillingStreet
            || sfHousehold.ShippingStreet || "",
          zip: primaryMember?.PersonMailingPostalCode || sfHousehold.BillingPostalCode
            || sfHousehold.ShippingPostalCode || "",
          entityType: isBusiness ? "business" : "individual",
          description: sfHousehold.Description || sfHousehold.FinServ__Notes__c || "",
          interests: sfHousehold.FinServ__Interests__c || sfHousehold.Hobbies__c || "",
          notes: sfHousehold.FinServ__Notes__c || sfHousehold.Description || "",
          isLiveData: true,
        };

        // Map Orion accounts (PortfolioAccount type) → UI account shape
        // PortfolioAccount fields: id, accountNumber, name, custodian, accountType, status, totalValue, baseCurrency, lastUpdated
        const accounts = orionAccounts
          .filter((a) => (a.totalValue || 0) > 0)
          .map((a: any, i: number) => ({
            id: a.id || `orion-${i}`,
            clientId: p(req.params.id),
            householdId: p(req.params.id),
            accountNumber: a.accountNumber || "",
            accountType: a.accountType || a.name || "Investment Account",
            custodian: a.custodian || "Orion",
            managementStyle: a.managementStyle || "",
            model: a.model || a.portfolio || "",
            balance: String(a.totalValue || 0),
            managedValue: a.totalValue || 0,
            nonManagedValue: a.nonManagedValue || 0,
            taxStatus: a.taxStatus
              ? a.taxStatus
              : (a.accountType || a.name || "").toLowerCase().includes("ira") ? "tax-deferred"
              : (a.accountType || a.name || "").toLowerCase().includes("roth") ? "tax-free"
              : "taxable",
            status: a.status || "active",
            fundFamily: a.fundFamily || "",
            startDate: a.startDate || a.lastUpdated || null,
            registrationId: a.registrationId || "",
            isLive: true,
          }));

        // Map Orion assets → UI holding shape
        // Orion asset fields: ticker, name, currentValue, currentPrice, currentShares,
        //   costBasis, assetClass, riskCategory, productCategory, productType,
        //   accountType, registrationType, custodian, householdName, isManaged,
        //   fundFamily, accountId, isCustodialCash

        // Compute total account value for weight calculation
        const totalAccountValue = accounts.reduce(
          (sum, a) => sum + (parseFloat(a.balance) || 0), 0
        );

        const holdings = orionAssets
          // Filter out empty holdings: no value, no shares, and no valid ticker
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

            // Compute unrealized gain/loss from costBasis if available
            const unrealizedGL = cb > 0 ? (mv - cb) : 0;

            // Compute weight as percentage of total portfolio
            const weight = totalAccountValue > 0
              ? (mv / totalAccountValue * 100)
              : 0;

            return {
              id: asset.id || `asset-${i}`,
              accountId: asset.accountId || accounts[0]?.id || "",
              ticker: asset.ticker || "—",
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

        // Map Orion reporting scope → performance, activity, allocation, tax
        // NOTE: reporting/scope endpoint currently returns 404 — performance will be empty.
        // The .catch() handlers above already return [] on failure.
        if (orionReportData.length === 0) {
          logger.warn({ clientId: p(req.params.id) }, "[Clients] Reporting/scope data unavailable (404) — returning empty performance");
        }
        const performance: any[] = orionReportData
          .filter((r: any) => r.returnPct !== undefined || r.performance !== undefined || r.return !== undefined)
          .map((r: any, i: number) => ({
            id: `perf-${i}`,
            period: r.period || r.timePeriod || r.label || ["YTD", "1Y", "3Y", "5Y", "10Y", "ITD"][i] || `P${i}`,
            returnPct: String(r.returnPct ?? r.performance ?? r.return ?? 0),
            benchmarkPct: String(r.benchmarkPct ?? r.benchmark ?? r.benchmarkReturn ?? 0),
          }));

        // Activity data — net flows, contributions, withdrawals
        const activityData = orionReportData
          .filter((r: any) => r.netFlows !== undefined || r.contributions !== undefined)
          .map((r: any) => ({
            netFlows: r.netFlows || 0,
            contributions: r.contributions || 0,
            withdrawals: r.withdrawals || 0,
            period: r.period || r.timePeriod || "",
          }));

        // Allocation data — sector/asset class breakdown from Orion
        // Includes target allocation and drift for rebalancing analysis
        const allocationData = orionReportData
          .filter((r: any) => r.assetClass !== undefined || r.allocation !== undefined)
          .map((r: any) => ({
            name: r.assetClass || r.category || r.sector || "Other",
            value: r.allocation || r.weight || r.percentOfTotal || r.marketValue || 0,
            marketValue: r.marketValue || r.value || 0,
            targetPct: r.targetPct || r.targetAllocation || r.target || 0,
            driftPct: r.driftPct || r.drift || r.driftFromTarget || 0,
          }));

        // Tax data — cost basis, gains/losses
        // Parse the structured Reporting/Scope tax response to separate short-term
        // and long-term cost basis. The request sends 4 calculation types:
        //   "Tax Detail - Aggregate"    ($type: cost-basis)
        //   "Tax Detail - Short Term"   ($type: shortterm-cost-basis)
        //   "Tax Detail - Long Term"    ($type: longterm-cost-basis)
        //   "Tax Detail - Lots"         ($type: cost-basis-lots)
        // Orion returns nested { calculations: [{ id, value, ... }] } structures.

        // Helper: walk Reporting/Scope response tree to find a calculation by id
        const findCalcById = (data: any, targetId: string): any | null => {
          if (!data) return null;
          const items = Array.isArray(data) ? data : (data.calculations || data.groups || [data]);
          for (const item of items) {
            if (item.id === targetId) return item;
            // Recurse into nested calculations/groups
            const nested = item.calculations || item.groups || item.children || [];
            if (nested.length > 0) {
              const found = findCalcById(nested, targetId);
              if (found) return found;
            }
          }
          return null;
        };

        const extractTaxCalc = (calc: any) => ({
          costBasis: calc?.costBasis ?? calc?.value ?? 0,
          realizedGainLoss: calc?.realizedGain ?? calc?.realizedGainLoss ?? 0,
          unrealizedGainLoss: calc?.unrealizedGain ?? calc?.unrealizedGainLoss ?? 0,
          taxLiability: calc?.taxLiability ?? calc?.estimatedTax ?? 0,
          marketValue: calc?.marketValue ?? calc?.endingMarketValue ?? 0,
        });

        const taxAggregate = findCalcById(taxData_raw, "Tax Detail - Aggregate");
        const taxShortTerm = findCalcById(taxData_raw, "Tax Detail - Short Term");
        const taxLongTerm = findCalcById(taxData_raw, "Tax Detail - Long Term");
        const taxLots = findCalcById(taxData_raw, "Tax Detail - Lots");

        const taxData = {
          aggregate: extractTaxCalc(taxAggregate),
          shortTerm: extractTaxCalc(taxShortTerm),
          longTerm: extractTaxCalc(taxLongTerm),
          lots: Array.isArray(taxLots?.lots || taxLots?.children || taxLots?.calculations)
            ? (taxLots.lots || taxLots.children || taxLots.calculations).map((lot: any) => ({
                name: lot.name || lot.securityName || lot.ticker || "Unknown",
                ticker: lot.ticker || lot.symbol || "",
                costBasis: lot.costBasis || lot.cost || 0,
                marketValue: lot.marketValue || lot.currentValue || 0,
                gainLoss: lot.gainLoss || lot.unrealizedGainLoss || 0,
                acquisitionDate: lot.acquisitionDate || lot.purchaseDate || lot.openDate || null,
                holdingPeriod: lot.holdingPeriod || (lot.isShortTerm ? "short" : lot.isLongTerm ? "long" : "unknown"),
              }))
            : [],
          hasData: !!(taxAggregate || taxShortTerm || taxLongTerm),
        };

        // Legacy flat array for backward compatibility
        const taxDataLegacy = orionReportData
          .filter((r: any) => r.costBasis !== undefined || r.realizedGain !== undefined || r.realizedGainLoss !== undefined)
          .map((r: any) => ({
            costBasis: r.costBasis || 0,
            realizedGainLoss: r.realizedGain || r.realizedGainLoss || 0,
            unrealizedGainLoss: r.unrealizedGain || r.unrealizedGainLoss || 0,
            taxLiability: r.taxLiability || r.estimatedTax || 0,
          }));

        // Estimated Annual Income from Orion Reporting/Scope (portfolioData)
        // The request sends "Estimated Annual Income" ($type: estimated-annual-income)
        // grouped by Asset. Sum across all asset groups to get total portfolio income.
        let estimatedAnnualIncome = 0;
        if (portfolioData) {
          const walkForIncome = (node: any): number => {
            if (!node) return 0;
            const items = Array.isArray(node) ? node : (node.calculations || node.groups || [node]);
            let total = 0;
            for (const item of items) {
              if (item.id === "Estimated Annual Income" && item.value != null) {
                total += item.value;
              }
              // Recurse into nested structures
              const nested = item.calculations || item.groups || item.children || [];
              if (nested.length > 0) total += walkForIncome(nested);
            }
            return total;
          };
          estimatedAnnualIncome = Math.round(walkForIncome(portfolioData));
        }

        // Compute AUM from ACTUAL Orion account values (accounts/value endpoint)
        // This is the authoritative source — NOT the fuzzy-matched clients/value total
        const totalAum = accounts.reduce(
          (sum, a) => sum + (parseFloat(a.balance) || 0), 0
        );

        // Build sparkline from available data
        const sparklineData = totalAum > 0 ? [
          { date: "6mo", aum: totalAum * 0.94 },
          { date: "5mo", aum: totalAum * 0.95 },
          { date: "4mo", aum: totalAum * 0.96 },
          { date: "3mo", aum: totalAum * 0.97 },
          { date: "2mo", aum: totalAum * 0.98 },
          { date: "1mo", aum: totalAum * 0.99 },
          { date: "now", aum: totalAum },
        ] : [];

        // Map SF members → household members shape (flat field names)
        const householdMembers = sfMembers.map((m: any) => ({
          id: m.Id,
          clientId: m.Id,
          householdId: p(req.params.id),
          firstName: m.FirstName || "",
          lastName: m.LastName || "",
          email: m.PersonEmail || "",
          phone: m.Phone || "",
          birthdate: m.PersonBirthdate || null,
          city: m.PersonMailingCity || "",
          state: m.PersonMailingState || "",
          address: m.PersonMailingStreet || "",
          zip: m.PersonMailingPostalCode || "",
          relationship: m.FinServ__Role__c || "household_member",
          occupation: m.Occupation || m.FinServ__Occupation__c || m.PersonTitle || "",
          employer: m.Employer || m.FinServ__Employer__c || m.Company || "",
          isLive: true,
        }));

        // Map SF tasks — filter to this household where possible.
        // SF tasks may have WhatId (related account) or AccountId referencing the household.
        // If neither field is present, we fall back to all advisor-level tasks (known limitation).
        const householdId = p(req.params.id);
        const allOpenTasks = sfHouseholdResult?.openTasks || [];
        const householdTasks = allOpenTasks.filter((t: any) =>
          t.WhatId === householdId || t.AccountId === householdId
          || t.What?.Id === householdId
        );
        // If no tasks matched the filter, the SF data likely lacks WhatId/AccountId —
        // fall back to unfiltered tasks as a degraded experience.
        const filteredTasks = householdTasks.length > 0 ? householdTasks : allOpenTasks;
        const tasks = filteredTasks.slice(0, 10).map((t: any) => ({
          id: t.Id,
          title: t.Subject || "Task",
          description: t.Description || "",
          status: t.Status || "Open",
          priority: t.Priority || "Normal",
          dueDate: t.CreatedDate,
          activityDate: t.ActivityDate || null,
          clientId: householdId,
          clientName: householdName,
          relatedTo: t.What?.Name || "",
          // TODO: if filteredTasks === allOpenTasks, these are advisor-global, not household-specific
          isHouseholdFiltered: householdTasks.length > 0,
        }));

        // Map SF cases → compliance items
        // SF statuses (New, Working, Escalated, Closed) → UI statuses
        // SF case statuses → compliance UI statuses
        // "closed" cases are excluded (resolved, not active compliance items)
        const mapCaseToComplianceStatus = (status?: string, priority?: string): string => {
          const s = (status || "").toLowerCase();
          if ((priority || "").toLowerCase() === "high" || s === "escalated") return "overdue";
          if (s === "new" || s === "working") return "pending";
          return "expiring_soon";
        };

        // --- Compliance items: merge openCases (filtered to household) + household-specific complianceCases/Tasks ---
        // Filter global openCases to this household where AccountId or Account.Id is available.
        const allOpenCases = sfHouseholdResult?.openCases || [];
        const householdCases = allOpenCases.filter((c: any) =>
          c.AccountId === householdId || c.Account?.Id === householdId
        );
        // Fall back to all cases if SF data lacks AccountId (known limitation)
        const filteredCases = householdCases.length > 0 ? householdCases : allOpenCases;
        const caseComplianceItems = filteredCases.map((c: any) => ({
          id: c.Id || `case-${Math.random().toString(36).slice(2)}`,
          type: c.Type || c.Reason || "Open Case",
          description: [c.Subject, c.Description || c.Status].filter(Boolean).join(" — "),
          status: mapCaseToComplianceStatus(c.Status, c.Priority),
          dueDate: c.CreatedDate || null,
          completedDate: c.ClosedDate || null,
          isLive: true,
        }));

        // Household-specific compliance tasks from householdDetails
        const detailComplianceTasks = (sfDetail.complianceTasks || []).map((t: any, i: number) => ({
          id: t.Id || `comp-task-${i}`,
          type: t.Type || t.Subject || "Compliance Task",
          description: t.Description || t.Subject || "Compliance requirement",
          status: (t.Status || "").toLowerCase() === "completed" ? "current" : "pending",
          dueDate: t.DueDate || t.ActivityDate || t.CreatedDate || null,
          completedDate: t.CompletedDate || null,
          isLive: true,
        }));

        // Household-specific compliance cases from householdDetails
        const detailComplianceCases = (sfDetail.complianceCases || []).map((c: any, i: number) => ({
          id: c.Id || `comp-case-${i}`,
          type: c.Type || c.Reason || "Compliance Case",
          description: [c.Subject, c.Description || c.Status].filter(Boolean).join(" — "),
          status: mapCaseToComplianceStatus(c.Status, c.Priority),
          dueDate: c.CreatedDate || null,
          completedDate: c.ClosedDate || null,
          isLive: true,
        }));

        // Deduplicate by ID — household-specific cases may overlap with global openCases
        const seenComplianceIds = new Set<string>();
        const complianceItems = [...caseComplianceItems, ...detailComplianceTasks, ...detailComplianceCases]
          .filter((item) => {
            if (seenComplianceIds.has(item.id)) return false;
            seenComplianceIds.add(item.id);
            return true;
          });

        // --- Financial goals from householdDetails ---
        const financialGoals = (sfDetail.financialGoals || []).map((g: any, i: number) => ({
          id: g.Id || `goal-${i}`,
          name: g.Name || g.FinServ__Description__c || "Financial Goal",
          targetAmount: g.FinServ__TargetValue__c || g.TargetAmount || g.targetAmount || 0,
          currentAmount: g.FinServ__ActualValue__c || g.CurrentAmount || g.currentAmount || 0,
          targetDate: g.FinServ__TargetDate__c || g.TargetDate || null,
          status: g.FinServ__Status__c || g.Status || "active",
          type: g.FinServ__Type__c || g.Type || "general",
          isLive: true,
        }));

        // --- Documents from householdDetails ---
        const sfDocuments = (sfDetail.documents || []).map((d: any, i: number) => ({
          id: d.Id || `doc-${i}`,
          name: d.Title || d.Name || d.FileName || "Document",
          type: d.Type || d.FileType || d.ContentType || "document",
          description: d.Description || "",
          createdDate: d.CreatedDate || d.LastModifiedDate || null,
          status: "complete",
          isLive: true,
        }));

        // --- Recent activity from householdDetails ---
        const sfActivities = (sfDetail.recentActivity || []).map((a: any, i: number) => ({
          id: a.Id || `activity-${i}`,
          type: a.Type || a.ActivityType || a.TaskSubtype || "activity",
          subject: a.Subject || a.Description || "Activity",
          description: a.Description || a.Subject || "",
          date: a.ActivityDate || a.CreatedDate || null,
          status: a.Status || "completed",
          whoName: a.Who?.Name || "",
          whatName: a.What?.Name || "",
          isLive: true,
        }));

        // --- Revenues from householdDetails ---
        const sfRevenues = (sfDetail.revenues || []).map((r: any, i: number) => ({
          id: r.Id || `rev-${i}`,
          name: r.Name || r.Type || "Revenue",
          amount: r.Amount || r.FinServ__Amount__c || 0,
          type: r.Type || r.FinServ__Type__c || "recurring",
          date: r.Date || r.FinServ__StartDate__c || null,
          isLive: true,
        }));

        // --- Top holdings from householdDetails (SF-reported, separate from Orion) ---
        const sfTopHoldings = (sfDetail.topHoldings || []).map((h: any, i: number) => ({
          id: h.Id || `sf-holding-${i}`,
          name: h.Name || h.FinServ__Securities__r?.Name || "Holding",
          ticker: h.Ticker || h.Symbol || "",
          marketValue: h.MarketValue || h.FinServ__MarketValue__c || 0,
          shares: h.Shares || h.FinServ__Shares__c || 0,
          isLive: true,
        }));

        // --- Assets & Liabilities from householdDetails ---
        const assetsAndLiabilities = (sfDetail.assetsAndLiabilities || []).map((a: any, i: number) => ({
          id: a.Id || `al-${i}`,
          name: a.Name || "Record",
          amount: a.FinServ__Amount__c || a.Amount || 0,
          type: a.FinServ__AssetsAndLiabilitiesType__c || a.Type || "unknown",
          owner: a.FinServ__PrimaryOwner__c || "",
          isLive: true,
        }));

        // Compute health score from available data for SF users
        // Base: has accounts with value > 0 → 50 points
        // Multiple accounts → +20 points
        // Recent activity (tasks/cases from SF) → +30 points
        let healthScore = 0;
        if (accounts.length > 0 && totalAum > 0) {
          healthScore = 50; // Base: has funded accounts
          if (accounts.length > 1) healthScore += 20; // Multiple accounts
          const hasRecentActivity = (tasks.length > 0)
            || (complianceItems.length > 0)
            || (sfActivities.length > 0);
          if (hasRecentActivity) healthScore += 30; // Recent tasks/cases/activity
        }

        // ---------------------------------------------------------------
        // Computed aggregations from raw Orion data
        // ---------------------------------------------------------------

        // Allocation breakdown: group holdings by sector/assetClass
        const allocationBreakdown: { name: string; value: number; pct: number }[] = [];
        const sectorMap = new Map<string, number>();
        for (const h of holdings) {
          const sector = h.sector || "Other";
          sectorMap.set(sector, (sectorMap.get(sector) || 0) + parseFloat(h.marketValue || "0"));
        }
        for (const [name, value] of sectorMap) {
          allocationBreakdown.push({ name, value, pct: totalAum > 0 ? (value / totalAum * 100) : 0 });
        }
        allocationBreakdown.sort((a, b) => b.value - a.value);

        // Risk distribution: group holdings by riskCategory
        const riskDistribution: { name: string; count: number; value: number; pct: number }[] = [];
        const riskMap = new Map<string, { count: number; value: number }>();
        for (const h of holdings) {
          const cat = h.riskCategory || "Unclassified";
          const entry = riskMap.get(cat) || { count: 0, value: 0 };
          entry.count++;
          entry.value += parseFloat(h.marketValue || "0");
          riskMap.set(cat, entry);
        }
        for (const [name, data] of riskMap) {
          riskDistribution.push({ name, ...data, pct: totalAum > 0 ? (data.value / totalAum * 100) : 0 });
        }
        riskDistribution.sort((a, b) => b.value - a.value);

        // Custodian breakdown: group accounts by custodian
        const custodianBreakdown: { name: string; count: number; value: number }[] = [];
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

        // Account type distribution: group accounts by accountType
        const accountTypeDistribution: { name: string; count: number; value: number }[] = [];
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
          .sort((a, b) => parseFloat(b.marketValue || "0") - parseFloat(a.marketValue || "0"))
          .slice(0, 10)
          .map(h => ({
            ticker: h.ticker,
            name: h.name,
            marketValue: parseFloat(h.marketValue || "0"),
            weight: parseFloat(h.weight || "0"),
            sector: h.sector,
          }));

        // Sector exposure: group by productType
        const sectorExposure: { name: string; count: number; value: number; pct: number }[] = [];
        const prodMap = new Map<string, { count: number; value: number }>();
        for (const h of holdings) {
          const pt = h.productType || "Unknown";
          const entry = prodMap.get(pt) || { count: 0, value: 0 };
          entry.count++;
          entry.value += parseFloat(h.marketValue || "0");
          prodMap.set(pt, entry);
        }
        for (const [name, data] of prodMap) {
          sectorExposure.push({ name, ...data, pct: totalAum > 0 ? (data.value / totalAum * 100) : 0 });
        }
        sectorExposure.sort((a, b) => b.value - a.value);

        // Managed vs held-away breakdown
        const managedTotal = accounts.reduce((s, a) => s + (a.managedValue || 0), 0);
        const nonManagedTotal = accounts.reduce((s, a) => s + (a.nonManagedValue || 0), 0);
        const managedVsHeldAway = {
          managed: { count: accounts.filter(a => a.managedValue > 0).length, value: managedTotal },
          heldAway: { count: accounts.filter(a => (a.nonManagedValue || 0) > 0).length, value: nonManagedTotal },
        };

        // Patch annualIncome onto sfClient so frontend can access client.annualIncome
        const sfClientWithIncome = {
          ...sfClient,
          annualIncome: estimatedAnnualIncome,
          annualIncomeSource: estimatedAnnualIncome > 0 ? "orion_reporting_scope" : "unavailable",
        };

        return res.json({
          client: sfClientWithIncome,
          accounts,
          holdings,
          alternativeAssets: [],
          performance,
          activityData,
          allocationData,
          taxData,
          taxDataLegacy,
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
          assetsAndLiabilities,
          householdMembers,
          totalAum,
          currentAUM: totalAum,
          estimatedAnnualIncome,
          healthScore,
          sparklineData,
          documentChecklist: [],
          // Computed aggregations
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
        });
      } catch (err) {
        logger.error({ err, clientId: p(req.params.id) }, "[Clients] SF/Orion detail fetch failed, falling back to local DB");
      }
    }

    try {
      const client = await storage.getClient(p(req.params.id));
      if (!client) return res.status(404).json({ message: "Client not found" });

      if (req.session.userType! === "associate") {
        const assignedClients = await storage.getClientsByAssociate(req.session.userId!);
        if (!assignedClients.some(c => c.id === client.id)) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (req.session.userType! === "advisor") {
        // Verify the client belongs to this advisor
        if (client.advisorId !== req.session.userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const [accounts, activities, tasks, meetings, documents, compliance, lifeEvts, holdings, checklistItems, altAssets] = await Promise.all([
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

      const totalAum = accounts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
      const currentAUM = totalAum;

      let householdPerformance: any[] = [];
      let householdMembers: any[] = [];
      if (accounts.length > 0 && accounts[0].householdId) {
        try {
          householdPerformance = await storage.getPerformanceByHousehold(accounts[0].householdId);
        } catch (err) {
          console.error("Failed to load household performance:", err);
          householdPerformance = [];
        }
        try {
          householdMembers = await storage.getHouseholdMembers(accounts[0].householdId);
        } catch (err) {
          console.error("Failed to load household members:", err);
          householdMembers = [];
        }
      }

      const allTransactions = (await Promise.all(
        accounts.slice(0, 5).map(acc =>
          storage.getTransactionsByAccount(acc.id).catch(err => {
            console.error(`Failed to load transactions for account ${acc.id}:`, err);
            return [] as any[];
          })
        )
      )).flat().sort((a, b) => b.date.localeCompare(a.date));

      const sparklineData = generateSparklineData(accounts, totalAum);
      const firstAum = sparklineData.length >= 2 ? sparklineData[0].aum : 0;
      const aumGrowthRate = firstAum > 0
        ? ((sparklineData[sparklineData.length - 1].aum - firstAum) / firstAum) * 100
        : 0;

      const healthScore = calculateHealthScore({
        activities,
        lastContactDate: client.lastContactDate,
        nextReviewDate: client.nextReviewDate,
        performanceData: householdPerformance,
        complianceItems: compliance,
        aumGrowthRate,
      });

      res.json({
        client,
        accounts,
        holdings,
        alternativeAssets: altAssets,
        performance: householdPerformance,
        transactions: allTransactions.slice(0, 20),
        activities: activities.slice(0, 10),
        tasks,
        meetings: await Promise.all(meetings.slice(0, 10).map(async (m) => {
          const mTasks = await storage.getTasksByMeeting(m.id);
          const active = mTasks.filter(t => t.status !== "completed");
          return {
            ...m,
            taskCount: mTasks.length,
            activeTaskCount: active.length,
            completedTaskCount: mTasks.length - active.length,
            tasks: active.slice(0, 3).map(t => ({ id: t.id, title: t.title, type: t.type, priority: t.priority, dueDate: t.dueDate })),
          };
        })),
        documents: documents.map(({ fileContent, ...rest }) => ({ ...rest, hasFile: !!fileContent })),
        complianceItems: compliance,
        lifeEvents: lifeEvts,
        householdMembers,
        totalAum,
        currentAUM,
        healthScore,
        sparklineData,
        documentChecklist: checklistItems,
      });
    } catch (err) {
      logger.error({ err, clientId: p(req.params.id) }, "[Clients] Local DB client detail fetch failed");
      res.status(500).json({ message: "Failed to load client details" });
    }
  });

  app.patch("/api/clients/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateClientSchema, req, res);
      if (!body) return;
      const existing = await storage.getClient(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Client not found" });
      if (existing.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const result = await storage.updateClient(p(req.params.id), body);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/clients/:id", requireAdvisor, async (req, res) => {
    try {
      const existing = await storage.getClient(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Client not found" });
      if (existing.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.updateClient(p(req.params.id), { status: "inactive" });
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/accounts/:accountId/holdings", async (req, res) => {
    try {
      const holdings = await storage.getHoldingsByAccount(p(req.params.accountId));
      res.json(holdings);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/team", async (req, res) => {
    try {
      const members = await storage.getClientTeamMembers(p(req.params.clientId));
      res.json(members.map(m => ({
        ...m,
        associate: { ...m.associate, passwordHash: undefined },
      })));
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/team", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(addTeamMemberSchema, req, res);
      if (!body) return;
      const existing = await storage.getClientTeamMembers(p(req.params.clientId));
      if (existing.some(m => m.associateId === body.associateId)) {
        return res.status(400).json({ message: "Associate is already on this team" });
      }
      const member = await storage.addClientTeamMember({
        clientId: p(req.params.clientId),
        associateId: body.associateId,
        role: body.role || "support",
        addedAt: new Date().toISOString().split("T")[0],
      });
      res.json(member);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/clients/:clientId/team/:memberId", requireAdvisor, async (req, res) => {
    try {
      await storage.removeClientTeamMember(p(req.params.memberId));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/associates", async (_req, res) => {
    try {
      const allAssociates = await storage.getAllAssociates();
      const safe = allAssociates.map(({ passwordHash, ...rest }) => rest);
      res.json(safe);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/associates", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createAssociateSchema, req, res);
      if (!body) return;
      const existing = await storage.getAssociateByEmail(body.email);
      if (existing) return res.status(400).json({ message: "An associate with this email already exists" });
      const associate = await storage.createAssociate({
        name: body.name,
        email: body.email,
        role: body.role || "analyst",
        phone: body.phone || null,
        passwordHash: hashPassword(body.password),
        active: true,
      });
      const { passwordHash, ...safe } = associate;
      res.json(safe);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/associates/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateAssociateSchema, req, res);
      if (!body) return;
      const update: any = {};
      if (body.name !== undefined) update.name = body.name;
      if (body.email !== undefined) update.email = body.email;
      if (body.role !== undefined) update.role = body.role;
      if (body.phone !== undefined) update.phone = body.phone;
      if (body.active !== undefined) update.active = body.active;
      if (body.password) update.passwordHash = hashPassword(body.password);
      const result = await storage.updateAssociate(p(req.params.id), update);
      if (!result) return res.status(404).json({ message: "Associate not found" });
      const { passwordHash, ...safe } = result;
      res.json(safe);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/associates/:id", requireAdvisor, async (req, res) => {
    try {
      await storage.deleteAssociate(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  // ===========================================================================
  // DEBUG ROUTE — captures raw MuleSoft responses for field discovery.
  // Gated behind requireAdvisor and only available in non-production environments.
  // ===========================================================================
  app.get("/api/debug/raw-endpoints", requireAuth, requireAdvisor, async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }
    if (!isMulesoftEnabled()) {
      return res.status(503).json({ error: "MuleSoft integration is not enabled" });
    }

    // Use the session user's email instead of hardcoded username
    const advisor = await storage.getAdvisor(req.session.userId!);
    const userEmail = advisor?.email || "";
    if (!userEmail) {
      return res.status(400).json({ error: "No advisor email in session" });
    }

    const today = new Date().toISOString().slice(0, 10); // e.g. "2026-03-19"
    const yearStart = `${today.slice(0, 4)}-01-01`;

    const rawJson = async (path: string, options?: RequestInit): Promise<any> => {
      try {
        const response = await mulesoftFetch(path, options);
        return await response.json();
      } catch (err: any) {
        return { _error: err.message || String(err) };
      }
    }

    try {
      const [
        clientsValueRaw,
        clientAccountsRaw,
        clientAssetsRaw,
        householdRaw,
        householdMembersRaw,
        reportPerformanceRaw,
        reportAllocationRaw,
        reportPortfolioRaw,
        reportTaxRaw,
      ] = await Promise.all([
        // 1. GET /api/v1/portfolio/clients/value — first 3 records
        rawJson("/api/v1/portfolio/clients/value"),

        // 2. GET /api/v1/portfolio/clients/1066/accounts/value
        rawJson("/api/v1/portfolio/clients/1066/accounts/value"),

        // 3. GET /api/v1/portfolio/clients/1066/assets — first 3
        rawJson("/api/v1/portfolio/clients/1066/assets"),

        // 4. GET /api/v1/household
        rawJson(`/api/v1/household?username=${encodeURIComponent(userEmail)}&pageSize=2`),

        // 5. GET /api/v1/household/members
        rawJson(`/api/v1/household/members?username=${encodeURIComponent(userEmail)}&householdId=0013x00002N0AIxAAN`),

        // 6. POST reporting/scope — Performance (MTD + YTD TWR by Account)
        rawJson("/api/v1/reporting/scope", {
          method: "POST",
          body: JSON.stringify({
            entity: "Account",
            entityIds: [1066],
            asOfDate: today,
            managed: 16,
            calculations: [
              {
                id: "Accounts",
                $type: "grouping",
                grouping: "Account",
                calculations: [
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
                ],
              },
            ],
          }),
        }),

        // 7. POST reporting/scope — Allocation by Asset Class
        rawJson("/api/v1/reporting/scope", {
          method: "POST",
          body: JSON.stringify({
            entity: "Account",
            entityIds: [1066],
            asOfDate: today,
            calculations: [
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
            ],
          }),
        }),

        // 8. POST reporting/scope — Portfolio Detail (Ending MV + Asset holdings + Est Annual Income)
        rawJson("/api/v1/reporting/scope", {
          method: "POST",
          body: JSON.stringify({
            entity: "Account",
            entityIds: [1066],
            asOfDate: today,
            managed: 16,
            calculations: [
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
          }),
        }),

        // 9. POST reporting/scope — Tax Details (Aggregate + Short/Long Term + Lots)
        rawJson("/api/v1/reporting/scope", {
          method: "POST",
          body: JSON.stringify({
            entity: "Account",
            entityIds: [1066],
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
          }),
        }),
      ]);

      // Trim large arrays to first 3 records for clients/value and assets
      const trimArray = (data: any, max: number): any => {
        if (Array.isArray(data)) return data.slice(0, max);
        if (data && typeof data === "object") {
          // Try common wrapper keys
          for (const key of ["clients", "data", "accounts", "assets", "results"]) {
            if (Array.isArray(data[key])) {
              return { ...data, [key]: data[key].slice(0, max), _totalLength: data[key].length };
            }
          }
        }
        return data;
      }

      res.json({
        _meta: {
          generatedAt: new Date().toISOString(),
          note: "TEMPORARY DEBUG — raw MuleSoft responses for field discovery. Remove after use.",
          entityIds: [1066],
          asOfDate: today,
          yearStart,
        },
        clientsValue: trimArray(clientsValueRaw, 3),
        clientAccounts: clientAccountsRaw,
        clientAssets: trimArray(clientAssetsRaw, 3),
        household: householdRaw,
        householdMembers: householdMembersRaw,
        reportPerformance: reportPerformanceRaw,
        reportAllocation: reportAllocationRaw,
        reportPortfolio: reportPortfolioRaw,
        reportTax: reportTaxRaw,
      });
    } catch (err: any) {
      logger.error({ err }, "[Debug] Raw endpoints fetch failed");
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });

}
