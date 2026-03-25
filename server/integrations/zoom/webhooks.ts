import crypto from "crypto";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";
import { downloadAndProcessRecording } from "./recordings";

export function verifyZoomSignature(
  request: { headers: Record<string, string | undefined> },
  body: string
): boolean {
  const signature = request.headers["x-zoom-signature"];
  const timestamp = request.headers["x-zoom-request-timestamp"];

  if (!signature || !timestamp) return false;

  const requestTime = parseInt(timestamp) * 1000;
  if (Math.abs(Date.now() - requestTime) > 5 * 60 * 1000) {
    logger.warn("Zoom webhook timestamp too old");
    return false;
  }

  const message = `v0:${timestamp}:${body}`;
  const hashFor = crypto
    .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET || "")
    .update(message)
    .digest("hex");

  return `v0=${hashFor}` === signature;
}

export async function handleRecordingComplete(event: any): Promise<void> {
  try {
    const zoomRecordingId = event.object?.id;
    const zoomMeetingId = event.object?.uuid;

    logger.info(`Recording completed: ${zoomRecordingId}`);

    const meeting = await storage.getMeetingByZoomMeetingId(zoomMeetingId);
    if (!meeting) {
      logger.warn(`No meeting found for Zoom meeting ${zoomMeetingId}`);
      return;
    }

    downloadAndProcessRecording(zoomRecordingId, meeting.id).catch((err) => {
      logger.error({ err }, "Recording download failed");
    });
  } catch (err) {
    logger.error({ err }, "API error");
  }
}
