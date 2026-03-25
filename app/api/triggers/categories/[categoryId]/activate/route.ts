import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function PUT(_request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const { categoryId } = await params;

    await storage.toggleTriggerCategoryActive(categoryId, true);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    logger.error({ err: err }, "[Triggers] Activate category error:");
    return NextResponse.json({ error: "Failed to activate category" }, { status: 500 });
  }
}
