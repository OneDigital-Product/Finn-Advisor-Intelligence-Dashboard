import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { createCalendlyIntegration } from "@server/integrations/calendly";
import { decryptToken } from "@server/lib/crypto";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventTypeId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { eventTypeId } = await params;
    const advisorId = auth.session.userId;
    const advisor = await storage.getAdvisor(advisorId);

    if (!advisor?.calendlyAccessToken) {
      return NextResponse.json({ error: "Calendly not configured" }, { status: 401 });
    }

    const token = decryptToken(advisor.calendlyAccessToken);
    const calendly = createCalendlyIntegration(token);
    const bookingUrl = await calendly.getEventTypeLink(eventTypeId);

    if (!bookingUrl) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    return NextResponse.json({ bookingUrl });
  } catch (err) {
    logger.error({ err }, "GET /api/integrations/calendly/link/:eventTypeId error");
    return NextResponse.json({ error: "Failed to get booking link" }, { status: 500 });
  }
}
