import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getCalendarEvents } from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

/**
 * GET /api/calendar/live — Live Outlook calendar events via MuleSoft → Microsoft Graph.
 *
 * Query params:
 *   date     — YYYY-MM-DD (defaults to today)
 *   days     — number of days to fetch (defaults to 1)
 *   userId   — Entra ID override (defaults to env ADVISOR_ENTRA_ID)
 *   timezone — ET|CT|MT|PT (defaults to env ADVISOR_TIMEZONE or "ET")
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const days = parseInt(url.searchParams.get("days") || "1", 10) || 1;
  const userId = url.searchParams.get("userId") || process.env.ADVISOR_ENTRA_ID;
  const timezone = url.searchParams.get("timezone") || process.env.ADVISOR_TIMEZONE || "ET";

  if (!userId) {
    return NextResponse.json(
      { message: "No Entra ID configured. Set ADVISOR_ENTRA_ID in .env or pass ?userId=", events: [] },
      { status: 200 }
    );
  }

  if (!isMulesoftEnabled()) {
    return NextResponse.json(
      { message: "MuleSoft not enabled", events: [], _dataSource: "unavailable" },
      { status: 200 }
    );
  }

  try {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + days);

    // MuleSoft expects ISO 8601 with fractional seconds
    const startDateTime = `${startDate.toISOString().split("T")[0]}T00:00:00.0000000`;
    const endDateTime = `${endDate.toISOString().split("T")[0]}T23:59:00.0000000`;

    const startMs = Date.now();
    const events = await getCalendarEvents({ userId, startDateTime, endDateTime, timezone });
    const durationMs = Date.now() - startMs;

    logger.info(
      { eventCount: events.length, durationMs, userId: userId.slice(0, 8) + "..." },
      "[Calendar Live] Fetched Outlook events"
    );

    return NextResponse.json({
      events,
      date,
      days,
      timezone,
      calendarOwner: {
        entraId: userId,
        label: process.env.ADVISOR_CALENDAR_LABEL || null,
      },
      _dataSource: "mulesoft-outlook",
      _timing: { fetchMs: durationMs },
    });
  } catch (err: any) {
    logger.error({ err }, "[Calendar Live] Failed to fetch calendar");
    return NextResponse.json(
      { message: err.message, events: [], _dataSource: "error" },
      { status: 200 } // Don't break dashboard — return empty with error info
    );
  }
}
