import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getRebalanceProposal } from "@server/integrations/mulesoft/api";

/**
 * GET /api/clients/[id]/rebalance — Generate rebalance proposal for a client's accounts.
 * Query params: ?modelId=123&taxSensitive=true
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId } = await params;

    if (!isMulesoftEnabled()) {
      return NextResponse.json({ proposals: [], source: "unavailable" });
    }

    const url = new URL(request.url);
    const modelId = url.searchParams.get("modelId") ? Number(url.searchParams.get("modelId")) : undefined;
    const taxSensitive = url.searchParams.get("taxSensitive") === "true";

    // Get Orion account IDs for this client
    const accounts = await storage.getAccountsByClient(clientId);
    const orionAccountIds = accounts
      .map((a: any) => Number(a.orionAccountId || a.externalOrionId))
      .filter((id: number) => !isNaN(id) && id > 0);

    if (orionAccountIds.length === 0) {
      return NextResponse.json({ proposals: [], source: "no_orion_accounts" });
    }

    const proposals = await getRebalanceProposal(orionAccountIds, { modelId, taxSensitive });

    return NextResponse.json({
      proposals,
      source: proposals.length > 0 ? "orion" : "unavailable",
      count: proposals.length,
      accountCount: orionAccountIds.length,
    });
  } catch (err) {
    logger.error({ err }, "[Rebalance] Error generating rebalance proposal");
    return NextResponse.json({ proposals: [], source: "error" });
  }
}
