import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import * as reportStorage from "@server/integrations/cassidy/report-storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { logger, saveVersionSchema } from "@server/routes/cassidy/shared";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { draftId } = await params;
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = saveVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { edits, edit_summary } = parsed.data;

    const draft = await reportStorage.saveDraftVersion(draftId, advisorId, edits, edit_summary);
    return NextResponse.json({ draft, version: draft.version });
  } catch (err: unknown) {
    logger.error({ err }, "Save version error");
    const safeMsg = sanitizeErrorMessage(err, "Failed to save version");
    if ((err as Error).message === "Draft not found") {
      return NextResponse.json({ error: safeMsg }, { status: 404 });
    }
    if ((err as Error).message?.includes("Cannot edit")) {
      return NextResponse.json({ error: safeMsg }, { status: 400 });
    }
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
