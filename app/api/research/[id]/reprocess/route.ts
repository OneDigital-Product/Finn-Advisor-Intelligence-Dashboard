import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { reprocessArticle } from "@server/engines/research-engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const article = await reprocessArticle(id);
    if (!article) return NextResponse.json({ message: "Article not found" }, { status: 404 });
    return NextResponse.json(article);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to reprocess research article");
    return NextResponse.json({ message: "Failed to reprocess research article" }, { status: 500 });
  }
}
