/**
 * Enriched Clients Cache — shared warming utility
 * ─────────────────────────────────────────────────
 *
 * Provides:
 * 1. Module-scope snapshot (HMR-resilient secondary store)
 * 2. `warmEnrichedCache()` — lazy-init function that fetches all SF
 *    households + Orion AUM and populates the globalThis cache.
 *    Deduplicated: concurrent callers share the same in-flight promise.
 *
 * The enriched cache is the FULL merged list of SF households + Orion AUM
 * for the current advisor. It is expensive to build (~2-5s) but is reused
 * by every client-detail route for the duration of its 10-minute TTL.
 */

import { logger } from "./logger";
import { sseEventBus } from "./sse-event-bus";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
  getHouseholdMembers,
} from "@server/integrations/mulesoft/api";
import { backfillFromEnrichedClients, linkLocalClientsToHouseholds } from "@server/lib/client-identity";

// ── Types ──

export interface EnrichedClientsSnapshot {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
}

// ── Module-scope snapshot (HMR-resilient) ──

let _snapshot: EnrichedClientsSnapshot | null = null;

export function getEnrichedClientsSnapshot(): EnrichedClientsSnapshot | null {
  return _snapshot;
}

export function setEnrichedClientsSnapshot(val: EnrichedClientsSnapshot): void {
  _snapshot = val;
  logger.debug(
    { clients: val.data.length, userEmail: val.userEmail },
    "[Enriched Cache] Module-scope snapshot updated"
  );
}

// ── GlobalThis cache accessors (shared with route files) ──

const ENRICHED_CLIENTS_TTL = 10 * 60 * 1000; // 10 minutes

const g = globalThis as any;
if (!g._enrichedClientsCache) g._enrichedClientsCache = null;

export function getCache(): EnrichedClientsSnapshot | null {
  return g._enrichedClientsCache;
}

export function setCache(val: EnrichedClientsSnapshot): void {
  g._enrichedClientsCache = val;
  setEnrichedClientsSnapshot(val);
}

export function isCacheValid(userEmail: string): boolean {
  const cache = getCache();
  return !!(
    cache &&
    cache.userEmail === userEmail &&
    Date.now() - cache.ts < ENRICHED_CLIENTS_TTL
  );
}

/**
 * Look up a single client by ID from the enriched cache.
 * Returns null if cache is cold/invalid or client not found.
 */
export function getCachedClient(id: string, userEmail: string): any | null {
  if (!isCacheValid(userEmail)) return null;
  const cache = getCache()!;
  return cache.data.find((c: any) => c.id === id) || null;
}

// ── In-flight deduplication ──

let _warmingPromise: Promise<EnrichedClientsSnapshot | null> | null = null;
let _warmingEmail: string | null = null;

/**
 * Warm the enriched clients cache by fetching all SF households + Orion AUM.
 *
 * This is the same logic that runs in GET /api/clients, extracted so any
 * client-detail route can trigger it on cold-cache access.
 *
 * Concurrent callers for the same userEmail share a single in-flight promise.
 * Returns the snapshot on success, null on failure.
 */
// ── Shared helpers ──

function mapSfStatus(sfStatus: string): string {
  const s = (sfStatus || "").toLowerCase();
  if (s === "active" || s === "client") return "active";
  if (s === "at risk" || s === "at-risk") return "review";
  if (s === "inactive" || s === "closed" || s === "terminated") return "inactive";
  if (s === "prospect" || s === "lead") return "prospect";
  return "active";
}

