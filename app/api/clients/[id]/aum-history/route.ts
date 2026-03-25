import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getAumOverTime } from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

/**
 * GET /api/clients/[id]/aum-history — Historical AUM time series for sparklines.
 *
 * Returns array of { date, aum, netFlows } from Orion's aumovertime endpoint.
 * Falls back to empty array if Orion is unavailable.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: clientId } = await params;
  const idCheck = validateId(clientId);
  if (!idCheck.valid) return idCheck.error;

  try {
    if (!isMulesoftEnabled()) {
      return NextResponse.json({ aumHistory: [], source: "unavailable" });
    }

    // Try to get the Orion client ID by fuzzy-matching the SF household ID
    // For now, pass the ID directly — if it's a numeric Orion ID it works directly,
    // if it's a SF ID the endpoint will return empty and we fall through gracefully
    const aumHistory = await getAumOverTime(clientId);

    return NextResponse.json({
      aumHistory,
      source: aumHistory.length > 0 ? "orion" : "unavailable",
      count: aumHistory.length,
    });
  } catch (err) {
    logger.error({ err, clientId }, "[AUM History] Failed to fetch AUM over time");
    return NextResponse.json({ aumHistory: [], source: "error" });
  }
}
