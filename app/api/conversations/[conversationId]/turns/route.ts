import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { conversationTurns } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { storage, logger, conversationTurnSchema } from "@server/routes/cassidy/shared";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { conversationId } = await params;
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = conversationTurnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { client_id, role, content, job_id, suggested_prompts, execution_time_ms, parent_turn_id } = parsed.data;

    const existingTurns = await storage.db
      .select()
      .from(conversationTurns)
      .where(eq(conversationTurns.conversationId, conversationId));

    const turnNumber = existingTurns.length + 1;

    const turn = await storage.db
      .insert(conversationTurns)
      .values({
        conversationId,
        sessionId: crypto.randomUUID(),
        advisorId,
        clientId: client_id || null,
        turnNumber,
        role,
        content,
        jobId: job_id || null,
        suggestedPrompts: suggested_prompts || null,
        executionTimeMs: execution_time_ms || null,
        parentTurnId: parent_turn_id || null,
      })
      .returning();

    return NextResponse.json({
      turn_id: turn[0].id,
      turn_number: turnNumber,
      created_at: turn[0].createdAt,
    });
  } catch (err) {
    logger.error({ err }, "Add conversation turn error");
    return NextResponse.json({ error: "Failed to add conversation turn" }, { status: 500 });
  }
}
