import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const querySchema = z.object({
  topic: z.string().optional(),
  source: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const raw: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) raw[k] = v;

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid query parameters", errors: parsed.error.issues }, { status: 400 });
    }
    const { topic, source, search, limit, offset } = parsed.data;
    const articles = await storage.getResearchArticles({ topic, source, search, limit, offset });
    return NextResponse.json(articles);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch research articles");
    return NextResponse.json({ message: "Failed to fetch research articles" }, { status: 500 });
  }
}
