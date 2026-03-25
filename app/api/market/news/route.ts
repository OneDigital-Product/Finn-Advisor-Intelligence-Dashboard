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
    const news = await marketDataService.getNews(tickers.length > 0 ? tickers : undefined);
    return NextResponse.json(news);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
