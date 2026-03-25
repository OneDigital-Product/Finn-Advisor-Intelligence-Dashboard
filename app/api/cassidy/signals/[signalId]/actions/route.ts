import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { detectedSignals, signalActions } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ signalId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { signalId } = await params;
    const advisorId = auth.session.userId;

    const [signal] = await storage.db
      .select()
      .from(detectedSignals)
      .where(and(eq(detectedSignals.id, signalId), eq(detectedSignals.advisorId, advisorId)))
      .limit(1);

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const actions = await storage.db
      .select()
      .from(signalActions)
      .where(eq(signalActions.signalId, signalId))
      .orderBy(desc(signalActions.createdAt));

    return NextResponse.json({ actions });
  } catch (err) {
    logger.error({ err }, "Get signal actions error");
    return NextResponse.json({ error: "Failed to retrieve actions" }, { status: 500 });
  }
}
