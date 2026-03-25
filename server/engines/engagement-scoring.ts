import { storage } from "../storage";
import { logger } from "../lib/logger";
import type { InsertEngagementScore } from "@shared/schema";

const EVENT_TYPE_WEIGHTS: Record<string, number> = {
  email_open: 5,
  email_click: 10,
  webinar_attended: 20,
  webinar_registered: 10,
  content_download: 15,
  website_visit: 3,
  pricing_page_view: 25,
  form_submission: 20,
  meeting_attended: 30,
  phone_call: 15,
  social_interaction: 5,
};

export async function computeEngagementScore(clientId: string, advisorId: string): Promise<InsertEngagementScore> {
  const events = await storage.getEngagementEventsByClient(clientId, 200);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  let frequencyScore = 0;
  let recencyScore = 0;
  let diversityScore = 0;
  const channelSet = new Set<string>();
  const typeSet = new Set<string>();

  for (const event of events) {
    const age = now - new Date(event.occurredAt).getTime();
    const weight = EVENT_TYPE_WEIGHTS[event.eventType] || 5;

    let recencyMultiplier = 1;
    if (age < 7 * day) recencyMultiplier = 3;
    else if (age < 14 * day) recencyMultiplier = 2.5;
    else if (age < 30 * day) recencyMultiplier = 2;
    else if (age < 60 * day) recencyMultiplier = 1.5;
    else if (age < 90 * day) recencyMultiplier = 1;
    else recencyMultiplier = 0.5;

    frequencyScore += weight;
    recencyScore += weight * recencyMultiplier;
    channelSet.add(event.channel);
    typeSet.add(event.eventType);
  }

  diversityScore = Math.min(100, (channelSet.size * 15) + (typeSet.size * 10));

  const maxFreq = 500;
  const maxRecency = 1000;
  frequencyScore = Math.min(100, Math.round((frequencyScore / maxFreq) * 100));
  recencyScore = Math.min(100, Math.round((recencyScore / maxRecency) * 100));

  const compositeScore = Math.round(
    frequencyScore * 0.3 + recencyScore * 0.5 + diversityScore * 0.2
  );

  const recentEvents = events.filter(e => (now - new Date(e.occurredAt).getTime()) < 30 * day);
  const olderEvents = events.filter(e => {
    const age = now - new Date(e.occurredAt).getTime();
    return age >= 30 * day && age < 60 * day;
  });
  const trend = recentEvents.length > olderEvents.length * 1.2 ? "increasing"
    : recentEvents.length < olderEvents.length * 0.8 ? "decreasing"
    : "stable";

  return {
    clientId,
    advisorId,
    compositeScore,
    frequencyScore,
    recencyScore,
    diversityScore,
    trend,
    breakdown: {
      totalEvents: events.length,
      channels: Array.from(channelSet),
      eventTypes: Array.from(typeSet),
      recentCount: recentEvents.length,
      olderCount: olderEvents.length,
    },
    calculatedAt: new Date(),
  };
}

export async function computeAllEngagementScores(advisorId: string): Promise<{ computed: number }> {
  try {
    const clients = await storage.getClients(advisorId);
    let computed = 0;
    for (const client of clients) {
      try {
        const scoreData = await computeEngagementScore(client.id, advisorId);
        await storage.upsertEngagementScore(scoreData);
        computed++;
      } catch (err) {
        logger.error({ err, clientId: client.id }, "[EngagementScoring] Failed for client");
      }
    }
    return { computed };
  } catch (err) {
    logger.error({ err }, "[EngagementScoring] Failed to compute scores");
    throw err;
  }
}
