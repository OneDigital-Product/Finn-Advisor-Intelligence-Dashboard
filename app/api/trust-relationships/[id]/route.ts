import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const rel = await storage.getTrustRelationship(id);
    if (!rel) return NextResponse.json({ message: "Trust relationship not found" }, { status: 404 });
    const trust = await storage.getTrust(rel.trustId);
    if (!trust || trust.advisorId !== auth.session.userId!) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    await storage.deleteTrustRelationship(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
