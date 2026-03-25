import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { ensureValidToken, TokenRefreshError } from "@server/integrations/microsoft/client";
import { syncOutlookEventsToApp } from "@server/integrations/microsoft/calendar";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
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

    const url = new URL(request.url);
    const direction = url.searchParams.get("direction") || "outbound";
    const advisor = await getSessionAdvisor(auth.session);

    if (direction === "inbound") {
      if (!advisor) {
        return NextResponse.json({ error: "No advisor session" }, { status: 401 });
      }
      const result = await syncOutlookEventsToApp(accessToken, advisor.id);
      return NextResponse.json({ success: true, ...result });
    } else {
      return NextResponse.json({ success: true, synced: 0, failed: 0 });
    }
  } catch (err: any) {
    logger.error({ err }, "API error");
    return NextResponse.json({ error: "Calendar sync failed" }, { status: 500 });
  }
}
