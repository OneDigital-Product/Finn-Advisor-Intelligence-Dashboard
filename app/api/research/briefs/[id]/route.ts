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
    const brief = await storage.getResearchBrief(id);
    if (!brief || brief.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Brief not found" }, { status: 404 });
    }
    return NextResponse.json(brief);
  } catch (error: unknown) {
    logger.error({ err: error }, "Failed to fetch research brief");
    return NextResponse.json({ message: "Failed to fetch research brief" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Advisor not found" }, { status: 403 });

    const { id } = await params;
    const brief = await storage.getResearchBrief(id);
    if (!brief || brief.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Brief not found" }, { status: 404 });
    }
    await storage.deleteResearchBrief(id, advisor.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ err: error }, "Failed to delete research brief");
    return NextResponse.json({ message: "Failed to delete research brief" }, { status: 500 });
  }
}
