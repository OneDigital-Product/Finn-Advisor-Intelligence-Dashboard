import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const alert = await storage.markAlertRead(id, advisor.id);
    if (!alert) return NextResponse.json({ message: "Alert not found" }, { status: 404 });
    return NextResponse.json(alert);
  } catch (err) {
    logger.error({ err: err }, "[Tasks] alert mark-read failed");
    return NextResponse.json({ message: "Failed to mark alert as read" }, { status: 500 });
  }
}
