import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const feedSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  category: z.string().max(100).optional().or(z.literal("")),
  fetchIntervalMinutes: z.coerce.number().int().min(15).max(10080).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const feeds = await storage.getResearchFeeds();
    return NextResponse.json(feeds);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch research feeds");
    return NextResponse.json({ message: "Failed to fetch research feeds" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = feedSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const feed = await storage.createResearchFeed({
      name: parsed.data.name,
      url: parsed.data.url,
      category: parsed.data.category || null,
      fetchIntervalMinutes: parsed.data.fetchIntervalMinutes || 360,
      status: parsed.data.status || "active",
    });
    return NextResponse.json(feed, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to create research feed");
    return NextResponse.json({ message: "Failed to create research feed" }, { status: 500 });
  }
}
