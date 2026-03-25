import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { getActivePortfolio } from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

export async function POST() {
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

    const report = await portfolio.reconcile();
    return NextResponse.json({ success: true, provider: portfolio.name, report });
  } catch (err: any) {
    logger.error({ err }, "Portfolio reconciliation error");
    return NextResponse.json({ error: "Portfolio reconciliation failed" }, { status: 500 });
  }
}
