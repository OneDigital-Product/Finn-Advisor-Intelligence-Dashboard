import { isZoomEnabled, getRecordingsList, downloadRecording } from "./client";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";
import fs from "fs";
import path from "path";

const RECORDINGS_DIR = path.join(process.cwd(), "uploads", "recordings");

function ensureRecordingsDir(): void {
  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  }
}

export async function downloadAndProcessRecording(
  zoomRecordingId: string,
  meetingId: string
): Promise<{ success: boolean; transcriptId?: string; error?: string }> {
  if (!isZoomEnabled()) {
    return { success: false, error: "Zoom not enabled" };
  }

  let recordingId: string | null = null;

  try {
    const recording = await storage.createZoomRecording({
      meetingId,
      zoomRecordingId,
      status: "downloading",
    });
    recordingId = recording.id;

    logger.info(`Processing recording ${zoomRecordingId} for meeting ${meetingId}, recording id: ${recording.id}`);
    const recordingFiles = await getRecordingsList(zoomRecordingId);

    if (!recordingFiles || recordingFiles.length === 0) {
      await storage.updateZoomRecording(recording.id, { status: "failed" });
      return { success: false, error: "No recording files found" };
    }

    const audioFile = recordingFiles.find(
      (f: any) => f.file_type === "MP4" || f.file_type === "M4A"
    ) || recordingFiles[0];

    if (!audioFile?.download_url) {
      await storage.updateZoomRecording(recording.id, { status: "failed" });
      return { success: false, error: "No download URL available" };
    }

    const fileBuffer = await downloadRecording(audioFile.download_url);
    if (!fileBuffer) {
      await storage.updateZoomRecording(recording.id, { status: "failed" });
      return { success: false, error: "Failed to download recording file" };
    }

    ensureRecordingsDir();

    const extension = (audioFile.file_type || "mp4").toLowerCase();
    const fileName = `${zoomRecordingId}_${Date.now()}.${extension}`;
    const filePath = path.join(RECORDINGS_DIR, fileName);

    fs.writeFileSync(filePath, fileBuffer);

    await storage.updateZoomRecording(recording.id, {
      status: "completed",
      fileName,
      fileSize: fileBuffer.length,
      downloadedAt: new Date(),
    });

    logger.info(`Recording ${zoomRecordingId} downloaded successfully: ${fileName} (${fileBuffer.length} bytes)`);

    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "Recording download failed");
    if (recordingId) {
      await storage.updateZoomRecording(recordingId, { status: "failed" }).catch(() => {});
    }
    return { success: false, error: err.message };
  }
}
