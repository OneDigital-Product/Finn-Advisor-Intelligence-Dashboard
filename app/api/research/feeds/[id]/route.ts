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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const feed = await storage.getResearchFeed(id);
    if (!feed) return NextResponse.json({ message: "Feed not found" }, { status: 404 });
    return NextResponse.json(feed);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch research feed");
    return NextResponse.json({ message: "Failed to fetch research feed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const raw = await request.json();
    const parsed = feedSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const feed = await storage.updateResearchFeed(id, parsed.data);
    if (!feed) return NextResponse.json({ message: "Feed not found" }, { status: 404 });
    return NextResponse.json(feed);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to update research feed");
    return NextResponse.json({ message: "Failed to update research feed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await storage.deleteResearchFeed(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to delete research feed");
    return NextResponse.json({ message: "Failed to delete research feed" }, { status: 500 });
  }
}
