import { NextResponse } from "next/server";
import { requireAuth, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { logger } from "@server/lib/logger";
import { resolveClientIdentity } from "@server/lib/client-identity";
import { resolvePhone } from "@server/lib/resolve-phone";
import { getCachedClient, resolveClientFast, isCacheValid } from "@server/lib/enriched-clients-cache";

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
      // Fast-path: try cache hit → SF page 1 → full warm fallback
      // Avoids 24s full-warm cost when client is on page 1 (~2-5s instead)
      const hit = await resolveClientFast(id, userEmail!);

      if (hit) {
        return NextResponse.json({
          ...buildResponse(hit),
          _identity: { ...identity, dataPath: isCacheValid(userEmail!) ? "cache-hit" as const : "fast-resolve" as const },
        }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
      }

      // Client not found after full warm — genuine 404
      return NextResponse.json(
        { error: "Client not found in Salesforce households" },
        { status: 404 },
      );
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
