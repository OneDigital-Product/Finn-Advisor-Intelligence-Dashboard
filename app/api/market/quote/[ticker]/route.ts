import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { marketDataService } from "@server/market-data";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { ticker } = await params;
    const quote = await marketDataService.getQuote(ticker.toUpperCase());
    if (!quote) return NextResponse.json({ message: "Quote not found" }, { status: 404 });
    return NextResponse.json(quote);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
