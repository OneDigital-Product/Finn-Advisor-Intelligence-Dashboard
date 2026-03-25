import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { isOrionEnabled, validateConnection } from "@server/integrations/orion/client";
import { getPortfolioSyncSchedule } from "@server/scheduler";
import { storage } from "@server/storage";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const enabled = isOrionEnabled();
    let authenticated = false;

    if (enabled) {
      authenticated = await validateConnection();
    }

    const syncLogs = await storage.getRecentOrionSyncLogs(10);
    const syncSchedule = getPortfolioSyncSchedule();

    return NextResponse.json({
      enabled,
      authenticated,
      lastSync: syncLogs[0]?.syncedAt || null,
      recentSyncs: syncLogs,
      scheduledSync: {
        enabled: syncSchedule.enabled,
        intervalMs: syncSchedule.intervalMs,
        lastSyncAt: syncSchedule.lastSyncAt,
        nextSyncAt: syncSchedule.nextSyncAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to get Orion status" }, { status: 500 });
  }
}
