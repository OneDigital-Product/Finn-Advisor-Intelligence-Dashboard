import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { conversationTurns } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const conversationId = crypto.randomUUID();
    return NextResponse.json({
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Create conversation error");
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;

    const allTurns = await storage.db
      .select()
      .from(conversationTurns)
      .where(eq(conversationTurns.advisorId, advisorId))
      .orderBy(desc(conversationTurns.createdAt));

    const conversationMap = new Map<string, {
      conversationId: string;
      clientId: string | null;
      turnCount: number;
      firstTurnContent: string;
      lastTurnAt: Date;
      createdAt: Date;
    }>();

    for (const turn of allTurns) {
      if (!conversationMap.has(turn.conversationId)) {
        conversationMap.set(turn.conversationId, {
          conversationId: turn.conversationId,
          clientId: turn.clientId,
          turnCount: 0,
          firstTurnContent: "",
          lastTurnAt: turn.createdAt,
          createdAt: turn.createdAt,
        });
      }
      const conv = conversationMap.get(turn.conversationId)!;
      conv.turnCount++;
      if (turn.role === "advisor" && !conv.firstTurnContent) {
        conv.firstTurnContent = turn.content.substring(0, 80);
      }
      if (turn.createdAt > conv.lastTurnAt) {
        conv.lastTurnAt = turn.createdAt;
      }
      if (turn.createdAt < conv.createdAt) {
        conv.createdAt = turn.createdAt;
      }
    }

    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => b.lastTurnAt.getTime() - a.lastTurnAt.getTime())
      .slice(0, 20);

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        conversation_id: c.conversationId,
        client_id: c.clientId,
        turn_count: c.turnCount,
        title: c.firstTurnContent || "Conversation",
        last_turn_at: c.lastTurnAt,
        created_at: c.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "List conversations error");
    return NextResponse.json({ error: "Failed to list conversations" }, { status: 500 });
  }
}
