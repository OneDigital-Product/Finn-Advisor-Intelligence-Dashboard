import axios, { type AxiosInstance } from "axios";
import { logger } from "../../lib/logger";

const ZOOM_CONFIG = {
  accountId: process.env.ZOOM_ACCOUNT_ID,
  clientId: process.env.ZOOM_CLIENT_ID,
  clientSecret: process.env.ZOOM_CLIENT_SECRET,
  baseUrl: "https://zoom.us/v2",
};

let accessToken: string | null = null;
let tokenExpiry = 0;
let zoomClient: AxiosInstance | null = null;

function isZoomEnabled(): boolean {
  return (
    process.env.ZOOM_ENABLED === "true" &&
    !!ZOOM_CONFIG.clientId &&
    !!ZOOM_CONFIG.clientSecret
  );
}

async function getAccessToken(): Promise<string | null> {
  if (!isZoomEnabled()) return null;

  const now = Date.now() / 1000;
  if (accessToken && tokenExpiry > now + 60) {
    return accessToken;
  }

  try {
    const jwtModule = await import("jsonwebtoken");
    const jwt = jwtModule.default || jwtModule;

    const payload = {
      iss: ZOOM_CONFIG.clientId,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = jwt.sign(payload, ZOOM_CONFIG.clientSecret || "");

    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: token,
      },
    });

    accessToken = response.data.access_token;
    tokenExpiry = Math.floor(Date.now() / 1000) + response.data.expires_in;

    return accessToken;
  } catch (err: any) {
    logger.error({ err }, "Zoom token error");
    return null;
  }
}

async function getZoomClient(): Promise<AxiosInstance | null> {
  if (!isZoomEnabled()) return null;

  const token = await getAccessToken();
  if (!token) return null;

  if (!zoomClient) {
    zoomClient = axios.create({
      baseURL: ZOOM_CONFIG.baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } else {
    zoomClient.defaults.headers.Authorization = `Bearer ${token}`;
  }

  return zoomClient;
}

async function validateConnection(): Promise<boolean> {
  if (!isZoomEnabled()) return false;

  try {
    const client = await getZoomClient();
    if (!client) return false;
    const response = await client.get("/users/me");
    return response.status === 200;
  } catch (err: any) {
    logger.error({ err }, "Zoom validation failed");
    return false;
  }
}

async function createZoomMeetingApi(data: {
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
}): Promise<{ id: string; join_url: string } | null> {
  const client = await getZoomClient();
  if (!client) return null;

  const response = await client.post("/users/me/meetings", {
    topic: data.topic,
    type: 2,
    start_time: data.start_time,
    duration: data.duration,
    timezone: data.timezone,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: true,
      auto_recording: "cloud",
    },
  });

  return {
    id: response.data.id,
    join_url: response.data.join_url,
  };
}

async function updateZoomMeetingApi(
  zoomMeetingId: string,
  data: { topic?: string; start_time?: string; duration?: number }
): Promise<boolean> {
  const client = await getZoomClient();
  if (!client) return false;

  await client.patch(`/meetings/${zoomMeetingId}`, data);
  return true;
}

async function deleteZoomMeetingApi(zoomMeetingId: string): Promise<boolean> {
  const client = await getZoomClient();
  if (!client) return false;

  await client.delete(`/meetings/${zoomMeetingId}`);
  return true;
}

async function getRecordingsList(meetingId: string): Promise<any[]> {
  const client = await getZoomClient();
  if (!client) return [];

  const response = await client.get(`/meetings/${meetingId}/recordings`);
  return response.data.recording_files || [];
}

async function downloadRecording(downloadUrl: string): Promise<Buffer | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await axios.get(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "arraybuffer",
  });
  return response.data;
}

export {
  getAccessToken,
  getZoomClient,
  validateConnection,
  createZoomMeetingApi,
  updateZoomMeetingApi,
  deleteZoomMeetingApi,
  getRecordingsList,
  downloadRecording,
  isZoomEnabled,
};
