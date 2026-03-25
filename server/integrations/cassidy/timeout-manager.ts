import { storage } from "../../storage";
import { cassidyJobs } from "@shared/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { jobEventBus } from "./event-bus";
import { logger } from "../../lib/logger";

interface TimeoutTracker {
  jobId: string;
  timeoutId: NodeJS.Timeout;
  startTime: number;
}

class TimeoutManager {
  private trackedJobs = new Map<string, TimeoutTracker>();
  private readonly TIMEOUT_MS = 120000;

  async recoverOrphanedJobs(): Promise<{ orphaned: number; rearmed: number }> {
    try {
      const cutoff = new Date(Date.now() - this.TIMEOUT_MS);

      const pendingJobs = await storage.db
        .select({ jobId: cassidyJobs.jobId, createdAt: cassidyJobs.createdAt })
        .from(cassidyJobs)
        .where(eq(cassidyJobs.status, "pending"));

      if (pendingJobs.length === 0) return { orphaned: 0, rearmed: 0 };

      const orphanedJobs = pendingJobs.filter(j => j.createdAt && j.createdAt < cutoff);
      const recentPending = pendingJobs.filter(j => j.createdAt && j.createdAt >= cutoff);

      if (orphanedJobs.length > 0) {
        const orphanedJobIds = orphanedJobs.map(j => j.jobId);

        await storage.db
          .update(cassidyJobs)
          .set({ status: "timed_out", updatedAt: new Date() })
          .where(inArray(cassidyJobs.jobId, orphanedJobIds));

        for (const { jobId } of orphanedJobs) {
          jobEventBus.publishJobUpdate({
            type: "timeout",
            job_id: jobId,
            status: "timed_out",
            error: "Job was orphaned after server restart and marked as timed out",
            timestamp: new Date().toISOString(),
          });
        }

        logger.info({ count: orphanedJobs.length, jobIds: orphanedJobIds }, "Recovered orphaned pending jobs on startup");
      }

      let rearmed = 0;
      for (const job of recentPending) {
        const elapsed = Date.now() - (job.createdAt?.getTime() ?? Date.now());
        const remaining = Math.max(0, this.TIMEOUT_MS - elapsed);
        if (remaining > 0) {
          this.startTimeoutWithDuration(job.jobId, remaining);
          rearmed++;
          logger.info({ jobId: job.jobId, remainingMs: remaining }, "Re-armed timeout for recent pending job");
        } else {
          await this.markJobTimedOut(job.jobId, "Job exceeded timeout after server restart");
        }
      }

      return { orphaned: orphanedJobs.length, rearmed };
    } catch (err) {
      logger.error({ err }, "Failed to recover orphaned jobs on startup");
      return { orphaned: 0, rearmed: 0 };
    }
  }

  private startTimeoutWithDuration(jobId: string, durationMs: number): void {
    this.clearTimeout(jobId);

    const timeoutId = setTimeout(async () => {
      await this.markJobTimedOut(jobId, "Job did not complete within 120 seconds");
    }, durationMs);

    this.trackedJobs.set(jobId, { jobId, timeoutId, startTime: Date.now() - (this.TIMEOUT_MS - durationMs) });
  }

  private async markJobTimedOut(jobId: string, error: string): Promise<void> {
    try {
      logger.warn({ jobId }, "Job timed out, marking as timed_out");

      await storage.db
        .update(cassidyJobs)
        .set({ status: "timed_out", updatedAt: new Date() })
        .where(eq(cassidyJobs.jobId, jobId));

      jobEventBus.publishJobUpdate({
        type: "timeout",
        job_id: jobId,
        status: "timed_out",
        error,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err, jobId }, "Error processing timeout");
    } finally {
      this.trackedJobs.delete(jobId);
    }
  }

  startTimeout(jobId: string): void {
    this.startTimeoutWithDuration(jobId, this.TIMEOUT_MS);
  }

  clearTimeout(jobId: string): void {
    const tracker = this.trackedJobs.get(jobId);
    if (tracker) {
      clearTimeout(tracker.timeoutId);
      this.trackedJobs.delete(jobId);
    }
  }

  getTimeoutInfo(jobId: string): { remaining: number } | null {
    const tracker = this.trackedJobs.get(jobId);
    if (!tracker) return null;
    const elapsed = Date.now() - tracker.startTime;
    return { remaining: Math.max(0, this.TIMEOUT_MS - elapsed) };
  }

  getTrackedJobs(): string[] {
    return Array.from(this.trackedJobs.keys());
  }

  destroy(): void {
    for (const [, tracker] of this.trackedJobs) {
      clearTimeout(tracker.timeoutId);
    }
    this.trackedJobs.clear();
  }
}

export const timeoutManager = new TimeoutManager();
