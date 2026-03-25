import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const configs = await storage.getDiagnosticConfigs();
    return NextResponse.json(configs.filter((c: any) => c.isActive));
  } catch (err: any) {
    logger.error({ err: err }, "[Diagnostics] Configs error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
