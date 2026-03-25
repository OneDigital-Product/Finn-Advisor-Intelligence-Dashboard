import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";

// Shared alert status store — import from parent route
// Note: In a serverless environment, this in-memory store won't persist across invocations.
// For production, use a database-backed store.
const alertStatusStore = new Map<string, { status: string; updatedAt: string }>();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { alertId } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { status } = await request.json();

    if (!alertId.startsWith(advisor.id + "-")) {
      return NextResponse.json(
        { error: "Alert does not belong to this advisor" },
        { status: 403 }
      );
    }

    const validStatuses = ["open", "in-progress", "completed", "deferred"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    alertStatusStore.set(alertId, { status, updatedAt: new Date().toISOString() });
    logger.info({ alertId, status }, "[ClientInsights] Alert status updated");

    return NextResponse.json({
      alertId,
      status,
      updatedAt: alertStatusStore.get(alertId)!.updatedAt,
    });
  } catch (err: unknown) {
    logger.error({ err }, "[ClientInsights] Alert status update error");
    return NextResponse.json({ error: "Failed to update alert status" }, { status: 500 });
  }
}
