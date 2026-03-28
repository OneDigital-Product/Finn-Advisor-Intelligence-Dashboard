import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdvisor, getSessionAdvisor, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { insertClientSchema } from "@shared/schema";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { logger } from "@server/lib/logger";
import { getCache, isCacheValid, warmEnrichedCache } from "@server/lib/enriched-clients-cache";

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
    // Build or reuse the FULL enriched client list via shared utility.
    // warmEnrichedCache() handles SF pagination, Orion AUM merge,
    // deduplication of concurrent requests, and crosswalk backfill.
    // -------------------------------------------------------------------
    let allClients: any[] = [];
    let cachedAdvisor: any = null;

    if (isCacheValid(userEmail!)) {
      const cache = getCache()!;
      allClients = cache.data;
      cachedAdvisor = cache.advisor;
      _dataSources.orion = "cached";
    } else {
      const result = await warmEnrichedCache(userEmail!);
      if (result) {
        allClients = result.data;
        cachedAdvisor = result.advisor;
      } else {
        _dataSources.fallback = "local-db";
        _dataSources.salesforce = "error";
        _errors.push("Salesforce/Orion: cache warming failed — falling back to local DB");
        logger.warn("[Clients] warmEnrichedCache failed — falling back to local DB");
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
