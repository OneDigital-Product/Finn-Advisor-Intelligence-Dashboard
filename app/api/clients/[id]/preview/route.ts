import { NextResponse } from "next/server";
import { requireAuth, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getClientsValue as getOrionClientsValue,
  getClientAccounts as getOrionClientAccounts,
  getClientAssets as getOrionClientAssets,
  getHouseholdMembers as getLiveHouseholdMembers,
} from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";
import { resolvePhone } from "@server/lib/resolve-phone";


// Reuse globalThis enriched-clients cache built by GET /api/clients
const g = globalThis as any;
if (!g._enrichedClientsCache) g._enrichedClientsCache = null;
const ENRICHED_CLIENTS_TTL = 10 * 60 * 1000; // 3 minutes

function getCache(): {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
} | null {
  return g._enrichedClientsCache;
}

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Asset class bucket mapping
// ---------------------------------------------------------------------------

function classifyAsset(assetClass: string): "EQ" | "FI" | "ALT" | "CA" {
  const cls = (assetClass || "").toLowerCase();
  if (
    cls.includes("equity") ||
    cls.includes("stock") ||
    cls.includes("common")
  )
    return "EQ";
  if (cls.includes("fixed") || cls.includes("bond")) return "FI";
  if (
    cls.includes("cash") ||
    cls.includes("money market") ||
    cls.includes("equivalent")
  )
    return "CA";
  return "ALT";
}

function isCashAsset(assetClass: string): boolean {
  const cls = (assetClass || "").toLowerCase();
  return cls.includes("cash") || cls.includes("money market");
}

// ---------------------------------------------------------------------------
// Fuzzy name matching (same logic as summary/portfolio routes)
// ---------------------------------------------------------------------------

function findOrionMatch(
  householdName: string,
  orionClients: any[],
): any | null {
  const nameLower = householdName.toLowerCase();
  const nameWords = nameLower
    .split(/[\s,&]+/)
    .filter((w: string) => w.length > 2);
  if (nameWords.length === 0) return null;

  const minScore = nameWords.length >= 2 ? 60 : 30;
  let bestScore = 0;
  let bestMatch: any = null;

  for (const o of orionClients) {
    const oName = (o.name || "").toLowerCase();
    if (oName === nameLower) return o;

    const oWords = new Set(
      oName.split(/[\s,&]+/).filter((w: string) => w.length > 2),
    );
    let score = 0;
    for (const word of nameWords) {
      if (oWords.has(word) || oName.includes(word)) score += 30;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = o;
    }
  }

  return bestScore >= minScore ? bestMatch : null;
}

// ---------------------------------------------------------------------------
// Snapshot generation
// ---------------------------------------------------------------------------

function buildSnapshot(params: {
  allocation: Record<string, number>;
  accountCount: number;
  primaryCustodian: string;
  memberCount: number;
  cashPercentage: number;
  openCases: number;
  topHolding: { ticker: string; percentage: number } | null;
}): string {
  const parts: string[] = [];

  // Allocation characterization
  if (params.allocation.EQ > 60) {
    parts.push(`Equity-heavy at ${params.allocation.EQ}%`);
  } else if (params.allocation.FI > 40) {
    parts.push(
      `Conservative with ${params.allocation.FI}% fixed income`,
    );
  } else {
    parts.push("Balanced allocation");
  }

  // Account + custodian
  parts.push(
    `${params.accountCount} account${params.accountCount !== 1 ? "s" : ""}` +
      (params.primaryCustodian
        ? ` at ${params.primaryCustodian}`
        : ""),
  );

  // Members
  parts.push(
    `${params.memberCount} household member${params.memberCount !== 1 ? "s" : ""}`,
  );

  // High cash
  if (params.cashPercentage > 10) {
    parts.push("High cash position \u2014 consider deployment");
  }

  // Open cases
  if (params.openCases > 0) {
    parts.push(
      `${params.openCases} open case${params.openCases !== 1 ? "s" : ""}`,
    );
  }

  // Concentrated position
  if (params.topHolding && params.topHolding.percentage > 15) {
    parts.push(
      `Concentrated position in ${params.topHolding.ticker} (${params.topHolding.percentage}%)`,
    );
  }

  return parts.join(". ") + ".";
}

// ---------------------------------------------------------------------------
// Default response shape (used when sub-calls fail)
// ---------------------------------------------------------------------------

