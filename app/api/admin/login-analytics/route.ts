import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "") || 90;
    const events = await storage.getLoginEvents(days);
    return NextResponse.json(events);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