/** Map a raw SF household account + detail to the enriched client shape. */
function mapSfAccount(acct: any, detail: any, orionAumOverride?: number): any {
  const finAccounts = detail?.financialAccounts || [];
  const totalFinAssets = acct.FinServ__TotalFinancialAccounts__c || 0;
  const totalNonFinAssets = acct.FinServ__TotalNonfinancialAssets__c || 0;
  const sfAum = totalFinAssets + totalNonFinAssets;
  const totalAum = orionAumOverride != null ? Math.max(sfAum, orionAumOverride) : sfAum;

  const acctName = (acct.Name || "").toUpperCase();
  const acctType = (acct.Type || acct.RecordType?.Name || "").toLowerCase();
  const isBusinessEntity =
    acctType.includes("business") || acctType.includes("corporate") ||
    acctType.includes("organization") || acctType.includes("trust") ||
    /\b(LLC|INC|CORP|LTD|LP|TRUST|FOUNDATION|ESTATE|ASSOC|GROUP|PARTNERS)\b/.test(acctName);

  return {
    id: acct.Id,
    firstName: acct.Name?.split(" ")[0] || acct.Name || "",
    lastName: acct.Name?.split(" ").slice(1).join(" ") || "",
    email: acct.PersonEmail || acct.FinServ__PrimaryContact__r?.Email || detail?.primaryContact?.Email || acct.Email__c || "",
    phone: acct.Phone || acct.PersonMobilePhone || acct.FinServ__PrimaryContact__r?.Phone || detail?.primaryContact?.Phone || "",
    occupation: acct.PersonTitle || acct.Industry || acct.FinServ__Occupation__c || detail?.occupation || "",
    segment: acct.FinServ__ClientCategory__c || "",
    status: mapSfStatus(acct.FinServ__Status__c || "active"),
    riskTolerance: acct.FinServ__InvestmentObjectives__c || acct.Risk_Tolerance__c || detail?.riskTolerance || "moderate",
    totalAum,
    currentAUM: totalAum,
    accountCount: finAccounts.length,
    sfHouseholdId: acct.Id,
    entityType: isBusinessEntity ? "business" : "individual",
    createdDate: acct.CreatedDate || "",
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
}

// ── Full cache warming ──

// Page size for SF household fetches.
// 200 and 100 both fail: SF Apex REST response exceeds ~6.4MB JSON serialization
// limit with rich per-household detail payloads. 50 is the proven safe maximum.
// At 50: 508 clients = 11 pages (1 parallel with Orion + 2 remaining batches) = ~26s
const WARM_PAGE_SIZE = 50;

export async function warmEnrichedCache(userEmail: string): Promise<EnrichedClientsSnapshot | null> {
  // Already warm and valid — return immediately
  if (isCacheValid(userEmail)) {
    return getCache();
  }

  // Check module-scope snapshot as secondary (survives HMR)
  const snapshot = getEnrichedClientsSnapshot();
  if (snapshot && snapshot.userEmail === userEmail && Date.now() - snapshot.ts < ENRICHED_CLIENTS_TTL) {
    g._enrichedClientsCache = snapshot;
    return snapshot;
  }

  // Deduplicate: if another request is already warming for this user, piggyback
  if (_warmingPromise && _warmingEmail === userEmail) {
    return _warmingPromise;
  }

  if (!isSalesforceUser(userEmail) || !isMulesoftEnabled()) {
    return null;
  }

  const sfUsername = getSalesforceUsername(userEmail);

  _warmingEmail = userEmail;
  _warmingPromise = (async () => {
    const t0 = Date.now();
    try {
      logger.info({ userEmail }, "[Enriched Cache] Warming cache on cold miss");

      // Phase 1: SF page 1 + Orion in parallel
      const t1 = Date.now();
      const [sfResult, orionResult] = await Promise.allSettled([
        getLiveHouseholds({ username: sfUsername, pageSize: WARM_PAGE_SIZE, offset: 0 }),
        getOrionClientsValue(),
      ]);
      const t2 = Date.now();

      const firstPage = sfResult.status === "fulfilled" ? sfResult.value : null;
      const allOrionClients = orionResult.status === "fulfilled" ? orionResult.value : [];

      if (!firstPage?.householdAccounts) {
        logger.warn("[Enriched Cache] SF returned no household data during warming");
        return null;
      }

      // Phase 2: Remaining SF pages
      let allHouseholdAccounts = [...firstPage.householdAccounts];
      let allHouseholdDetails = [...(firstPage.householdDetails || [])];
      const totalSize = firstPage.totalSize || firstPage.householdAccounts.length;

      const t3 = Date.now();
      if (totalSize > WARM_PAGE_SIZE) {
        const remainingPages = Math.ceil((totalSize - WARM_PAGE_SIZE) / WARM_PAGE_SIZE);
        const MAX_CONCURRENT = 6;

        for (let start = 0; start < remainingPages; start += MAX_CONCURRENT) {
          const batch = [];
          for (let j = 0; j < MAX_CONCURRENT && start + j < remainingPages; j++) {
            const pageIdx = start + j + 1;
            batch.push(
              getLiveHouseholds({ username: sfUsername, pageSize: WARM_PAGE_SIZE, offset: pageIdx * WARM_PAGE_SIZE })
            );
          }
          const results = await Promise.all(batch);
          for (const r of results) {
            if (r?.householdAccounts) {
              allHouseholdAccounts.push(...r.householdAccounts);
              if (r.householdDetails) allHouseholdDetails.push(...r.householdDetails);
            }
          }
        }
      }
      const t4 = Date.now();

      // Phase 3: Enrichment mapping
      const detailMap = new Map<string, any>();
      for (const detail of allHouseholdDetails) {
        if (detail.householdId) detailMap.set(detail.householdId, detail);
      }

      const orionLookup = allOrionClients.map((o: any) => ({
        name: (o.name || "").toLowerCase(),
        words: new Set((o.name || "").toLowerCase().split(/[\s,&]+/).filter((w: string) => w.length > 2)),
        totalValue: o.totalValue || 0,
      }));

      const matchOrionAum = (householdName: string): number => {
        const nameLower = householdName.toLowerCase();
        const nameWords = nameLower.split(/[\s,&]+/).filter((w: string) => w.length > 2);
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
          if (score > bestScore) { bestScore = score; bestAum = orion.totalValue; }
        }
        return bestScore >= minScore ? bestAum : 0;
      };

      const allClients = allHouseholdAccounts.map((acct: any) => {
        const detail = detailMap.get(acct.Id);
        const sfAum = (acct.FinServ__TotalFinancialAccounts__c || 0) + (acct.FinServ__TotalNonfinancialAssets__c || 0);
        const orionAum = allOrionClients.length === 0 ? 0 : (sfAum > 0 ? sfAum : matchOrionAum(acct.Name || ""));
        return mapSfAccount(acct, detail, orionAum);
      });
      const t5 = Date.now();

      const totalAumSum = allClients.reduce((s: number, c: any) => s + (c.totalAum || 0), 0);
      const result: EnrichedClientsSnapshot = {
        data: allClients,
        totalAum: totalAumSum,
        advisor: firstPage.advisor || null,
        ts: Date.now(),
        userEmail,
      };

      setCache(result);

      // Non-blocking crosswalk backfill
      backfillFromEnrichedClients(allClients)
        .then(() => linkLocalClientsToHouseholds())
        .catch((err) => logger.error({ err }, "[Enriched Cache] Background backfill failed"));

      logger.info({
        clients: allClients.length,
        orionRecords: allOrionClients.length,
        sfPages: Math.ceil(totalSize / WARM_PAGE_SIZE),
        timing: {
          sfPage1_orion_ms: t2 - t1,
          sfRemaining_ms: t4 - t3,
          enrichment_ms: t5 - t4,
          total_ms: t5 - t0,
        },
      }, "[Enriched Cache] Cache warmed successfully");

      // Notify connected clients that household data is fresh
      try {
        sseEventBus.broadcast("signals:household_updated", {
          clientCount: allClients.length,
          timestamp: new Date().toISOString(),
        });
      } catch (_) { /* SSE broadcast is best-effort */ }

      return result;

    } catch (err) {
      logger.error({ err: String(err), elapsed_ms: Date.now() - t0 }, "[Enriched Cache] Warming failed");
      return null;
    } finally {
      _warmingPromise = null;
      _warmingEmail = null;
    }
  })();

  return _warmingPromise;
}

