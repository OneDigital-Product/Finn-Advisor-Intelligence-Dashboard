import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { marketDataService } from "@server/market-data";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    const accounts = await storage.getAccountsByClient(clientId);
    const allHoldings = [];
    for (const acct of accounts) {
      const holdings = await storage.getHoldingsByAccount(acct.id);
      allHoldings.push(...holdings);
    }
    const tickers = [
      ...new Set(allHoldings.map((h) => h.ticker).filter((t) => t !== "CASH")),
    ];
    const [quotes, news] = await Promise.all([
      tickers.length > 0
        ? marketDataService.getQuotes(tickers)
        : Promise.resolve(new Map()),
      tickers.length > 0
        ? marketDataService.getNews(tickers)
        : marketDataService.getNews(),
    ]);
    const quotesObj: Record<string, any> = {};
    quotes.forEach((v, k) => {
      quotesObj[k] = v;
    });
    return NextResponse.json({ quotes: quotesObj, news, tickers });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
