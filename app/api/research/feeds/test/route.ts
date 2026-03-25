import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { testFeedUrl } from "@server/engines/feed-ingestion-engine";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const urlSchema = z.object({ url: z.string().url().max(2000) });
    const parsed = urlSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid URL", errors: parsed.error.issues }, { status: 400 });
    }
    const result = await testFeedUrl(parsed.data.url);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to test feed URL");
    return NextResponse.json({ message: "Failed to test feed URL" }, { status: 500 });
  }
}
