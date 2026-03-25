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
    const url = new URL(request.url);
    const v1 = parseInt(url.searchParams.get("v1") || "");
    const v2 = parseInt(url.searchParams.get("v2") || "");

    if (!v1 || !v2 || isNaN(v1) || isNaN(v2)) {
      return NextResponse.json({ error: "v1 and v2 query parameters required" }, { status: 400 });
    }

    const diff = await reportStorage.getVersionDiff(draftId, advisorId, v1, v2);
    return NextResponse.json(diff);
  } catch (err: unknown) {
    logger.error({ err }, "Get diff error");
    const safeMsg = sanitizeErrorMessage(err, "Failed to retrieve diff");
    if ((err as Error).message?.includes("not found")) {
      return NextResponse.json({ error: safeMsg }, { status: 404 });
    }
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
