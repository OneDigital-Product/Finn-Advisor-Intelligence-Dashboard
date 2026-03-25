import { storage } from "../storage";
import { logger } from "../lib/logger";
import type { InsertIntentSignal, EngagementEvent } from "@shared/schema";

interface SignalRule {
  signalType: string;
  title: string;
  detect: (events: EngagementEvent[], clientName: string) => { match: boolean; description: string; evidence: any[]; strength: string } | null;
}

const SIGNAL_RULES: SignalRule[] = [
  {
    signalType: "content_binge",
    title: "Content Binge Detected",
    detect: (events, clientName) => {
      const day = 24 * 60 * 60 * 1000;
      const recent = events.filter(e =>
        e.eventType === "content_download" &&
        (Date.now() - new Date(e.occurredAt).getTime()) < 7 * day
      );
      if (recent.length >= 3) {
        return {
          match: true,
          description: `${clientName} downloaded ${recent.length} pieces of content in the last 7 days, suggesting active research.`,
          evidence: recent.map(e => ({ type: e.eventType, subject: e.subject, date: e.occurredAt })),
          strength: recent.length >= 5 ? "high" : "medium",
        };
      }
      return null;
    },
  },
  {
    signalType: "pricing_interest",
    title: "Pricing Page Interest",
    detect: (events, clientName) => {
      const day = 24 * 60 * 60 * 1000;
      const recent = events.filter(e =>
        e.eventType === "pricing_page_view" &&
        (Date.now() - new Date(e.occurredAt).getTime()) < 14 * day
      );
      if (recent.length >= 2) {
        return {
          match: true,
          description: `${clientName} visited pricing pages ${recent.length} times in 14 days — strong buying signal.`,
          evidence: recent.map(e => ({ type: e.eventType, date: e.occurredAt })),
          strength: "high",
        };
      }
      return null;
    },
  },
  {
    signalType: "high_frequency_visits",
    title: "High-Frequency Web Visits",
    detect: (events, clientName) => {
      const day = 24 * 60 * 60 * 1000;
      const recent = events.filter(e =>
        e.eventType === "website_visit" &&
        (Date.now() - new Date(e.occurredAt).getTime()) < 7 * day
      );
      if (recent.length >= 5) {
        return {
          match: true,
          description: `${clientName} had ${recent.length} website visits in 7 days, indicating heightened interest.`,
          evidence: recent.map(e => ({ type: e.eventType, subject: e.subject, date: e.occurredAt })),
          strength: recent.length >= 10 ? "high" : "medium",
        };
      }
      return null;
    },
  },
  {
    signalType: "webinar_engagement",
    title: "Active Webinar Participant",
    detect: (events, clientName) => {
      const day = 24 * 60 * 60 * 1000;
      const recent = events.filter(e =>
        (e.eventType === "webinar_attended" || e.eventType === "webinar_registered") &&
        (Date.now() - new Date(e.occurredAt).getTime()) < 30 * day
      );
      if (recent.length >= 2) {
        return {
          match: true,
          description: `${clientName} attended/registered for ${recent.length} webinars in 30 days.`,
          evidence: recent.map(e => ({ type: e.eventType, subject: e.subject, date: e.occurredAt })),
          strength: "medium",
        };
      }
      return null;
    },
  },
  {
    signalType: "email_highly_engaged",
    title: "High Email Engagement",
    detect: (events, clientName) => {
      const day = 24 * 60 * 60 * 1000;
      const recentClicks = events.filter(e =>
        e.eventType === "email_click" &&
        (Date.now() - new Date(e.occurredAt).getTime()) < 14 * day
      );
      if (recentClicks.length >= 3) {
        return {
          match: true,
          description: `${clientName} clicked ${recentClicks.length} email links in 14 days — highly responsive.`,
          evidence: recentClicks.map(e => ({ type: e.eventType, subject: e.subject, date: e.occurredAt })),
          strength: "medium",
        };
      }
      return null;
    },
  },
  {
    signalType: "re_engagement",
    title: "Re-Engagement After Silence",
    detect: (events, clientName) => {
      if (events.length < 2) return null;
      const sorted = [...events].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
      const day = 24 * 60 * 60 * 1000;
      const mostRecent = new Date(sorted[0].occurredAt).getTime();
      if (Date.now() - mostRecent > 14 * day) return null;

      const olderEvents = sorted.filter(e => {
        const t = new Date(e.occurredAt).getTime();
        return t < mostRecent - 60 * day;
      });
      if (olderEvents.length > 0 && sorted.filter(e => {
        const t = new Date(e.occurredAt).getTime();
        return t >= mostRecent - 60 * day && t < mostRecent - 14 * day;
      }).length === 0) {
        return {
          match: true,
          description: `${clientName} re-engaged after a period of inactivity — follow up promptly.`,
          evidence: [{ type: "re_engagement", latestDate: sorted[0].occurredAt }],
          strength: "high",
        };
      }
      return null;
    },
  },
];

export async function detectIntentSignals(clientId: string, advisorId: string): Promise<InsertIntentSignal[]> {
  const events = await storage.getEngagementEventsByClient(clientId, 200);
  if (events.length === 0) return [];

  const client = await storage.getClient(clientId);
  const clientName = client ? `${client.firstName} ${client.lastName}` : "Client";

  const signals: InsertIntentSignal[] = [];

  for (const rule of SIGNAL_RULES) {
    const result = rule.detect(events, clientName);
    if (result?.match) {
      signals.push({
        clientId,
        advisorId,
        signalType: rule.signalType,
        strength: result.strength,
        title: rule.title,
        description: result.description,
        evidence: result.evidence,
        isActive: true,
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  return signals;
}

export async function detectAllIntentSignals(advisorId: string): Promise<{ detected: number; clients: number }> {
  try {
    const clients = await storage.getClients(advisorId);
    let detected = 0;
    let clientsProcessed = 0;

    const existingSignals = await storage.getActiveIntentSignals(advisorId);
    const existingKeys = new Set(
      existingSignals.map(s => `${s.clientId}:${s.signalType}`)
    );

    for (const client of clients) {
      try {
        const signals = await detectIntentSignals(client.id, advisorId);
        for (const signal of signals) {
          const key = `${signal.clientId}:${signal.signalType}`;
          if (existingKeys.has(key)) continue;
          await storage.createIntentSignal(signal);
          existingKeys.add(key);
          detected++;
        }
        if (signals.length > 0) clientsProcessed++;
      } catch (err) {
        logger.error({ err, clientId: client.id }, "[IntentSignals] Failed for client");
      }
    }

    return { detected, clients: clientsProcessed };
  } catch (err) {
    logger.error({ err }, "[IntentSignals] Failed to detect signals");
    throw err;
  }
}
