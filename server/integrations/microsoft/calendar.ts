import { getGraphClient, isMicrosoftEnabled } from "./client";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";

const activeSyncLocks = new Map<string, Promise<any>>();

async function withAdvisorSyncLock<T>(
  advisorId: string,
  fn: () => Promise<T>
): Promise<T> {
  while (activeSyncLocks.has(advisorId)) {
    await activeSyncLocks.get(advisorId);
  }

  let resolve: () => void;
  const lockPromise = new Promise<void>((r) => { resolve = r; });
  activeSyncLocks.set(advisorId, lockPromise);

  try {
    return await fn();
  } finally {
    activeSyncLocks.delete(advisorId);
    resolve!();
  }
}

export async function syncMeetingToOutlook(
  meetingId: string,
  accessToken: string
): Promise<{ success: boolean; outlookEventId?: string; error?: string }> {
  if (!isMicrosoftEnabled()) {
    return { success: false, error: "Microsoft integration disabled" };
  }

  try {
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) return { success: false, error: "Meeting not found" };

    const client = await getGraphClient(accessToken);
    if (!client) return { success: false, error: "No Graph client" };

    const eventData = {
      subject: meeting.title,
      start: { dateTime: meeting.startTime, timeZone: "UTC" },
      end: { dateTime: meeting.endTime, timeZone: "UTC" },
      location: meeting.location
        ? { displayName: meeting.location }
        : undefined,
      body: {
        contentType: "HTML",
        content: meeting.notes || "",
      },
    };

    let outlookEventId: string;

    if (meeting.outlookEventId) {
      await client
        .api(`/me/events/${meeting.outlookEventId}`)
        .patch(eventData);
      outlookEventId = meeting.outlookEventId;
    } else {
      const result = await client.api("/me/events").post(eventData);
      outlookEventId = result.id;
      await storage.setOutlookEventId(meetingId, outlookEventId);
    }

    await storage.updateMeetingOutlookSyncStatus(meetingId, "synced");

    return { success: true, outlookEventId };
  } catch (err: any) {
    logger.error({ err }, "API error");
    await storage.updateMeetingOutlookSyncStatus(meetingId, "failed");
    return { success: false, error: err.message };
  }
}

export interface SyncConflict {
  meetingId: string;
  outlookEventId: string;
  localTitle: string;
  remoteTitle: string;
  localStartTime: string;
  remoteStartTime: string;
  localEndTime: string;
  remoteEndTime: string;
  localLocation: string | null;
  remoteLocation: string | null;
}

function hasConflict(existing: any, remoteEvent: any): boolean {
  const remoteStart = remoteEvent.start?.dateTime;
  const remoteEnd = remoteEvent.end?.dateTime;
  const remoteSubject = remoteEvent.subject;
  const remoteLocation = remoteEvent.location?.displayName || null;

  if (existing.title !== remoteSubject) return true;
  if (existing.startTime !== remoteStart) return true;
  if (existing.endTime !== remoteEnd) return true;
  if ((existing.location || null) !== remoteLocation) return true;
  return false;
}

export async function syncOutlookEventsToApp(
  accessToken: string,
  advisorId: string
): Promise<{ synced: number; updated: number; conflicts: SyncConflict[]; errors: Array<any> }> {
  return withAdvisorSyncLock(advisorId, async () => {
    const results = { synced: 0, updated: 0, conflicts: [] as SyncConflict[], errors: [] as any[] };

    if (!isMicrosoftEnabled()) return results;

    try {
      const client = await getGraphClient(accessToken);
      if (!client) return results;

      const startTime = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const events = await client
        .api("/me/events")
        .filter(`start/dateTime ge '${startTime}'`)
        .get();

      for (const event of events.value || []) {
        try {
          const existing = await storage.getMeetingByOutlookEventId(event.id);

          if (existing) {
            if (hasConflict(existing, event)) {
              results.conflicts.push({
                meetingId: existing.id,
                outlookEventId: event.id,
                localTitle: existing.title,
                remoteTitle: event.subject,
                localStartTime: existing.startTime,
                remoteStartTime: event.start.dateTime,
                localEndTime: existing.endTime,
                remoteEndTime: event.end.dateTime,
                localLocation: existing.location || null,
                remoteLocation: event.location?.displayName || null,
              });
              await storage.updateMeetingOutlookSyncStatus(existing.id, "conflict");
            } else {
              results.updated++;
            }
          } else {
            try {
              await storage.createMeeting({
                advisorId,
                title: event.subject,
                startTime: event.start.dateTime,
                endTime: event.end.dateTime,
                type: "other",
                location: event.location?.displayName,
                outlookEventId: event.id,
                status: "scheduled",
              });
              results.synced++;
            } catch (createErr: any) {
              if (createErr?.code === "23505" && createErr?.constraint?.includes("outlook_event_id")) {
                logger.warn({ eventId: event.id }, "Duplicate Outlook event detected, skipping");
              } else {
                throw createErr;
              }
            }
          }
        } catch (err: any) {
          results.errors.push({ eventId: event.id, error: err.message });
        }
      }
    } catch (err) {
      logger.error({ err }, "API error");
      throw err;
    }

    return results;
  });
}

export async function cancelOutlookEvent(
  meetingId: string,
  accessToken: string
): Promise<{ success: boolean }> {
  if (!isMicrosoftEnabled()) return { success: true };

  try {
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting?.outlookEventId) return { success: true };

    const client = await getGraphClient(accessToken);
    if (!client) return { success: false };

    await client.api(`/me/events/${meeting.outlookEventId}`).delete();
    return { success: true };
  } catch (err) {
    logger.error({ err }, "API error");
    return { success: false };
  }
}
