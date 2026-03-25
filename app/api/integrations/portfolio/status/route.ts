import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { getActivePortfolio, getActivePortfolioProvider } from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const portfolio = getActivePortfolio();
    const enabled = portfolio.isEnabled();
    let authenticated = false;
    if (enabled) {
      authenticated = await portfolio.validateConnection();
    }
    return NextResponse.json({
      provider: getActivePortfolioProvider(),
      name: portfolio.name,
      enabled,
      authenticated,
    });
  } catch (err: any) {
    logger.error({ err }, "Portfolio status error");
    return NextResponse.json({ error: "Failed to get portfolio status" }, { status: 500 });
  }
}
