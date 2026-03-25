import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { reportArtifacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger, updateReportDraftSchema } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { draftId } = await params;
    const advisorId = auth.session.userId;

    const [draft] = await storage.db
      .select()
      .from(reportArtifacts)
      .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
      .limit(1);

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ draft });
  } catch (err) {
    logger.error({ err }, "Get report draft error");
    return NextResponse.json({ error: "Failed to retrieve draft" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { draftId } = await params;
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = updateReportDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { status, edits } = parsed.data;

    const [existing] = await storage.db
      .select()
      .from(reportArtifacts)
      .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (existing.status === "approved") {
      return NextResponse.json({ error: "Cannot modify approved draft" }, { status: 400 });
    }

    if (existing.status === "discarded") {
      return NextResponse.json({ error: "Cannot modify discarded draft" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };

    if (status) {
      const validStatuses = ["draft", "reviewed"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Use dedicated approve/discard endpoints for status changes" }, { status: 400 });
      }
      updateFields.status = status;
    }

    if (edits) {
      updateFields.fullDraftText = edits;
      updateFields.version = (existing.version || 1) + 1;
    }

    if (!status && !edits) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const [updated] = await storage.db
      .update(reportArtifacts)
      .set(updateFields)
      .where(eq(reportArtifacts.id, draftId))
      .returning();

    return NextResponse.json({ draft: updated });
  } catch (err) {
    logger.error({ err }, "Update report draft error");
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}
