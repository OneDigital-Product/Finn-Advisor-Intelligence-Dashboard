import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ portfolioId: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { portfolioId } = await params;

    const report = await directIndexingEngine.getTrackingReport(portfolioId);
    if (!report) return NextResponse.json({ message: "Portfolio not found" }, { status: 404 });

    return NextResponse.json(report);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Tracking error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
