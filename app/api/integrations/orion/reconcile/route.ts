import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { isOrionEnabled } from "@server/integrations/orion/client";
import { reconcileAccounts } from "@server/integrations/orion/reconciliation";
import { logger } from "@server/lib/logger";

export async function POST() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    if (!isOrionEnabled()) {
      return NextResponse.json({ error: "Orion integration not enabled" }, { status: 400 });
    }

    const report = await reconcileAccounts();
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    logger.error({ err }, "API error");
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
