import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getAccountRmd } from "@server/integrations/mulesoft/api";

/**
 * GET /api/clients/[id]/rmd — RMD calculations for a client's retirement accounts.
 * Returns Orion RMD data per account when available, empty array otherwise.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId } = await params;

    if (!isMulesoftEnabled()) {
      return NextResponse.json({ rmdCalculations: [], source: "unavailable" });
    }

    // Get client's retirement accounts from local storage
    const accounts = await storage.getAccountsByClient(clientId);
    const retirementTypes = ["ira", "401k", "retirement", "roth", "sep", "simple", "pension"];
    const retirementAccounts = accounts.filter((a: any) => {
      const type = (a.accountType || "").toLowerCase();
      return retirementTypes.some((t) => type.includes(t));
    });

    const orionAccountIds = retirementAccounts
      .map((a: any) => a.orionAccountId || a.externalOrionId)
      .filter(Boolean);

    if (orionAccountIds.length === 0) {
      return NextResponse.json({ rmdCalculations: [], source: "no_retirement_accounts" });
    }

    const results = await Promise.allSettled(
      orionAccountIds.map((id: string) => getAccountRmd(id))
    );

    const rmdCalculations = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value != null)
      .map((r) => r.value);

    return NextResponse.json({
      rmdCalculations,
      source: rmdCalculations.length > 0 ? "orion" : "unavailable",
      count: rmdCalculations.length,
    });
  } catch (err) {
    logger.error({ err }, "[RMD] Error fetching RMD calculations");
    return NextResponse.json({ rmdCalculations: [], source: "error" });
  }
}
