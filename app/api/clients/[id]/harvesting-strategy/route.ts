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

    const strategy = await directIndexingEngine.generateHarvestingStrategy(clientId, taxRate);
    return NextResponse.json(strategy);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Harvesting strategy error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
