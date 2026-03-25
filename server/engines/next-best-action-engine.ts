import { storage } from "../storage";
import { logger } from "../lib/logger";
import type { InsertNextBestAction, Client, EngagementScore, IntentSignal } from "@shared/schema";

interface ActionContext {
  client: Client;
  score: EngagementScore | undefined;
  signals: IntentSignal[];
  daysSinceContact: number | null;
  totalAum: number;
}

function generateActionsForClient(ctx: ActionContext, advisorId: string): InsertNextBestAction[] {
  const actions: InsertNextBestAction[] = [];
  const { client, score, signals, daysSinceContact, totalAum } = ctx;
  const clientName = `${client.firstName} ${client.lastName}`;

  const highValueClient = totalAum >= 1_000_000;

  for (const signal of signals) {
    if (!signal.isActive) continue;

    if (signal.signalType === "pricing_interest") {
      actions.push({
        clientId: client.id,
        advisorId,
        actionType: "call",
        priority: 95,
        title: `Call ${clientName} — pricing interest detected`,
        description: `${clientName} has been viewing pricing pages multiple times. Schedule a call to discuss services and address questions.`,
        reasoning: "High-intent pricing page visits indicate readiness for a conversation about services.",
        status: "pending",
        category: "outreach",
        estimatedImpact: highValueClient ? "high" : "medium",
        metadata: { signalId: signal.id, signalType: signal.signalType },
      });
    }

    if (signal.signalType === "content_binge") {
      actions.push({
        clientId: client.id,
        advisorId,
        actionType: "email",
        priority: 80,
        title: `Send personalized follow-up to ${clientName}`,
        description: `${clientName} has been actively consuming content. Send a personalized email referencing the topics they're interested in.`,
        reasoning: "Content binging suggests active research. A tailored follow-up can convert interest into engagement.",
        status: "pending",
        category: "nurture",
        estimatedImpact: "medium",
        metadata: { signalId: signal.id, signalType: signal.signalType },
      });
    }

    if (signal.signalType === "re_engagement") {
      actions.push({
        clientId: client.id,
        advisorId,
        actionType: "call",
        priority: 90,
        title: `Re-engage ${clientName} — they're back`,
        description: `${clientName} has returned after a period of silence. Reach out quickly to capitalize on renewed interest.`,
        reasoning: "Re-engagement after inactivity is a critical window for relationship building.",
        status: "pending",
        category: "outreach",
        estimatedImpact: "high",
        metadata: { signalId: signal.id, signalType: signal.signalType },
      });
    }

    if (signal.signalType === "webinar_engagement") {
      actions.push({
        clientId: client.id,
        advisorId,
        actionType: "meeting",
        priority: 70,
        title: `Schedule follow-up with ${clientName} after webinar`,
        description: `${clientName} has been active in webinars. Schedule a one-on-one to discuss the topics covered.`,
        reasoning: "Webinar attendance shows topic interest. A personal follow-up deepens the relationship.",
        status: "pending",
        category: "meeting",
        estimatedImpact: "medium",
        metadata: { signalId: signal.id, signalType: signal.signalType },
      });
    }
  }

  if (daysSinceContact !== null && daysSinceContact > 90 && highValueClient) {
    actions.push({
      clientId: client.id,
      advisorId,
      actionType: "call",
      priority: 85,
      title: `Overdue check-in with ${clientName}`,
      description: `It has been ${daysSinceContact} days since last contact with ${clientName} (AUM: $${(totalAum / 1e6).toFixed(1)}M). Schedule a check-in to maintain the relationship.`,
      reasoning: "High-value clients require regular contact to prevent attrition.",
      status: "pending",
      category: "retention",
      estimatedImpact: "high",
      metadata: { daysSinceContact, totalAum },
    });
  }

  if (score && score.compositeScore < 30) {
    actions.push({
      clientId: client.id,
      advisorId,
      actionType: "email",
      priority: 60,
      title: `Boost engagement with ${clientName}`,
      description: `${clientName}'s engagement score is low (${score.compositeScore}/100). Send relevant content or invite to an upcoming event.`,
      reasoning: "Low engagement scores correlate with higher attrition risk. Proactive outreach can re-engage.",
      status: "pending",
      category: "nurture",
      estimatedImpact: highValueClient ? "high" : "low",
      metadata: { engagementScore: score.compositeScore },
    });
  }

  if (score && score.trend === "decreasing" && score.compositeScore > 30) {
    actions.push({
      clientId: client.id,
      advisorId,
      actionType: "review",
      priority: 65,
      title: `Address declining engagement for ${clientName}`,
      description: `${clientName}'s engagement trend is declining (score: ${score.compositeScore}). Review recent interactions and reach out.`,
      reasoning: "A declining trend, even from a decent baseline, warrants proactive attention.",
      status: "pending",
      category: "retention",
      estimatedImpact: "medium",
      metadata: { engagementScore: score.compositeScore, trend: score.trend },
    });
  }

  return actions;
}

export async function generateNextBestActions(advisorId: string): Promise<{ generated: number; clients: number }> {
  try {
    const clients = await storage.getClients(advisorId);
    let generated = 0;
    let clientsWithActions = 0;

    const existingActions = await storage.getNextBestActions(advisorId, "pending");
    const existingKeys = new Set(
      existingActions.map(a => `${a.clientId}:${a.actionType}:${a.category}`)
    );

    for (const client of clients) {
      try {
        const [score, signals, accounts, activities] = await Promise.all([
          storage.getEngagementScore(client.id),
          storage.getIntentSignalsByClient(client.id),
          storage.getAccountsByClient(client.id),
          storage.getActivitiesByClient(client.id),
        ]);

        const totalAum = accounts.reduce((s, a) => s + parseFloat(String(a.balance || "0")), 0);

        let daysSinceContact: number | null = null;
        if (client.lastContactDate) {
          const lastDate = new Date(client.lastContactDate);
          if (!isNaN(lastDate.getTime())) {
            daysSinceContact = Math.round((Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
          }
        } else if (activities.length > 0) {
          const sorted = [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const lastDate = new Date(sorted[0].date);
          if (!isNaN(lastDate.getTime())) {
            daysSinceContact = Math.round((Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
          }
        }

        const activeSignals = signals.filter(s => s.isActive);

        const context: ActionContext = {
          client,
          score,
          signals: activeSignals,
          daysSinceContact,
          totalAum,
        };

        const newActions = generateActionsForClient(context, advisorId);
        for (const action of newActions) {
          const key = `${action.clientId}:${action.actionType}:${action.category}`;
          if (existingKeys.has(key)) continue;
          await storage.createNextBestAction(action);
          existingKeys.add(key);
          generated++;
        }
        if (newActions.length > 0) clientsWithActions++;
      } catch (err) {
        logger.error({ err, clientId: client.id }, "[NBA] Failed for client");
      }
    }

    return { generated, clients: clientsWithActions };
  } catch (err) {
    logger.error({ err }, "[NBA] Failed to generate actions");
    throw err;
  }
}