// ── Fast-path single-client resolver ──

/**
 * Resolve a single client by SF ID with minimal latency.
 *
 * 1. Check warm cache → return if hit
 * 2. Fetch SF page 1 only (no Orion, no full pagination) → ~2-5s
 * 3. If target client found on page 1 → return it, background-trigger full warm
 * 4. If not found → fall through to full warmEnrichedCache, retry
 *
 * Returns a client object with the same shape as enriched cache entries,
 * or null if the client cannot be found.
 */
export async function resolveClientFast(id: string, userEmail: string): Promise<any | null> {
  // 1. Check warm cache
  const cached = getCachedClient(id, userEmail);
  if (cached) return cached;

  // Not a SF user or MuleSoft disabled — nothing to resolve
  if (!isSalesforceUser(userEmail) || !isMulesoftEnabled()) {
    return null;
  }

  const sfUsername = getSalesforceUsername(userEmail);
  const t0 = Date.now();

  try {
    // 2. Fetch SF pages 1–3 in parallel — no Orion, single round-trip
    // Covers 150/508 = ~30% of clients for the same latency as 1 page (~3-5s)
    const FAST_PAGES = 3;
    const fastResults = await Promise.all(
      Array.from({ length: FAST_PAGES }, (_, i) =>
        getLiveHouseholds({ username: sfUsername, pageSize: WARM_PAGE_SIZE, offset: i * WARM_PAGE_SIZE })
          .catch(() => null)
      )
    );

    // Search across all fetched pages for the target client
    for (const sfPage of fastResults) {
      if (!sfPage?.householdAccounts) continue;

      const acct = sfPage.householdAccounts.find((h: any) => h.Id === id);
      if (acct) {
        const details = sfPage.householdDetails || [];
        const detail = details.find((d: any) => d.householdId === acct.Id);
        const client = mapSfAccount(acct, detail);

        logger.info({
          id, elapsed_ms: Date.now() - t0, totalSize: sfPage.totalSize,
          fastPages: FAST_PAGES, coverage: FAST_PAGES * WARM_PAGE_SIZE,
        }, "[Enriched Cache] Fast-path hit");

        // Background: warm the full cache (deduped — won't run twice)
        warmEnrichedCache(userEmail).catch(() => {});

        return client;
      }
    }

    // 3. Not in first 150 — fall through to full warm
    const totalSize = fastResults[0]?.totalSize || 0;
    logger.info({
      id, elapsed_ms: Date.now() - t0, totalSize,
      fastPages: FAST_PAGES, coverage: FAST_PAGES * WARM_PAGE_SIZE,
    }, "[Enriched Cache] Fast-path miss — falling through to full warm");

    const result = await warmEnrichedCache(userEmail);
    if (result) {
      return result.data.find((c: any) => c.id === id) || null;
    }
    return null;

  } catch (err) {
    logger.error({ err: String(err), id, elapsed_ms: Date.now() - t0 }, "[Enriched Cache] Fast-path failed");
    // Fall through to full warm as last resort
    const result = await warmEnrichedCache(userEmail);
    if (result) {
      return result.data.find((c: any) => c.id === id) || null;
    }
    return null;
  }
}

