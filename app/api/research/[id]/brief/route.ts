import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { generateResearchBrief } from "@server/engines/research-engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Advisor not found" }, { status: 403 });

    const { id } = await params;
    const brief = await generateResearchBrief(id, advisor.id);
    return NextResponse.json(brief, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, "Failed to generate research brief");
    if (error instanceof Error && error.message === "Article not found") {
      return NextResponse.json({ message: "Article not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Failed to generate research brief" }, { status: 500 });
  }
}
