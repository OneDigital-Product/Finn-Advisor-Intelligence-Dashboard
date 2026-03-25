import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const [loginEvents, surveyResponses, healthChecks] = await Promise.all([
      storage.getLoginEvents(30),
      storage.getSurveyResponses(30),
      storage.getHealthChecks(60),
    ]);

    const activeUsersByDay: Record<string, Set<string>> = {};
    for (const event of loginEvents) {
      const day = new Date(event.timestamp).toISOString().split("T")[0];
      if (!activeUsersByDay[day]) activeUsersByDay[day] = new Set();
      activeUsersByDay[day].add(event.userId);
    }
    const activeUsersTrend = Object.entries(activeUsersByDay)
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const npsByDay: Record<string, { sum: number; count: number }> = {};
    for (const resp of surveyResponses) {
      const day = resp.createdAt ? new Date(resp.createdAt).toISOString().split("T")[0] : "unknown";
      if (!npsByDay[day]) npsByDay[day] = { sum: 0, count: 0 };
      npsByDay[day].sum += resp.rating;
      npsByDay[day].count += 1;
    }
    const npsTrend = Object.entries(npsByDay)
      .map(([date, data]) => ({ date, nps: Math.round((data.sum / data.count) * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const uptimeByDay: Record<string, { success: number; total: number }> = {};
    for (const check of healthChecks) {
      const day = check.checkedAt ? new Date(check.checkedAt).toISOString().split("T")[0] : "unknown";
      if (!uptimeByDay[day]) uptimeByDay[day] = { success: 0, total: 0 };
      uptimeByDay[day].total += 1;
      if (check.status === 200) uptimeByDay[day].success += 1;
    }
    const uptimeTrend = Object.entries(uptimeByDay)
      .map(([date, data]) => ({ date, uptime: data.total > 0 ? Math.round((data.success / data.total) * 10000) / 100 : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ activeUsersTrend, npsTrend, uptimeTrend });
  } catch (err: any) {
    logger.error({ err: err }, "[PilotMetrics] Metrics error:");
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
