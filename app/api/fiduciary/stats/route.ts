import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const stats = await storage.getFiduciaryValidationStats(advisor.id);
    return NextResponse.json(stats);
  } catch (error: any) {
    logger.error({ err: error }, "Error fetching stats");
    return NextResponse.json({ message: "Failed to fetch stats" }, { status: 500 });
  }
}
