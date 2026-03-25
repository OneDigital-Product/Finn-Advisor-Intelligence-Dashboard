import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { type, message, pageUrl } = body;

    if (!message || message.length < 10) {
      return NextResponse.json({ message: "Message must be at least 10 characters" }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ message: "Message must be 500 characters or less" }, { status: 400 });
    }

    const validTypes = ["bug", "feature", "feedback"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ message: "Type must be bug, feature, or feedback" }, { status: 400 });
    }

    const userId = auth.session.userId;
    let email: string | undefined;
    if (auth.session.userType === "advisor") {
      const advisor = await storage.getAdvisor(userId!);
      email = advisor?.email;
    } else {
      const associate = await storage.getAssociate(userId!);
      email = associate?.email;
    }

    await storage.createPilotFeedback({
      userId: userId || null,
      type,
      message,
      pageUrl: pageUrl || null,
      email: email || null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err: err }, "[Feedback] POST error:");
    return NextResponse.json({ message: "Failed to save feedback" }, { status: 500 });
  }
}
