/**
 * API Key Rotation Procedure for Cassidy:
 * 1. Log in to https://app.cassidyai.com.
 * 2. Navigate to Settings > API Keys.
 * 3. Generate a new API key.
 * 4. Update CASSIDY_API_KEY in the environment variables.
 * 5. If using webhooks, verify CASSIDY_WEBHOOK_URL and CASSIDY_ORCHESTRATION_WEBHOOK_URL are still valid.
 * 6. Revoke the old key from the Cassidy dashboard.
 * 7. Mark the key as rotated in Admin > API Key Rotation.
 */
import { logger } from "./logger";

const CASSIDY_BASE_URL = "https://app.cassidyai.com/api/assistants";
const ASSISTANT_ID = process.env.CASSIDY_ASSISTANT_ID || "cml7j0m17014dqv1du8jur3cp";

export const CASSIDY_ORCHESTRATION_URL =
  process.env.CASSIDY_ORCHESTRATION_WEBHOOK_URL ||
  process.env.CASSIDY_WEBHOOK_URL ||
  "";

export const CASSIDY_SUBROUTER_URL =
  process.env.CASSIDY_SUBROUTER_WEBHOOK_URL ||
  process.env.CASSIDY_WEBHOOK_URL ||
  "";

export const VALID_FINN_MODES = [
  "conversation",
  "email",
  "cheat_sheet",
  "pdf",
  "brand",
  "builder",
] as const;

export type FinnMode = (typeof VALID_FINN_MODES)[number];

function getApiKey(): string | null {
  return process.env.CASSIDY_API_KEY || null;
}

export function isCassidyAvailable(): boolean {
  return !!getApiKey();
}

async function cassidyRequest(path: string, body: Record<string, any>): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Cassidy API key not configured");

  const response = await fetch(`${CASSIDY_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    logger.error({ status: response.status, error: errorText }, "Cassidy API error");
    throw new Error(`Cassidy API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function createThread(): Promise<string> {
  const result = await cassidyRequest("/thread/create", {
    assistant_id: ASSISTANT_ID,
  });
  return result.thread_id || result.id || result.threadId;
}

export async function sendMessage(threadId: string, message: string): Promise<string> {
  const result = await cassidyRequest("/message/create", {
    thread_id: threadId,
    message,
  });
  return result.response || result.message || result.content || result.answer || JSON.stringify(result);
}

export async function chat(message: string): Promise<string> {
  const threadId = await createThread();
  const response = await sendMessage(threadId, message);
  return response;
}
