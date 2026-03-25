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
    const annualIncome = parseFloat(url.searchParams.get("annualIncome") || "") || 500000;
    const filingStatus = url.searchParams.get("filingStatus") || "married_filing_jointly";

    const context = await directIndexingEngine.assessClientTaxContext(clientId, annualIncome, filingStatus);
    return NextResponse.json(context);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Tax context error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