// ── Bounded Member-Email Index ──
// Fetches member emails for top-100 households by AUM.
// Background-only, 30-min TTL, max 5 concurrent.

interface MemberEmailEntry {
  email: string;
  clientId: string;
  name: string;
  aum: number;
  segment: string;
}

interface MemberEmailSnapshot {
  data: MemberEmailEntry[];
  warmedAt: number;
  userEmail: string;
  householdsScanned: number;
  membersFound: number;
}

const MEMBER_EMAIL_TTL = 30 * 60 * 1000; // 30 minutes
const MEMBER_WARM_CONCURRENCY = 5;
const MEMBER_WARM_HOUSEHOLD_COUNT = 100;
const MEMBER_WARM_FAILURE_THRESHOLD = 20; // >20 failures = abort

let _memberEmailCache: MemberEmailSnapshot | null = null;
let _memberWarmingInFlight = false;
let _memberWarmDisabled = false;

export function getMemberEmailIndex(): MemberEmailEntry[] {
  return _memberEmailCache?.data || [];
}

export function isMemberEmailIndexValid(userEmail: string): boolean {
  return !!(
    _memberEmailCache &&
    _memberEmailCache.userEmail === userEmail &&
    Date.now() - _memberEmailCache.warmedAt < MEMBER_EMAIL_TTL
  );
}

/**
 * Warm the bounded member-email index for the top 100 households by AUM.
 *
 * Requires the enriched cache to be warm first (needs household IDs).
 * Runs at most 5 concurrent getHouseholdMembers() calls.
 * Aborts if >20 calls fail. Fire-and-forget safe.
 */
