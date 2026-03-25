import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { updateFlag } from "@server/lib/feature-flags";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const { key } = await params;

    const body = await request.json();
    const { enabled, rolloutPercentage } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ message: "enabled must be a boolean" }, { status: 400 });
    }

    if (rolloutPercentage !== undefined && (rolloutPercentage < 0 || rolloutPercentage > 100)) {
      return NextResponse.json({ message: "rolloutPercentage must be 0-100" }, { status: 400 });
    }

    const result = await updateFlag(key, enabled, rolloutPercentage);
    if (!result) {
      return NextResponse.json({ message: "Flag not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err: err }, "[FeatureFlags] POST update error:");
    return NextResponse.json({ message: "Failed to update feature flag" }, { status: 500 });
  }
}
