import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getAccountTaxLots,
  getClientAccounts,
} from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

/**
 * GET /api/clients/[id]/tax-lots — Tax lot data from Orion for a client's accounts.
 *
 * Optional query param: ?accountId=123 to scope to a specific account.
 * If accountId is provided, fetches tax lots for that account only;
 * otherwise fetches all accounts for the client and retrieves tax lots in parallel.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: clientId } = await params;
  const idCheck = validateId(clientId);
  if (!idCheck.valid) return idCheck.error;

  if (!isMulesoftEnabled()) {
    return NextResponse.json({ taxLots: [], source: "unavailable" });
  }

  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId");

  try {
    let allLots;

    if (accountId) {
      allLots = await getAccountTaxLots(accountId);
    } else {
      const accounts = await getClientAccounts(clientId);
      const results = await Promise.allSettled(
        accounts.map((account: any) => getAccountTaxLots(account.id))
      );
      allLots = results
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
    }

    return NextResponse.json({
      taxLots: allLots,
      count: allLots.length,
      source: "orion",
    });
  } catch (err: any) {
    logger.error({ err }, "[Tax Lots] Failed to fetch tax lots");
    return NextResponse.json({
      taxLots: [],
      count: 0,
      source: "error",
    });
  }
}
