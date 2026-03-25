import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { isMicrosoftEnabled, validateConnection, ensureValidToken, TokenRefreshError } from "@server/integrations/microsoft/client";
import { isEmailEnabled } from "@server/integrations/microsoft/email";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const enabled = isMicrosoftEnabled();
    const emailEnabled = isEmailEnabled();
    const session = await getSession();
    const sessionData = session as unknown as Record<string, unknown>;
    let authenticated = false;

    if (enabled && sessionData.microsoftAccessToken) {
      try {
        const validToken = await ensureValidToken(sessionData);
        authenticated = await validateConnection(validToken);
      } catch (err) {
        if (err instanceof TokenRefreshError) {
          authenticated = false;
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json({
      enabled,
      authenticated,
      emailEnabled,
      emailProvider: process.env.SENDGRID_API_KEY
        ? "sendgrid"
        : process.env.SMTP_ENABLED === "true"
          ? "smtp"
          : "none",
    });
  } catch (err: any) {
    logger.error({ err }, "Microsoft status error");
    return NextResponse.json({ error: "Failed to get Microsoft status" }, { status: 500 });
  }
}
