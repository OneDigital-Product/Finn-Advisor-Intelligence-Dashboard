import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const milestones = await storage.getExitPlanMilestones(id);
    return NextResponse.json(milestones);
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
