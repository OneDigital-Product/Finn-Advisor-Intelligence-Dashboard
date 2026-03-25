import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; ticker: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId, ticker } = await params;

    const results = await directIndexingEngine.checkWashSaleCompliance(clientId, ticker);
    return NextResponse.json(results);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Wash sale compliance error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
