import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const portfolioValue = parseFloat(url.searchParams.get("portfolioValue") || "") || 1000000;
    const harvestBenefit = parseFloat(url.searchParams.get("harvestBenefit") || "") || 0;

    const report = directIndexingEngine.calculateFeeComparison(portfolioValue, undefined, undefined, undefined, undefined, harvestBenefit);
    return NextResponse.json(report);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Fee comparison error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
