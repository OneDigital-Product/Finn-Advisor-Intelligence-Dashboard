import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { generateClientInsights } from "@server/engines/client-insights-engine";
import { logger } from "@server/lib/logger";

// In-memory alert status store (matches Express behavior)
const alertStatusStore = new Map<string, { status: string; updatedAt: string }>();

// Note: alertStatusStore is used internally; not exported from route file
// If other routes need it, move to a shared module

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const dashboard = await generateClientInsights(advisor.id);

    dashboard.alerts = dashboard.alerts.map((alert: any) => {
      const stored = alertStatusStore.get(alert.id);
      if (stored) {
        return { ...alert, status: stored.status };
      }
      return alert;
    });

    return NextResponse.json(dashboard);
  } catch (err: unknown) {
    logger.error({ err }, "[ClientInsights] Dashboard error");
    return NextResponse.json(
      { error: "Failed to generate client insights dashboard" },
      { status: 500 }
    );
  }
}
