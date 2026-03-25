import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import * as reportStorage from "@server/integrations/cassidy/report-storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { logger } from "@server/routes/cassidy/shared";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { draftId } = await params;
    const advisorId = auth.session.userId;

    await reportStorage.discardDraft(draftId, advisorId);
    return NextResponse.json({ message: "Draft discarded" });
  } catch (err: unknown) {
    logger.error({ err }, "Discard draft error");
    const safeMsg = sanitizeErrorMessage(err, "Failed to discard draft");
    if ((err as Error).message === "Draft not found") {
      return NextResponse.json({ error: safeMsg }, { status: 404 });
    }
    if ((err as Error).message?.includes("Cannot discard")) {
      return NextResponse.json({ error: safeMsg }, { status: 400 });
    }
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
