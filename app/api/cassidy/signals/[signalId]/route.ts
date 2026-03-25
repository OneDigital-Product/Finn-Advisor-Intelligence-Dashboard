import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { detectedSignals } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger, updateSignalStatusSchema } from "@server/routes/cassidy/shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ signalId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { signalId } = await params;
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = updateSignalStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { status } = parsed.data;

    const [existing] = await storage.db
      .select()
      .from(detectedSignals)
      .where(and(eq(detectedSignals.id, signalId), eq(detectedSignals.advisorId, advisorId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const [updated] = await storage.db
      .update(detectedSignals)
      .set({ status, updatedAt: new Date() })
      .where(eq(detectedSignals.id, signalId))
      .returning();

    return NextResponse.json({ signal: updated });
  } catch (err) {
    logger.error({ err }, "Error updating signal");
    return NextResponse.json({ error: "Failed to update signal" }, { status: 500 });
  }
}
