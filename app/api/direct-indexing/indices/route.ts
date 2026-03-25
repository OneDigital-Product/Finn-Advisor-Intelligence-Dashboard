import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const indices = directIndexingEngine.getAvailableIndices();
    return NextResponse.json(indices);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Indices error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
