import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const clientId = id;

    const tracker = await directIndexingEngine.getWashSaleTracker(clientId);
    return NextResponse.json(tracker);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Wash sale tracker error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
