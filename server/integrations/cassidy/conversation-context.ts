import { eq, desc } from "drizzle-orm";
import { storage } from "../../storage";
import { conversationTurns } from "@shared/schema";
import { logger } from "../../lib/logger";

interface ContextInput {
  conversationId: string;
  parentTurnId?: string;
}

export async function buildConversationContext(
  input: ContextInput
): Promise<string> {
  const { conversationId, parentTurnId } = input;

  const turns = await storage.db
    .select()
    .from(conversationTurns)
    .where(eq(conversationTurns.conversationId, conversationId))
    .orderBy(conversationTurns.turnNumber);

  if (turns.length === 0) {
    return "";
  }

  let context = `\n---CONVERSATION CONTEXT---\n`;

  if (parentTurnId) {
    const parentTurn = turns.find((t) => t.id === parentTurnId);
    if (parentTurn) {
      context += `Original Request (Turn ${parentTurn.turnNumber}): "${parentTurn.content}"\n`;
      const parentIdx = turns.findIndex((t) => t.id === parentTurnId);
      const finResponse = parentTurn.role === "advisor" ? turns[parentIdx + 1] : null;
      if (finResponse && finResponse.role === "fin") {
        context += `\nPrior Analysis (Turn ${finResponse.turnNumber}):\n${finResponse.content}\n`;
      }
    }
  } else {
    const recentTurns = turns.slice(-6);
    for (const turn of recentTurns) {
      const label = turn.role === "advisor" ? "Advisor" : "Fin";
      context += `\n[${label} - Turn ${turn.turnNumber}]: ${turn.content.substring(0, 500)}\n`;
    }
  }

  context += `\nYou are continuing this conversation. Use the prior context to inform your response.\n`;
  context += `---END CONTEXT---\n\n`;

  return context;
}

export function injectConversationContext(
  basePrompt: string,
  context: string
): string {
  if (!context) return basePrompt;
  const match = basePrompt.match(new RegExp("^(.*?\\n\\n)", "s"));
  if (match) {
    return basePrompt.replace(new RegExp("^(.*?\\n\\n)", "s"), `$1${context}\n\n`);
  }
  return context + basePrompt;
}

export async function getConversationSummary(conversationId: string) {
  const turns = await storage.db
    .select()
    .from(conversationTurns)
    .where(eq(conversationTurns.conversationId, conversationId))
    .orderBy(conversationTurns.turnNumber);

  if (turns.length === 0) {
    return null;
  }

  const firstAdvisorTurn = turns.find((t) => t.role === "advisor");
  const title = firstAdvisorTurn
    ? firstAdvisorTurn.content.substring(0, 80) + (firstAdvisorTurn.content.length > 80 ? "..." : "")
    : "Conversation";

  return {
    conversationId,
    title,
    turnCount: turns.length,
    advisorTurns: turns.filter((t) => t.role === "advisor").length,
    finTurns: turns.filter((t) => t.role === "fin").length,
    clientId: turns[0].clientId,
    advisorId: turns[0].advisorId,
    lastTurnAt: turns[turns.length - 1].createdAt,
    createdAt: turns[0].createdAt,
  };
}
