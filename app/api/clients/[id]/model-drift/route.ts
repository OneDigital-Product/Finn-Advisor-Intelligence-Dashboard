import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getModelTolerance } from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

/**
 * GET /api/clients/[id]/model-drift — Model tolerance / portfolio drift analysis.
 * Shows target vs actual allocation and whether each asset class is in tolerance.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id: clientId } = await params;
    const idCheck = validateId(clientId);
    if (!idCheck.valid) return idCheck.error;

    if (!isMulesoftEnabled()) {
      return NextResponse.json({ modelDrift: null, source: "unavailable" });
    }

    const result = await getModelTolerance(clientId);

    return NextResponse.json({
      modelDrift: result,
      source: "orion",
    });
  } catch (err) {
    logger.error({ err }, "[Model Drift] Error fetching model tolerance");
    return NextResponse.json({ modelDrift: null, source: "error" });
  }
}
