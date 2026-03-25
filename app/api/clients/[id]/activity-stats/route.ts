import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

/**
 * GET /api/clients/[id]/activity-stats
 *
 * Lightweight endpoint returning ONLY counts for the above-fold stat bar.
 * Uses local DB queries only (no Orion/MuleSoft) — fast and cheap.
 * Replaces the need for the monolithic /api/clients/[id] on initial page load.
 */
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  try {
    // Lightweight DB queries — no external API calls
    const [tasks, activities] = await Promise.all([
      storage.getTasksByClient(id).catch(() => []),
      storage.getActivities(id).catch(() => []),
    ]);

    const openTaskCount = tasks.filter((t: any) => t.status !== "completed" && t.status !== "done").length;
    const staleOppCount = 0; // Opportunities require SF query — defer to monolithic
    const upcomingEventCount = activities.filter((a: any) => {
      if (!a.startTime) return false;
      const start = new Date(a.startTime);
      const now = new Date();
      return start > now && start < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length;
    const openCaseCount = 0; // Cases require SF query — defer to monolithic

    return NextResponse.json({
      openTaskCount,
      staleOppCount,
      upcomingEventCount,
      openCaseCount,
      _source: "local-db",
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    });
  } catch (err) {
    logger.error({ err }, "[activity-stats] GET failed");
    return NextResponse.json({ openTaskCount: 0, staleOppCount: 0, upcomingEventCount: 0, openCaseCount: 0 });
  }
}
