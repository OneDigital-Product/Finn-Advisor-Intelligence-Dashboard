import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { rating, comment, pageUrl } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const response = await storage.createSurveyResponse({
      userId: auth.session.userId!,
      rating,
      comment: comment || null,
      pageUrl: pageUrl || null,
    });

    return NextResponse.json(response);
  } catch (err: any) {
    logger.error({ err: err }, "[Survey] POST error:");
    return NextResponse.json({ error: "Failed to submit survey" }, { status: 500 });
  }
}
