import { createZoomMeetingApi, updateZoomMeetingApi, deleteZoomMeetingApi, isZoomEnabled } from "./client";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";

export async function createZoomMeeting(
  meetingId: string
): Promise<{ zoomMeetingId: string; joinUrl: string } | null> {
  if (!isZoomEnabled()) return null;

  try {
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) throw new Error("Meeting not found");

    const durationMinutes = Math.ceil(
      (new Date(meeting.endTime).getTime() -
        new Date(meeting.startTime).getTime()) /
        60000
    );

    const zoomMeeting = await createZoomMeetingApi({
      topic: meeting.title,
      start_time: meeting.startTime,
      duration: durationMinutes,
      timezone: "UTC",
    });

    if (!zoomMeeting) return null;

    await storage.updateMeeting(meetingId, {
      zoomMeetingId: zoomMeeting.id.toString(),
      zoomJoinUrl: zoomMeeting.join_url,
      location: zoomMeeting.join_url,
    });

    return {
      zoomMeetingId: zoomMeeting.id.toString(),
      joinUrl: zoomMeeting.join_url,
    };
  } catch (err) {
    logger.error({ err }, "API error");
    throw err;
  }
}

export async function updateZoomMeeting(
  meetingId: string,
  _updates: { startTime?: string; endTime?: string; title?: string }
): Promise<boolean> {
  if (!isZoomEnabled()) return false;

  try {
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting?.zoomMeetingId) return false;

    const apiData: { topic?: string; start_time?: string; duration?: number } = {};

    if (_updates.title) {
      apiData.topic = _updates.title;
    }

    if (_updates.startTime) {
      apiData.start_time = _updates.startTime;
    }

    if (_updates.startTime || _updates.endTime) {
      const startTime = _updates.startTime || meeting.startTime;
      const endTime = _updates.endTime || meeting.endTime;
      apiData.duration = Math.ceil(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
      );
    }

    const success = await updateZoomMeetingApi(meeting.zoomMeetingId, apiData);
    if (!success) return false;

    const localUpdates: Record<string, any> = {};
    if (_updates.title) localUpdates.title = _updates.title;
    if (_updates.startTime) localUpdates.startTime = _updates.startTime;
    if (_updates.endTime) localUpdates.endTime = _updates.endTime;

    if (Object.keys(localUpdates).length > 0) {
      await storage.updateMeeting(meetingId, localUpdates);
    }

    logger.info(`Zoom meeting ${meeting.zoomMeetingId} updated successfully`);
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to update Zoom meeting");
    return false;
  }
}

export async function cancelZoomMeeting(meetingId: string): Promise<boolean> {
  if (!isZoomEnabled()) return false;

  try {
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting?.zoomMeetingId) return false;

    const success = await deleteZoomMeetingApi(meeting.zoomMeetingId);
    if (!success) return false;

    await storage.updateMeeting(meetingId, {
      status: "cancelled",
      zoomMeetingId: null,
      zoomJoinUrl: null,
      location: null,
    });

    logger.info(`Zoom meeting ${meeting.zoomMeetingId} cancelled successfully`);
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to cancel Zoom meeting");
    return false;
  }
}
