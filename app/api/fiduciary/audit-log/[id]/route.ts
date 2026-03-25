import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const log = await storage.getFiduciaryValidationLog(id);
    if (!log) return NextResponse.json({ message: "Validation log not found" }, { status: 404 });
    if (log.advisorId && log.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Not authorized to view this log" }, { status: 403 });
    }
    return NextResponse.json(log);
  } catch (error: any) {
    logger.error({ err: error }, "Error fetching validation log");
    return NextResponse.json({ message: "Failed to fetch validation log" }, { status: 500 });
  }
}
