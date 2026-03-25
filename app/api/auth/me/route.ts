import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    let onboardingCompleted = true;
    if (session.userType === "advisor") {
      const advisor = await storage.getAdvisor(session.userId);
      if (advisor) {
        onboardingCompleted = advisor.onboardingCompleted;
      }
    }

    return NextResponse.json({
      id: session.userId,
      type: session.userType,
      name: session.userName,
      email: session.userEmail,
      avatarUrl: session.userAvatarUrl || null,
      onboardingCompleted,
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/auth/me error:");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
