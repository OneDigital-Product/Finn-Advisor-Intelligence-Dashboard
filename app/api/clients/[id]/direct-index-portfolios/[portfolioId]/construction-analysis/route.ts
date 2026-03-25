import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; portfolioId: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId, portfolioId } = await params;

    const portfolio = await storage.getDirectIndexPortfolio(portfolioId);
    if (!portfolio) return NextResponse.json({ message: "Portfolio not found" }, { status: 404 });
    if (portfolio.clientId !== clientId) {
      return NextResponse.json({ message: "Portfolio does not belong to this client" }, { status: 403 });
    }

    const url = new URL(request.url);
    const esgExclusions = url.searchParams.get("esgExclusions")
      ? url.searchParams.get("esgExclusions")!.split(",")
      : [];

    const analysis = await directIndexingEngine.analyzePortfolioConstruction(portfolioId, esgExclusions);
    return NextResponse.json(analysis);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Construction analysis error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
