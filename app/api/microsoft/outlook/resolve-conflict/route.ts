import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { meetingId, resolution } = await request.json();
    if (!meetingId || !["keep_local", "use_remote"].includes(resolution)) {
      return NextResponse.json(
        { error: "meetingId and resolution (keep_local | use_remote) are required" },
        { status: 400 }
      );
    }

    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor || meeting.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await getSession();
    const sessionData = session as unknown as Record<string, unknown>;
    const accessToken = sessionData.microsoftAccessToken as string | undefined;

    if (resolution === "keep_local") {
      if (!accessToken) {
        return NextResponse.json({ error: "Microsoft not authenticated" }, { status: 401 });
      }
      if (!meeting.outlookEventId) {
        return NextResponse.json(
          { error: "No Outlook event linked to this meeting" },
          { status: 400 }
        );
      }
      try {
        const { getGraphClient } = await import("@server/integrations/microsoft/client");
        const client = await getGraphClient(accessToken);
        if (!client) {
          return NextResponse.json(
            { error: "Could not connect to Microsoft Graph" },
            { status: 503 }
          );
        }
        await client.api(`/me/events/${meeting.outlookEventId}`).patch({
          subject: meeting.title,
          start: { dateTime: meeting.startTime, timeZone: "UTC" },
          end: { dateTime: meeting.endTime, timeZone: "UTC" },
          location: meeting.location ? { displayName: meeting.location } : undefined,
        });
      } catch (pushErr: any) {
        logger.error({ err: pushErr }, "Failed to push local state to Outlook");
        return NextResponse.json(
          { error: "Failed to push local changes to Outlook" },
          { status: 500 }
        );
      }
      await storage.updateMeetingOutlookSyncStatus(meetingId, "synced");
      return NextResponse.json({ success: true, resolution: "keep_local", meeting });
    } else {
      if (!accessToken) {
        return NextResponse.json({ error: "Microsoft not authenticated" }, { status: 401 });
      }

      if (!meeting.outlookEventId) {
        return NextResponse.json(
          { error: "No Outlook event linked to this meeting" },
          { status: 400 }
        );
      }

      const { getGraphClient } = await import("@server/integrations/microsoft/client");
      const client = await getGraphClient(accessToken);
      if (!client) {
        return NextResponse.json(
          { error: "Could not connect to Microsoft Graph" },
          { status: 503 }
        );
      }

      const remoteEvent = await client.api(`/me/events/${meeting.outlookEventId}`).get();
      await storage.updateMeeting(meetingId, {
        title: remoteEvent.subject,
        startTime: remoteEvent.start.dateTime,
        endTime: remoteEvent.end.dateTime,
        location: remoteEvent.location?.displayName || null,
      });
      await storage.updateMeetingOutlookSyncStatus(meetingId, "synced");
      const updated = await storage.getMeeting(meetingId);
      return NextResponse.json({ success: true, resolution: "use_remote", meeting: updated });
    }
  } catch (err: any) {
    logger.error({ err }, "Outlook conflict resolution error");
    return NextResponse.json({ error: "Failed to resolve conflict" }, { status: 500 });
  }
}
