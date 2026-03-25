import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { isOrionEnabled } from "@server/integrations/orion/client";
import { syncAllAccounts } from "@server/integrations/orion/portfolio-sync";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    if (!isOrionEnabled()) {
      return NextResponse.json({ error: "Orion integration not enabled" }, { status: 400 });
    }

    const url = new URL(request.url);
    const full = url.searchParams.get("full");
    const accountIds = url.searchParams.get("accountIds");

    const result = await syncAllAccounts({
      fullSync: full === "true",
      specificAccountIds: accountIds ? accountIds.split(",") : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err }, "API error");
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
