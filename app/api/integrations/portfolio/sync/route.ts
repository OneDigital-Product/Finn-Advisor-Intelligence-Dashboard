import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { getActivePortfolio } from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const portfolio = getActivePortfolio();
    if (!portfolio.isEnabled()) {
      return NextResponse.json(
        { error: `${portfolio.name} portfolio integration not enabled` },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const full = url.searchParams.get("full");
    const accountIds = url.searchParams.get("accountIds");

    const result = await portfolio.syncAllAccounts({
      fullSync: full === "true",
      specificAccountIds: accountIds ? accountIds.split(",") : undefined,
    });

    return NextResponse.json({ success: true, provider: portfolio.name, ...result });
  } catch (err: any) {
    logger.error({ err }, "Portfolio sync error");
    return NextResponse.json({ error: "Portfolio sync failed" }, { status: 500 });
  }
}
