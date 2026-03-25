import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

function parseQueryNum(value: string | null, defaultVal: number): number {
  if (!value) return defaultVal;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultVal : parsed;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const clientId = id;

    let lots = await storage.getTaxLotsByClient(clientId);
    if (lots.length === 0) {
      await directIndexingEngine.generateTaxLotsFromHoldings(clientId);
    }

    const url = new URL(request.url);
    const taxRate = parseQueryNum(url.searchParams.get("taxRate"), 0.37);
    const minLoss = parseQueryNum(url.searchParams.get("minLoss"), 500);

    const harvestable = await directIndexingEngine.identifyHarvestableLots(clientId, taxRate, minLoss);
    return NextResponse.json(harvestable);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Harvestable lots error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
