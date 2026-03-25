import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { isSalesforceEnabled, validateConnection } from "@server/integrations/salesforce/client";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const enabled = isSalesforceEnabled();
    let authenticated = false;

    if (enabled) {
      authenticated = await validateConnection();
    }

    const syncLogs = await storage.getRecentSalesforceSyncLogs(10);

    return NextResponse.json({
      enabled,
      authenticated,
      syncEnabled: process.env.SALESFORCE_SYNC_ENABLED === "true",
      lastSync: syncLogs[0]?.syncedAt || null,
      recentSyncs: syncLogs,
    });
  } catch (err: any) {
    logger.error({ err }, "Salesforce status error");
    return NextResponse.json({ error: "Failed to get Salesforce status" }, { status: 500 });
  }
}
