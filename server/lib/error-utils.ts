const SAFE_ERROR_MESSAGES = new Set([
  "Draft not found",
  "Draft already approved",
  "Cannot modify approved draft",
  "Cannot modify discarded draft",
  "Job not found",
  "Client not found",
  "Meeting not found",
  "Template not found",
  "Report not found",
  "Version not found",
  "Profile not found",
  "Schema not found",
  "Conversation not found",
  "Calculator run not found",
  "No active schema for profile type",
]);

const SAFE_ERROR_PREFIXES = [
  "Cannot edit",
  "Cannot discard",
  "Version",
];

export function sanitizeErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);

  if (SAFE_ERROR_MESSAGES.has(message)) {
    return message;
  }

  for (const prefix of SAFE_ERROR_PREFIXES) {
    if (message.startsWith(prefix)) {
      return message;
    }
  }

  return fallback;
}

export function isNotFoundError(err: unknown): boolean {
  const message = err instanceof Error ? (err as Error).message : String(err);
  return message.includes("not found");
}
