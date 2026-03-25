import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { processFeed } from "@server/engines/feed-ingestion-engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const feed = await storage.getResearchFeed(id);
    if (!feed) return NextResponse.json({ message: "Feed not found" }, { status: 404 });
    const result = await processFeed(feed);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch feed");
    return NextResponse.json({ message: "Failed to fetch feed" }, { status: 500 });
  }
}
