import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import type { InsertInsight } from "@shared/schema";

export class EngagementGenerator {
  async generate(client: any, advisorId: string): Promise<InsertInsight[]> {
    try {
      const activities = await storage.getActivitiesByClient(client.id);
      if (!activities || activities.length < 2) return [];

      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const recentActivities = activities.filter((a: any) => {
        const d = new Date(a.date || a.createdAt);
        return !isNaN(d.getTime()) && d >= oneYearAgo;
      });

      if (recentActivities.length < 2) return [];

      const quarters = [
        { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end: new Date(now.getTime() - 270 * 24 * 60 * 60 * 1000), label: "Q-4" },
        { start: new Date(now.getTime() - 270 * 24 * 60 * 60 * 1000), end: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), label: "Q-3" },
        { start: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), end: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), label: "Q-2" },
        { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now, label: "Q-1 (Recent)" },
      ];

      const contactsByQuarter = quarters.map((q) => {
        return recentActivities.filter((a: any) => {
          const d = new Date(a.date || a.createdAt);
          return d >= q.start && d < q.end;
        }).length;
      });

      const firstThreeAvg = (contactsByQuarter[0] + contactsByQuarter[1] + contactsByQuarter[2]) / 3;
      const lastQuarter = contactsByQuarter[3];

      if (firstThreeAvg <= 0) return [];

      const declinePercent = ((firstThreeAvg - lastQuarter) / firstThreeAvg) * 100;

      if (declinePercent < 20) return [];

      const accounts = await storage.getAccountsByClient(client.id);
      const totalAUM = accounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);

      const severity = declinePercent > 50 ? "high" : "medium";
      const recommendedCadence = totalAUM >= 5000000 ? "monthly" : totalAUM >= 1000000 ? "quarterly" : "semi-annual";

      const lastContactDate = recentActivities.length > 0
        ? new Date(recentActivities[0].date || recentActivities[0].updatedAt || Date.now())
        : null;
      const daysSinceLastContact = lastContactDate
        ? Math.round((now.getTime() - lastContactDate.getTime()) / (24 * 60 * 60 * 1000))
        : null;

      return [{
        clientId: client.id,
        advisorId,
        insightType: "engagement_risk",
        severity,
        title: `Declining Engagement — ${client.firstName} ${client.lastName}`,
        description: `Contact frequency decreased ${Math.round(declinePercent)}% in the most recent quarter. Went from ~${firstThreeAvg.toFixed(1)} contacts/quarter to ${lastQuarter}.${daysSinceLastContact ? ` Last contact: ${daysSinceLastContact} days ago.` : ""}`,
        opportunity: "Proactive outreach to strengthen relationship before dissatisfaction or attrition.",
        recommendedAction: `Schedule ${recommendedCadence} check-in; address any concerns. ${totalAUM >= 1000000 ? "High-value client — prioritize retention." : ""}`.trim(),
        estimatedValue: null,
        metrics: {
          quarterlyContacts: quarters.map((q, i) => ({ quarter: q.label, contacts: contactsByQuarter[i] })),
          lastQuarterContacts: lastQuarter,
          avgPreviousQuarters: parseFloat(firstThreeAvg.toFixed(1)),
          declinePercent: parseFloat(declinePercent.toFixed(1)),
          daysSinceLastContact,
          totalAUM,
          recommendedCadence,
        },
        confidence: 78,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }];
    } catch (err) {
      logger.error({ err }, "API error");
      return [];
    }
  }
}
