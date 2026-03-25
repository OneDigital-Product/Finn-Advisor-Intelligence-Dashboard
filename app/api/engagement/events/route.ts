import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { insertEngagementEventSchema } from "@shared/schema";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const body = await request.json();
    const parsed = insertEngagementEventSchema.safeParse({ ...body, advisorId: advisor.id });
    if (!parsed.success) return NextResponse.json({ error: "Invalid event data", details: parsed.error.issues }, { status: 400 });
    const event = await storage.createEngagementEvent(parsed.data);
    return NextResponse.json(event);
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Create event error:");
    return NextResponse.json({ error: "Failed to create engagement event" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get("limit") || "100"), 500);
    const events = await storage.getEngagementEventsByAdvisor(advisor.id, limit);
    return NextResponse.json({ events });
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Get events error:");
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
