import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    const advisor = await storage.getAdvisor(advisorId);
    return NextResponse.json({ connected: !!advisor?.calendlyAccessToken });
  } catch (err) {
    logger.error({ err }, "GET /api/integrations/calendly/status error");
    return NextResponse.json({ error: "Failed to check Calendly status" }, { status: 500 });
  }
}
