import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { isFeatureEnabled } from "@server/lib/feature-flags";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const session = await getSession();
    const userId = session?.userId;
    const enabled = await isFeatureEnabled(key, userId);
    return NextResponse.json({ key, enabled });
  } catch (err: any) {
    logger.error({ err: err }, "[FeatureFlags] Status check error:");
    return NextResponse.json({ message: "Failed to check flag status" }, { status: 500 });
  }
}
