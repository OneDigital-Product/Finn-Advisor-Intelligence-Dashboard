import { NextResponse } from "next/server";
import { requireAuth, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
} from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";
import { resolveClientIdentity } from "@server/lib/client-identity";
import { resolvePhone } from "@server/lib/resolve-phone";


// Reuse globalThis enriched-clients cache built by GET /api/clients
const g = globalThis as any;
if (!g._enrichedClientsCache) g._enrichedClientsCache = null;
const ENRICHED_CLIENTS_TTL = 10 * 60 * 1000; // 10 minutes

function getCache(): {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
} | null {
  return g._enrichedClientsCache;
}

/** Derive a simple A / B / C tier from AUM. */
function aumTier(aum: number): "A" | "B" | "C" {
  if (aum >= 1_000_000) return "A";
  if (aum >= 250_000) return "B";
  return "C";
}

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/clients/[id]/summary
// Fast Tier-1 endpoint — returns client summary from cache (< 1 s target).
// ---------------------------------------------------------------------------
export async function GET(_request: Request, { params }: RouteContext) {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;
  const { id } = await params;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  const userEmail = session.userEmail;
  const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;

  // ── Client Identity Resolution ──
  const identity = await resolveClientIdentity(id, userEmail);
  const liveSfId = identity.salesforceHouseholdId;

  // -------------------------------------------------------------------------
  // Salesforce / MuleSoft path — only when a live SF household ID is resolved
  // UUIDs without crosswalk mapping skip this entirely
  // -------------------------------------------------------------------------
  if (isSalesforceUser(userEmail) && isMulesoftEnabled() && liveSfId) {
    try {
      // 1. Try enriched-clients cache first (populated by GET /api/clients)
      const cache = getCache();
      const cacheValid =
        cache &&
        cache.userEmail === userEmail &&
        Date.now() - cache.ts < ENRICHED_CLIENTS_TTL;

      if (cacheValid) {
        const hit = cache!.data.find((c: any) => c.id === id);
        if (hit) {
          return NextResponse.json({
            ...buildResponse(hit),
            _identity: { ...identity, dataPath: "cache-hit" as const },
          }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
        }
      }

      // 2. Cache miss — do a SINGLE SF page fetch + Orion value in parallel
      const [sfPage, orionClients] = await Promise.all([
        getLiveHouseholds({
          username: sfUsername!,
          pageSize: 50,
          offset: 0,
        }),
        getOrionClientsValue(),
      ]);

      if (!sfPage?.householdAccounts) {
        return NextResponse.json(
          { error: "Unable to retrieve household data from Salesforce" },
          { status: 502 },
        );
      }

      const acct = sfPage.householdAccounts.find((h: any) => h.Id === id);
      if (!acct) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
      }

      // AUM: Use Orion as source of truth for portfolio/investment AUM.
      // SF financial totals include non-financial assets (real estate, etc.)
      // which causes header vs portfolio section disagreement.
      const sfFinancialAssets = acct.FinServ__TotalFinancialAccounts__c || 0;
      const sfNonFinancialAssets = acct.FinServ__TotalNonfinancialAssets__c || 0;
      const orionAum = matchOrionAum(acct.Name || "", orionClients);
      // Prefer Orion AUM (matches portfolio section). Fall back to SF financial only.
      const totalAum = orionAum > 0 ? orionAum : sfFinancialAssets;

      // Derive detail map for account count
      const details = sfPage.householdDetails || [];
      const detail = details.find((d: any) => d.householdId === acct.Id);
      const accountCount = detail?.financialAccounts?.length || 0;


      const acctName = (acct.Name || "").toUpperCase();
      const acctType = (acct.Type || acct.RecordType?.Name || "").toLowerCase();
      const isBusinessEntity =
        acctType.includes("business") ||
        acctType.includes("corporate") ||
        acctType.includes("organization") ||
        acctType.includes("trust") ||
        /\b(LLC|INC|CORP|LTD|LP|TRUST|FOUNDATION|ESTATE|ASSOC|GROUP|PARTNERS)\b/.test(
          acctName,
        );

      const _resolvedPhone = resolvePhone({
        Phone: acct.Phone,
        Primary_Phone__pc: acct.Primary_Phone__pc,
        PersonMobilePhone: acct.PersonMobilePhone,
      });

      const mapped = {
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
          _resolvedPhone?.number ||
          acct.FinServ__PrimaryContact__r?.Phone ||
          detail?.primaryContact?.Phone ||
          "",
        phoneType: _resolvedPhone?.type || null,
        segment: acct.FinServ__ClientCategory__c || "",
        status: mapSfStatus(acct.FinServ__Status__c || "active"),
        entityType: isBusinessEntity ? "business" : "individual",
        createdDate: acct.CreatedDate || "",
        riskTolerance:
          acct.FinServ__InvestmentObjectives__c ||
          acct.Risk_Tolerance__c ||
          detail?.riskTolerance ||
          "moderate",
        occupation:
          acct.PersonTitle ||
          acct.Industry ||
          acct.FinServ__Occupation__c ||
          detail?.occupation ||
          "",
        address: acct.PersonMailingStreet || acct.BillingStreet || "",
        city: acct.PersonMailingCity || acct.BillingCity || "",
        state: acct.PersonMailingState || acct.BillingState || "",
        zip: acct.PersonMailingPostalCode || acct.BillingPostalCode || "",
        reviewFrequency: acct.FinServ__ReviewFrequency__c || "",
        lastReview: acct.FinServ__LastReview__c || "",
        nextReview: acct.FinServ__NextReview__c || "",
        serviceModel: acct.FinServ__ServiceModel__c || "",
        dateOfBirth: acct.PersonBirthdate || acct.Date_of_Birth__c || null,
        annualIncome: acct.Annual_Income__pc || acct.FinServ__AnnualIncome__c || null,
        totalAum,
        nonFinancialAssets: sfNonFinancialAssets,
        totalNetWorth: totalAum + sfNonFinancialAssets,
        aumSource: orionAum > 0 ? "orion" : "salesforce",
        accountCount,
        isLiveData: true as const,
      };

      return NextResponse.json({
        ...buildResponse(mapped),
        _identity: { ...identity, dataPath: "live" as const },
      }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
    } catch (err: any) {
      logger.error({ err }, "[summary] MuleSoft/SF error");
      return NextResponse.json(
        {
          error: "Failed to fetch client summary",
          _errors: [`Salesforce: ${err?.message || 'Unknown error'}`],
          _dataSources: { salesforce: "error", orion: "error" },
        },
        { status: 500 },
      );
    }
  }

  // -------------------------------------------------------------------------
  // Local DB fallback (non-SF users)
  // -------------------------------------------------------------------------
  try {
    const client = await storage.getClient(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Compute AUM and account count from the accounts table (clients table has no AUM column)
    const accounts = await storage.getAccountsByClient(String(client.id));
    const computedAum = accounts.reduce((sum: number, a: any) => sum + (Number(a.totalValue) || 0), 0);
    const computedAccountCount = accounts.length;

    // Also compute from AUM helper for consistency
    const aumMap = await storage.getAumByClient([String(client.id)]);
    const aumData = aumMap.get(String(client.id));
    const finalAum = aumData?.totalAum || computedAum;

    const mapped = {
      id: String(client.id),
      firstName: (client as any).firstName || "",
      lastName: (client as any).lastName || "",
      email: (client as any).email || "",
      phone: (client as any).phone || "",
      segment: (client as any).segment || "C",
      status: (client as any).status || "active",
      entityType: (client as any).entityType || "individual",
      createdDate: (client as any).createdDate || "",
      riskTolerance: (client as any).riskTolerance || "moderate",
      occupation: (client as any).occupation || "",
      dateOfBirth: (client as any).dateOfBirth || null,
      annualIncome: (client as any).annualIncome || (client as any).estimatedAnnualIncome || null,
      totalAum: finalAum,
      accountCount: computedAccountCount,
      isLiveData: false as const,
    };

    return NextResponse.json({
      ...buildResponse(mapped),
      _identity: { ...identity, dataPath: liveSfId ? "local-db" as const : "local-db-uuid-skip" as const },
    }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
  } catch (err: any) {
    logger.error({ err }, "[summary] DB error");
    return NextResponse.json(
      { error: "Failed to fetch client summary" },
      { status: 500 },
    );
  }
} catch (err) {
    logger.error({ err }, "[clients/[id]/summary] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ClientSummaryInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  segment: string;
  status: string;
  entityType: string;
  createdDate: string;
  riskTolerance: string;
  occupation: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  reviewFrequency?: string;
  lastReview?: string;
  nextReview?: string;
  serviceModel?: string;
  totalAum: number;
  currentAUM?: number;
  nonFinancialAssets?: number;
  totalNetWorth?: number;
  aumSource?: string;
  accountCount: number;
  isLiveData: boolean;
  annualIncome?: number | null;
  dateOfBirth?: string | null;
}

function buildResponse(c: ClientSummaryInput) {
  const aum = c.totalAum || c.currentAUM || 0;
  return {
    client: {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      segment: c.segment,
      status: c.status,
      entityType: c.entityType,
      createdDate: c.createdDate,
      riskTolerance: c.riskTolerance,
      occupation: c.occupation,
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      zip: c.zip || "",
      reviewFrequency: c.reviewFrequency || "",
      lastReview: c.lastReview || "",
      nextReview: c.nextReview || "",
      serviceModel: c.serviceModel || "",
      dateOfBirth: c.dateOfBirth || null,
      annualIncome: c.annualIncome || null,
    },
    aum,
    tier: aumTier(aum),
    accountCount: c.accountCount,
    nonFinancialAssets: c.nonFinancialAssets || 0,
    totalNetWorth: c.totalNetWorth || aum,
    aumSource: c.aumSource || "local",
    isLiveData: c.isLiveData,
  };
}

function mapSfStatus(sfStatus: string): string {
  const s = (sfStatus || "").toLowerCase();
  if (s === "active" || s === "client") return "active";
  if (s === "at risk" || s === "at-risk") return "review";
  if (s === "inactive" || s === "closed" || s === "terminated") return "inactive";
  if (s === "prospect" || s === "lead") return "prospect";
  return "active";
}

/** Best-effort name match from SF household name to Orion AUM. */
function matchOrionAum(householdName: string, orionClients: any[]): number {
  const nameLower = householdName.toLowerCase();
  const nameWords = nameLower
    .split(/[\s,&]+/)
    .filter((w: string) => w.length > 2);
  if (nameWords.length === 0) return 0;

  const minScore = nameWords.length >= 2 ? 60 : 30;
  let bestScore = 0;
  let bestAum = 0;

  for (const o of orionClients) {
    const oName = (o.name || "").toLowerCase();
    if (oName === nameLower) return o.totalValue || 0;

    const oWords = new Set(
      oName.split(/[\s,&]+/).filter((w: string) => w.length > 2),
    );
    let score = 0;
    for (const word of nameWords) {
      if (oWords.has(word) || oName.includes(word)) score += 30;
    }
    if (score > bestScore) {
      bestScore = score;
      bestAum = o.totalValue || 0;
    }
  }

  return bestScore >= minScore ? bestAum : 0;
}
