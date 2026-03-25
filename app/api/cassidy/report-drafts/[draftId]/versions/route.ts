import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import * as reportStorage from "@server/integrations/cassidy/report-storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { draftId } = await params;
    const advisorId = auth.session.userId;

    const versions = await reportStorage.getDraftVersions(draftId, advisorId);
    return NextResponse.json({ versions });
  } catch (err: unknown) {
    logger.error({ err }, "Get versions error");
    const safeMsg = sanitizeErrorMessage(err, "Failed to retrieve versions");
    if ((err as Error).message === "Draft not found") {
      return NextResponse.json({ error: safeMsg }, { status: 404 });
    }
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
