import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { generateFullReport } from "@server/integrations/salesforce/reconciliation";
import { logger } from "@server/lib/logger";

export async function POST() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    if (!isSalesforceEnabled()) {
      return NextResponse.json({ error: "Salesforce integration not enabled" }, { status: 400 });
    }

    const report = await generateFullReport();
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    logger.error({ err }, "API error");
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
