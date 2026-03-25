import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getClientTransactions,
  getAccountTransactions,
} from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

/**
 * GET /api/clients/[id]/transactions — Transaction history (buys, sells, dividends, transfers).
 *
 * Optional query param: ?accountId=123 to scope to a specific account.
 * If accountId is provided, fetches account-level transactions; otherwise fetches client-level.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const clientId = params.id;
  const idCheck = validateId(clientId);
  if (!idCheck.valid) return idCheck.error;

  if (!isMulesoftEnabled()) {
    return NextResponse.json({ transactions: [], source: "unavailable" });
  }

  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId");

  try {
    const result = accountId
      ? await getAccountTransactions(accountId)
      : await getClientTransactions(clientId);

    return NextResponse.json({
      transactions: result,
      count: result.length,
      source: "orion",
    });
  } catch (err) {
    logger.error({ err, clientId }, "[Transactions] Failed to fetch transaction history");
    return NextResponse.json({ transactions: [], count: 0, source: "error" });
  }
}
