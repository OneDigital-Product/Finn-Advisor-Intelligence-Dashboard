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
    const fundamentals = await marketDataService.getFundamentals(ticker.toUpperCase());
    if (!fundamentals) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(fundamentals);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
