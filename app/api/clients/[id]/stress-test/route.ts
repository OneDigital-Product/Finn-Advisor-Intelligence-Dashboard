import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getStressTest, getRiskProfile } from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/stress-test
 * Returns Hidden Levers stress test scenarios and risk profile data for a client.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id: clientId } = await params;

    const idCheck = validateId(clientId);
    if (!idCheck.valid) return idCheck.error;

    if (!isMulesoftEnabled()) {
      return NextResponse.json({
        stressTest: [],
        riskProfile: null,
        source: "unavailable",
      });
    }

    const [stressTestResult, riskProfileResult] = await Promise.allSettled([
      getStressTest(clientId),
      getRiskProfile(clientId),
    ]);

    const stressTest =
      stressTestResult.status === "fulfilled" ? stressTestResult.value : [];
    const riskProfile =
      riskProfileResult.status === "fulfilled" ? riskProfileResult.value : null;

    if (stressTestResult.status === "rejected") {
      logger.error(
        { err: stressTestResult.reason, clientId },
        "[StressTest] Failed to fetch stress test scenarios"
      );
    }
    if (riskProfileResult.status === "rejected") {
      logger.error(
        { err: riskProfileResult.reason, clientId },
        "[StressTest] Failed to fetch risk profile"
      );
    }

    return NextResponse.json({
      stressTest,
      riskProfile,
      source: "orion",
    });
  } catch (err) {
    logger.error({ err }, "[StressTest] Unexpected error");
    return NextResponse.json({
      stressTest: [],
      riskProfile: null,
      source: "error",
    });
  }
}
