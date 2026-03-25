import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const outcome = url.searchParams.get("outcome") || undefined;
    const clientId = url.searchParams.get("clientId") || undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const logs = await storage.getFiduciaryValidationLogs({
      advisorId: advisor.id,
      clientId,
      outcome,
      limit,
      offset,
    });

    const stats = await storage.getFiduciaryValidationStats(advisor.id);

    return NextResponse.json({ logs, stats });
  } catch (error: any) {
    logger.error({ err: error }, "Error fetching audit log");
    return NextResponse.json({ message: "Failed to fetch audit log" }, { status: 500 });
  }
}
