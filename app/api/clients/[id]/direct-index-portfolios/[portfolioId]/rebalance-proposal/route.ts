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
    const driftTolerance = parseFloat(url.searchParams.get("driftTolerance") || "") || 1.0;
    const taxRate = parseFloat(url.searchParams.get("taxRate") || "") || 0.37;

    const proposal = await directIndexingEngine.generateRebalanceProposal(portfolioId, clientId, driftTolerance, taxRate);
    if (!proposal) return NextResponse.json({ message: "Portfolio not found or has no value" }, { status: 404 });

    return NextResponse.json(proposal);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Rebalance proposal error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
