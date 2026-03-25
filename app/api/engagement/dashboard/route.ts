import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const [scores, signals, actions, events] = await Promise.all([
      storage.getEngagementScoresByAdvisor(advisor.id), storage.getActiveIntentSignals(advisor.id),
      storage.getNextBestActions(advisor.id, "pending"), storage.getEngagementEventsByAdvisor(advisor.id, 50),
    ]);
    const clients = await storage.getClients(advisor.id);
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const enrichedScores = scores.map(s => ({ ...s, clientName: (() => { const c = clientMap.get(s.clientId); return c ? `${c.firstName} ${c.lastName}` : "Unknown"; })(), segment: clientMap.get(s.clientId)?.segment || "C" }));
    const enrichedSignals = signals.map(s => ({ ...s, clientName: (() => { const c = clientMap.get(s.clientId); return c ? `${c.firstName} ${c.lastName}` : "Unknown"; })() }));
    const enrichedActions = actions.map(a => ({ ...a, clientName: (() => { const c = clientMap.get(a.clientId); return c ? `${c.firstName} ${c.lastName}` : "Unknown"; })(), segment: clientMap.get(a.clientId)?.segment || "C" }));
    const enrichedEvents = events.map(e => ({ ...e, clientName: (() => { const c = clientMap.get(e.clientId); return c ? `${c.firstName} ${c.lastName}` : "Unknown"; })() }));

    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc.compositeScore, 0) / scores.length) : 0;

    return NextResponse.json({
      summary: { avgEngagementScore: avgScore, highEngagement: scores.filter(s => s.compositeScore >= 70).length, lowEngagement: scores.filter(s => s.compositeScore < 30).length, activeSignals: signals.length, pendingActions: actions.length, totalEvents: events.length },
      scores: enrichedScores, signals: enrichedSignals, actions: enrichedActions, recentEvents: enrichedEvents,
    }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Dashboard error:");
    return NextResponse.json({ error: "Failed to fetch engagement dashboard" }, { status: 500 });
  }
}
