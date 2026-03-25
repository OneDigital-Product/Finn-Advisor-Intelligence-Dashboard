import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { isAIAvailable } from "@server/openai";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) {
      return NextResponse.json(
        { message: "No advisor found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...advisor, aiEnabled: isAIAvailable() });
  } catch (error) {
    logger.error({ err: error }, "GET /api/advisor error:");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
