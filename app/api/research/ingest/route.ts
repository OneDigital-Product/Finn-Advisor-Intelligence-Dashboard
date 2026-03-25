import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { ingestResearchArticle } from "@server/engines/research-engine";

const ingestSchema = z.object({
  source: z.string().min(1).max(200),
  sourceUrl: z.string().url().max(2000).optional().or(z.literal("")),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100000),
  publishedAt: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = ingestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const { source, sourceUrl, title, content, publishedAt } = parsed.data;
    const article = await ingestResearchArticle({
      source,
      sourceUrl: sourceUrl || undefined,
      title,
      content,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
    });
    return NextResponse.json(article, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to ingest research article");
    return NextResponse.json({ message: "Failed to ingest research article" }, { status: 500 });
  }
}
