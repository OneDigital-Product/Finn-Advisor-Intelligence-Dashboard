import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getComplianceRiskTiles, getComplianceAccountAlerts } from "@server/integrations/mulesoft/api";

/**
 * GET /api/compliance/orion — Compliance risk dashboard from Orion.
 * Returns risk tiles and account-level compliance alerts.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    if (!isMulesoftEnabled()) {
      return NextResponse.json({ riskTiles: [], accountAlerts: [], source: "unavailable" });
    }

    const [tilesResult, alertsResult] = await Promise.allSettled([
      getComplianceRiskTiles(),
      getComplianceAccountAlerts(),
    ]);

    const riskTiles = tilesResult.status === "fulfilled" ? tilesResult.value : [];
    const accountAlerts = alertsResult.status === "fulfilled" ? alertsResult.value : [];

    return NextResponse.json({
      riskTiles,
      accountAlerts,
      source: riskTiles.length > 0 || accountAlerts.length > 0 ? "orion" : "unavailable",
      riskTileCount: riskTiles.length,
      accountAlertCount: accountAlerts.length,
    });
  } catch (err) {
    logger.error({ err }, "[Compliance Orion] Error fetching compliance data");
    return NextResponse.json({ riskTiles: [], accountAlerts: [], source: "error" });
  }
}
