import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const article = await storage.getResearchArticle(id);
    if (!article) return NextResponse.json({ message: "Article not found" }, { status: 404 });
    return NextResponse.json(article);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch research article");
    return NextResponse.json({ message: "Failed to fetch research article" }, { status: 500 });
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
    await storage.deleteResearchArticle(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to delete research article");
    return NextResponse.json({ message: "Failed to delete research article" }, { status: 500 });
  }
}
