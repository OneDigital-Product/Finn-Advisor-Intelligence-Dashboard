import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const updated = await storage.updateAdvisor(auth.session.userId, {
      onboardingCompleted: true,
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Advisor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, onboardingCompleted: true });
  } catch (error) {
    logger.error({ err: error }, "POST /api/onboarding/complete error:");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