function defaultResponse() {
  return {
    accounts: { count: 0, primaryCustodian: "", list: [] as any[] },
    holdings: {
      count: 0,
      topHolding: { ticker: "", value: 0 },
      cashPosition: { value: 0, percentage: 0 },
    },
    allocation: { EQ: 0, FI: 0, ALT: 0, CA: 0 },
    members: { count: 0, list: [] as any[] },
    riskTolerance: "Moderate",
    occupation: "",
    financialGoals: "",
    snapshot: "",
  };
}

// ---------------------------------------------------------------------------
// GET /api/clients/[id]/preview
// Combined portfolio + members data for client list expandable row preview.
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

  // -------------------------------------------------------------------------
  // Salesforce / MuleSoft path
  // -------------------------------------------------------------------------
  if (isSalesforceUser(userEmail) && isMulesoftEnabled()) {
    try {
      // 1. Find client from enriched cache
      const cache = getCache();
      const cacheValid =
        cache &&
        cache.userEmail === userEmail &&
        Date.now() - cache.ts < ENRICHED_CLIENTS_TTL;

      let clientHit = cacheValid
        ? cache!.data.find((c: any) => c.id === id)
        : null;

      // Cache miss — fall back to direct DB lookup so we still have a name for Orion matching
      if (!clientHit) {
        const dbClient = await storage.getClient(id);
        if (dbClient) {
          clientHit = dbClient as any;
        }
      }

      const householdName = clientHit
        ? [clientHit.firstName, clientHit.lastName].filter(Boolean).join(" ")
        : "Unknown";

      // 2. Find Orion match via fuzzy name matching
      const orionClients = await getOrionClientsValue();
      const bestMatch = findOrionMatch(householdName, orionClients);

      // 3. Fetch accounts, assets, and members in parallel
      const orionId = bestMatch?.id;
      const hasOrionId = orionId && !isNaN(Number(orionId));

      const [accountsResult, assetsResult, membersResult] =
        await Promise.allSettled([
          hasOrionId
            ? getOrionClientAccounts(orionId)
            : Promise.resolve([]),
          hasOrionId
            ? getOrionClientAssets(orionId)
            : Promise.resolve([]),
          getLiveHouseholdMembers({
            username: sfUsername!,
            householdId: id,
          }).catch(() => null),
        ]);

      const orionAccounts: any[] =
        accountsResult.status === "fulfilled" ? accountsResult.value : [];
      const orionAssets: any[] =
        assetsResult.status === "fulfilled" ? assetsResult.value : [];
      const membersData =
        membersResult.status === "fulfilled" ? membersResult.value : null;

      // 4. Filter active accounts with value > 0
      const activeAccounts = orionAccounts.filter(
        (a: any) => (a.totalValue || 0) > 0 && a.isActive !== false,
      );

      // 5. Find primary custodian (most common)
      const custodianCounts = new Map<string, number>();
      for (const a of activeAccounts) {
        const cust = a.custodian || "Unknown";
        custodianCounts.set(cust, (custodianCounts.get(cust) || 0) + 1);
      }
      let primaryCustodian = "";
      let maxCustCount = 0;
      for (const [cust, count] of custodianCounts) {
        if (count > maxCustCount) {
          maxCustCount = count;
          primaryCustodian = cust;
        }
      }

      // 6. Compute allocation buckets
      const buckets: Record<string, number> = { EQ: 0, FI: 0, ALT: 0, CA: 0 };
      let totalAssetValue = 0;
      for (const asset of orionAssets) {
        const cv = asset.currentValue || 0;
        totalAssetValue += cv;
        const bucket = classifyAsset(asset.assetClass || asset.productType || "");
        buckets[bucket] += cv;
      }

      const allocation: Record<string, number> = {
        EQ:
          totalAssetValue > 0
            ? Math.round((buckets.EQ / totalAssetValue) * 100)
            : 0,
        FI:
          totalAssetValue > 0
            ? Math.round((buckets.FI / totalAssetValue) * 100)
            : 0,
        ALT:
          totalAssetValue > 0
            ? Math.round((buckets.ALT / totalAssetValue) * 100)
            : 0,
        CA:
          totalAssetValue > 0
            ? Math.round((buckets.CA / totalAssetValue) * 100)
            : 0,
      };

      // 7. Top holding (highest currentValue with a ticker)
      let topHolding = { ticker: "", value: 0 };
      let topHoldingPct = 0;
      for (const asset of orionAssets) {
        const ticker = (asset.ticker || "").trim();
        const cv = asset.currentValue || 0;
        if (ticker && cv > topHolding.value) {
          topHolding = { ticker, value: cv };
          topHoldingPct =
            totalAssetValue > 0
              ? Math.round((cv / totalAssetValue) * 100)
              : 0;
        }
      }

      // 8. Cash position (assets where assetClass contains Cash or Money Market)
      let cashValue = 0;
      for (const asset of orionAssets) {
        if (isCashAsset(asset.assetClass || asset.productType || "")) {
          cashValue += asset.currentValue || 0;
        }
      }
      const cashPercentage =
        totalAssetValue > 0
          ? Math.round((cashValue / totalAssetValue) * 100)
          : 0;

      // 9. Map accounts for response
      const accountList = activeAccounts.map((a: any) => ({
        id: a.id,
        name: a.name || a.accountType || "Investment Account",
        accountNumber: a.accountNumber || "",
        custodian: a.custodian || "Orion",
        balance: a.totalValue || 0,
        accountType: a.registrationType || a.accountType || "",
        status: a.status || "active",
      }));

      // 10. Map members
      const sfMembers: any[] = membersData?.members || [];
      const memberList = sfMembers.map((m: any) => {
        const resolved = resolvePhone(m);
        return {
          firstName: m.FirstName || "",
          lastName: m.LastName || "",
          email: m.PersonEmail || "",
          phone: resolved?.number || m.Phone || "",
          phoneType: resolved?.type || "",
          phoneRaw: resolved?.raw || "",
          annualIncome: m.Annual_Income__pc ?? null,
          interests: m.Interests__pc || "",
          maritalStatus: m.Marital_Status__pc || "",
        };
      });

      // 11. Extract client metadata from cache
      const riskTolerance =
        clientHit?.riskTolerance || clientHit?.Risk_Tolerance__c || "Moderate";
      const occupation =
        clientHit?.occupation || clientHit?.Industry || "";
      const financialGoals =
        clientHit?.financialGoals ||
        clientHit?.FinServ__InvestmentObjectives__c ||
        "";

      // 12. Build AI snapshot
      const snapshot = buildSnapshot({
        allocation,
        accountCount: activeAccounts.length,
        primaryCustodian,
        memberCount: memberList.length || 1,
        cashPercentage,
        openCases: clientHit?.openCases || 0,
        topHolding:
          topHolding.ticker
            ? { ticker: topHolding.ticker, percentage: topHoldingPct }
            : null,
      });

      return NextResponse.json({
        accounts: {
          count: activeAccounts.length,
          primaryCustodian,
          list: accountList,
        },
        holdings: {
          count: orionAssets.length,
          topHolding,
          cashPosition: {
            value: cashValue,
            percentage: cashPercentage,
          },
        },
        allocation,
        members: {
          count: memberList.length,
          list: memberList,
        },
        riskTolerance,
        occupation,
        financialGoals,
        createdDate: clientHit?.createdDate || "",
        reviewFrequency: clientHit?.reviewFrequency || clientHit?.FinServ__ReviewFrequency__c || "",
        lastReview: clientHit?.lastReview || clientHit?.FinServ__LastReview__c || "",
        nextReview: clientHit?.nextReview || clientHit?.FinServ__NextReview__c || "",
        serviceModel: clientHit?.serviceModel || clientHit?.FinServ__ServiceModel__c || "",
        email: clientHit?.email || "",
        phone: clientHit?.phone || "",
        clientSince: clientHit?.createdDate || clientHit?.Client_Since__c || "",
        snapshot,
        isLiveData: true,
      }, {
        headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
      });
    } catch (err: any) {
      logger.error({ err }, "[preview] MuleSoft/SF error");
      return NextResponse.json(
        { error: "Failed to fetch client preview" },
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
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 },
      );
    }

    const c = client as any;

    const response = defaultResponse();
    response.riskTolerance = c.riskTolerance || "Moderate";
    response.occupation = c.occupation || "";
    response.financialGoals = c.financialGoals || "";

    // Attempt to load accounts and holdings from local storage
    try {
      const [accounts, holdings] = await Promise.all([
        storage.getAccountsByClient(client.id),
        storage.getHoldingsByClient(client.id),
      ]);

      // Accounts
      const activeAccounts = accounts.filter(
        (a: any) =>
          (parseFloat(a.balance as string) || 0) > 0 &&
          a.isActive !== false,
      );

      const custodianCounts = new Map<string, number>();
      for (const a of activeAccounts) {
        const cust = (a as any).custodian || "Unknown";
        custodianCounts.set(cust, (custodianCounts.get(cust) || 0) + 1);
      }
      let primaryCustodian = "";
      let maxCustCount = 0;
      for (const [cust, count] of custodianCounts) {
        if (count > maxCustCount) {
          maxCustCount = count;
          primaryCustodian = cust;
        }
      }

      response.accounts = {
        count: activeAccounts.length,
        primaryCustodian,
        list: activeAccounts.map((a: any) => ({
          id: a.id,
          name: a.name || a.accountType || "Investment Account",
          accountNumber: a.accountNumber || "",
          custodian: a.custodian || "Unknown",
          balance: parseFloat(a.balance as string) || 0,
          accountType: a.accountType || "",
          status: a.status || "active",
        })),
      };

      // Holdings + allocation
      let totalAssetValue = 0;
      const buckets: Record<string, number> = {
        EQ: 0,
        FI: 0,
        ALT: 0,
        CA: 0,
      };

      for (const h of holdings) {
        const mv = parseFloat((h as any).marketValue || "0");
        totalAssetValue += mv;
        const bucket = classifyAsset(
          (h as any).sector || (h as any).productType || "",
        );
        buckets[bucket] += mv;
      }

      response.allocation = {
        EQ:
          totalAssetValue > 0
            ? Math.round((buckets.EQ / totalAssetValue) * 100)
            : 0,
        FI:
          totalAssetValue > 0
            ? Math.round((buckets.FI / totalAssetValue) * 100)
            : 0,
        ALT:
          totalAssetValue > 0
            ? Math.round((buckets.ALT / totalAssetValue) * 100)
            : 0,
        CA:
          totalAssetValue > 0
            ? Math.round((buckets.CA / totalAssetValue) * 100)
            : 0,
      };

      // Top holding
      let topHolding = { ticker: "", value: 0 };
      let topHoldingPct = 0;
      for (const h of holdings) {
        const ticker = ((h as any).ticker || "").trim();
        const mv = parseFloat((h as any).marketValue || "0");
        if (ticker && mv > topHolding.value) {
          topHolding = { ticker, value: mv };
          topHoldingPct =
            totalAssetValue > 0
              ? Math.round((mv / totalAssetValue) * 100)
              : 0;
        }
      }

      // Cash position
      let cashValue = 0;
      for (const h of holdings) {
        if (
          isCashAsset((h as any).sector || (h as any).productType || "")
        ) {
          cashValue += parseFloat((h as any).marketValue || "0");
        }
      }
      const cashPercentage =
        totalAssetValue > 0
          ? Math.round((cashValue / totalAssetValue) * 100)
          : 0;

      response.holdings = {
        count: holdings.length,
        topHolding,
        cashPosition: { value: cashValue, percentage: cashPercentage },
      };

      // Members — use client as single member for local DB
      response.members = {
        count: 1,
        list: [
          {
            firstName: c.firstName || "",
            lastName: c.lastName || "",
            email: c.email || "",
            phone: c.phone || "",
          },
        ],
      };

      // Build snapshot for local data
      response.snapshot = buildSnapshot({
        allocation: response.allocation,
        accountCount: activeAccounts.length,
        primaryCustodian,
        memberCount: 1,
        cashPercentage,
        openCases: 0,
        topHolding:
          topHolding.ticker
            ? { ticker: topHolding.ticker, percentage: topHoldingPct }
            : null,
      });
    } catch (subErr: any) {
      logger.error({ err: subErr }, "[preview] Local sub-call error");
      // Return what we have with defaults
    }

    return NextResponse.json({
      ...response,
      createdDate: c.createdDate || c.createdAt || "",
      reviewFrequency: c.reviewFrequency || "",
      lastReview: c.lastReview || "",
      nextReview: c.nextReview || "",
      serviceModel: c.serviceModel || "",
      isLiveData: false,
    });
  } catch (err: any) {
    logger.error({ err }, "[preview] DB error");
    return NextResponse.json(
      { error: "Failed to fetch client preview" },
      { status: 500 },
    );
  }
} catch (err) {
    logger.error({ err }, "[clients/[id]/preview] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
