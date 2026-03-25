import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Advisor not found" }, { status: 403 });

    const { id } = await params;
    const briefs = await storage.getResearchBriefsByArticle(id, advisor.id);
    return NextResponse.json(briefs);
  } catch (error: unknown) {
    logger.error({ err: error }, "Failed to fetch article briefs");
    return NextResponse.json({ message: "Failed to fetch article briefs" }, { status: 500 });
  }
}
