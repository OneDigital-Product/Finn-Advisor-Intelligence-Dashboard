import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { createCalendlyIntegration } from "@server/integrations/calendly";
import { encryptToken } from "@server/lib/crypto";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
    }

    const calendly = createCalendlyIntegration(accessToken);
    const user = await calendly.getUser();

    const encrypted = encryptToken(accessToken);
    const advisorId = auth.session.userId;
    await storage.updateAdvisor(advisorId, {
      calendlyAccessToken: encrypted,
      calendlyUserId: user.id,
    });

    return NextResponse.json({ message: "Calendly connected successfully", userName: user.name });
  } catch (err) {
    logger.error({ err }, "POST /api/integrations/calendly/config error");
    return NextResponse.json(
      { error: "Failed to connect Calendly. Please check your access token." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    await storage.updateAdvisor(advisorId, {
      calendlyAccessToken: null,
      calendlyUserId: null,
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "DELETE /api/integrations/calendly/config error");
    return NextResponse.json({ error: "Failed to disconnect Calendly" }, { status: 500 });
  }
}
