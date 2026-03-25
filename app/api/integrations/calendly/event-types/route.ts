import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { createCalendlyIntegration } from "@server/integrations/calendly";
import { decryptToken } from "@server/lib/crypto";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    const advisor = await storage.getAdvisor(advisorId);

    if (!advisor?.calendlyAccessToken) {
      return NextResponse.json(
        { error: "Calendly not configured", code: "NOT_CONFIGURED" },
        { status: 401 }
      );
    }

    const token = decryptToken(advisor.calendlyAccessToken);
    const calendly = createCalendlyIntegration(token);
    const eventTypes = await calendly.getEventTypes();

    return NextResponse.json(eventTypes);
  } catch (err) {
    logger.error({ err }, "GET /api/integrations/calendly/event-types error");
    return NextResponse.json({ error: "Failed to fetch event types" }, { status: 500 });
  }
}
