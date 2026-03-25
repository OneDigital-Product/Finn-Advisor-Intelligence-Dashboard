import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const flags = await storage.getFeatureFlags();
    return NextResponse.json(flags);
  } catch (err: any) {
    logger.error({ err: err }, "[FeatureFlags] GET error:");
    return NextResponse.json({ message: "Failed to fetch feature flags" }, { status: 500 });
  }
}
