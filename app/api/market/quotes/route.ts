import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { marketDataService } from "@server/market-data";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const tickers = (url.searchParams.get("tickers") || "")
      .split(",")
      .filter(Boolean)
      .map((t) => t.toUpperCase());
    if (tickers.length === 0) return NextResponse.json({});
    const quotes = await marketDataService.getQuotes(tickers);
    const result: Record<string, any> = {};
    quotes.forEach((v, k) => {
      result[k] = v;
    });
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
