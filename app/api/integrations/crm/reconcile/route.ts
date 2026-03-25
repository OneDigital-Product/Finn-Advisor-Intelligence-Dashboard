import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { getActiveCRM } from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

export async function POST() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const crm = getActiveCRM();
    if (!crm.isEnabled()) {
      return NextResponse.json(
        { error: `${crm.name} CRM integration not enabled` },
        { status: 400 }
      );
    }

    const report = await crm.reconcile();
    return NextResponse.json({ success: true, provider: crm.name, report });
  } catch (err: any) {
    logger.error({ err }, "CRM reconciliation error");
    return NextResponse.json({ error: "CRM reconciliation failed" }, { status: 500 });
  }
}
