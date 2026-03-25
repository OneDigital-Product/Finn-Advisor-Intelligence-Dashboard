import { logger } from "../../lib/logger";

const activeSyncLocks = new Map<string, Promise<void>>();

export async function withSyncLock<T>(
  advisorId: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = `${advisorId}:${operation}`;

  while (activeSyncLocks.has(lockKey)) {
    logger.info({ lockKey }, "Waiting for existing sync lock to release");
    await activeSyncLocks.get(lockKey);
  }

  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  activeSyncLocks.set(lockKey, lockPromise);

  try {
    return await fn();
  } finally {
    activeSyncLocks.delete(lockKey);
    releaseLock!();
  }
}
