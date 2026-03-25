import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { marketDataService } from "@server/market-data";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { ticker } = await params;
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "1Y";
    const interval = url.searchParams.get("interval") || "daily";
    const data = await marketDataService.getHistorical(
      ticker.toUpperCase(),
      period as any,
      interval as any
    );
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
