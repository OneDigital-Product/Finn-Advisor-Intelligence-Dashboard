import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const clientId = id;

    const url = new URL(request.url);
    const taxRate = parseFloat(url.searchParams.get("taxRate") || "") || 0.37;
    const portfolioValue = parseFloat(url.searchParams.get("portfolioValue") || "") || 1000000;

    const report = await directIndexingEngine.calculateTaxAlphaComparison(clientId, portfolioValue, taxRate);
    return NextResponse.json(report);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Tax alpha comparison error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
