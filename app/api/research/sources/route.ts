import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { RESEARCH_SOURCES } from "@server/engines/research-engine";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  return NextResponse.json(RESEARCH_SOURCES);
} catch (err) {
    logger.error({ err }, "[research/sources] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
