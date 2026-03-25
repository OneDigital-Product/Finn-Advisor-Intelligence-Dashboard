import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { ensureValidToken, TokenRefreshError } from "@server/integrations/microsoft/client";
import { cancelOutlookEvent } from "@server/integrations/microsoft/calendar";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { logger } from "@server/lib/logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { meetingId } = await params;
    const session = await getSession();
    const sessionData = session as unknown as Record<string, unknown>;

    let accessToken: string;
    try {
      accessToken = await ensureValidToken(sessionData);
    } catch (err) {
      if (err instanceof TokenRefreshError) {
        const statusCode = err.requiresReauth ? 401 : 503;
        return NextResponse.json(
          {
            error: sanitizeErrorMessage(err, "Microsoft authentication failed"),
            requiresReauth: err.requiresReauth,
          },
          { status: statusCode }
        );
      }
      throw err;
    }

    const result = await cancelOutlookEvent(meetingId, accessToken);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "Cancel event error");
    return NextResponse.json({ error: "Failed to cancel Outlook event" }, { status: 500 });
  }
}
