import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { RESEARCH_TOPICS } from "@server/engines/research-engine";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  return NextResponse.json(RESEARCH_TOPICS);
} catch (err) {
    logger.error({ err }, "[research/topics] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