export async function warmMemberEmailIndex(userEmail: string): Promise<void> {
  // Already valid
  if (isMemberEmailIndexValid(userEmail)) return;

  // Disabled for this session (too many failures)
  if (_memberWarmDisabled) return;

  // Already in flight
  if (_memberWarmingInFlight) return;

  // Enriched cache must be warm
  if (!isCacheValid(userEmail)) return;

  // Must be a SF user
  if (!isSalesforceUser(userEmail) || !isMulesoftEnabled()) return;

  _memberWarmingInFlight = true;
  const t0 = Date.now();
  const sfUsername = getSalesforceUsername(userEmail);

  try {
    const cache = getCache()!;
    // Select top 100 by AUM
    const sorted = [...cache.data]
      .sort((a: any, b: any) => (b.totalAum || 0) - (a.totalAum || 0))
      .slice(0, MEMBER_WARM_HOUSEHOLD_COUNT);

    logger.info({
      households: sorted.length,
      topAum: sorted[0]?.totalAum,
      bottomAum: sorted[sorted.length - 1]?.totalAum,
    }, "[Member Email Index] Starting bounded warm");

    // Fetch members with concurrency pool
    const entries: MemberEmailEntry[] = [];
    let failures = 0;
    let totalMembers = 0;

    const queue = [...sorted];
    const inflight: Promise<void>[] = [];

    const processOne = async (household: any) => {
      try {
        // Check enriched cache is still valid mid-warm
        if (!isCacheValid(userEmail)) {
          failures = MEMBER_WARM_FAILURE_THRESHOLD + 1; // force abort
          return;
        }

        const result = await getHouseholdMembers({
          username: sfUsername,
          householdId: household.id,
        });

        for (const member of (result.members || [])) {
          const email = (member.PersonEmail || "").toLowerCase().trim();
          if (email) {
            entries.push({
              email,
              clientId: household.id,
              name: [household.firstName, household.lastName].filter(Boolean).join(" "),
              aum: household.totalAum || 0,
              segment: household.segment || "",
            });
            totalMembers++;
          }
        }
      } catch {
        failures++;
      }
    };

    // Process with bounded concurrency
    for (const household of queue) {
      if (failures > MEMBER_WARM_FAILURE_THRESHOLD) {
        logger.warn({ failures, scanned: sorted.length - queue.length },
          "[Member Email Index] Aborting — too many failures");
        _memberWarmDisabled = true;
        return;
      }

      if (inflight.length >= MEMBER_WARM_CONCURRENCY) {
        await Promise.race(inflight);
        // Remove settled promises
        for (let i = inflight.length - 1; i >= 0; i--) {
          const settled = await Promise.race([inflight[i].then(() => true), Promise.resolve(false)]);
          if (settled) inflight.splice(i, 1);
        }
      }

      const p = processOne(household);
      inflight.push(p);
    }

    // Wait for remaining
    await Promise.all(inflight);

    if (failures > MEMBER_WARM_FAILURE_THRESHOLD) {
      _memberWarmDisabled = true;
      return;
    }

    // Deduplicate: exclude emails that map to multiple households
    const emailToHouseholds = new Map<string, Set<string>>();
    for (const entry of entries) {
      if (!emailToHouseholds.has(entry.email)) {
        emailToHouseholds.set(entry.email, new Set());
      }
      emailToHouseholds.get(entry.email)!.add(entry.clientId);
    }

    const deduped = entries.filter(e => {
      const households = emailToHouseholds.get(e.email);
      return households && households.size === 1;
    });

    // Remove duplicate entries for same email+household (multiple members, same email)
    const seen = new Set<string>();
    const unique = deduped.filter(e => {
      const key = `${e.email}:${e.clientId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    _memberEmailCache = {
      data: unique,
      warmedAt: Date.now(),
      userEmail,
      householdsScanned: sorted.length,
      membersFound: totalMembers,
    };

    logger.info({
      householdsScanned: sorted.length,
      membersFound: totalMembers,
      uniqueEmails: unique.length,
      failures,
      elapsed_ms: Date.now() - t0,
    }, "[Member Email Index] Bounded warm complete");

  } catch (err) {
    logger.error({ err: String(err), elapsed_ms: Date.now() - t0 },
      "[Member Email Index] Warm failed");
  } finally {
    _memberWarmingInFlight = false;
  }
}
