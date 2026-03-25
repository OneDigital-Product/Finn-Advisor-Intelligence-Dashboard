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

    const draft = await reportStorage.approveDraft(draftId, advisorId);
    return NextResponse.json({ draft, message: "Draft approved" });
  } catch (err: unknown) {
    logger.error({ err }, "Approve draft error");
    const safeMsg = sanitizeErrorMessage(err, "Failed to approve draft");
    if ((err as Error).message === "Draft not found") {
      return NextResponse.json({ error: safeMsg }, { status: 404 });
    }
    if ((err as Error).message === "Draft already approved") {
      return NextResponse.json({ error: safeMsg }, { status: 400 });
    }
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
