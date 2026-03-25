import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { VALIDATION_MODULES } from "@server/engines/submission-validator";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    return NextResponse.json(VALIDATION_MODULES);
  } catch (err: any) {
    logger.error({ err: err }, "[Validation] Modules error:");
    return NextResponse.json({ error: "Failed to fetch validation modules" }, { status: 500 });
  }
}
