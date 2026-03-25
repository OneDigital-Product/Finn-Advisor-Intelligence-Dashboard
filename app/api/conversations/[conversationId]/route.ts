import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { conversationTurns } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { conversationId } = await params;
    const advisorId = auth.session.userId;

    const turns = await storage.db
      .select()
      .from(conversationTurns)
      .where(and(
        eq(conversationTurns.conversationId, conversationId),
        eq(conversationTurns.advisorId, advisorId)
      ))
      .orderBy(conversationTurns.turnNumber);

    if (turns.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation_id: conversationId,
      turn_count: turns.length,
      turns: turns.map((t) => ({
        id: t.id,
        turn_number: t.turnNumber,
        role: t.role,
        content: t.content,
        job_id: t.jobId,
        suggested_prompts: t.suggestedPrompts,
        execution_time_ms: t.executionTimeMs,
        parent_turn_id: t.parentTurnId,
        created_at: t.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Fetch conversation error");
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}
