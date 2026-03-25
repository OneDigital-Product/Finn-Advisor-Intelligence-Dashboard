import * as cron from "node-cron";
import { logger } from "./lib/logger";
import { AlertEngine } from "./engines/alert-engine";
import { checkAndCreateReminders } from "./engines/reminder-engine";
import { generateInsightsForAdvisor, pruneExpiredInsights } from "./engines/insights-engine";
import { checkMilestoneProgression } from "./engines/onboarding-engine";
import { prefetchEngine } from "./market-data/prefetch-engine";
import { processAllFeeds } from "./engines/feed-ingestion-engine";
import { runAutomatedScreening } from "./routes/kyc-aml";
import { syncAllAccounts } from "./integrations/orion/portfolio-sync";
import { isOrionEnabled } from "./integrations/orion/client";
import { storage } from "./storage";
import { db } from "./db";
import { cassidyJobs, alerts } from "@shared/schema";
import { and, lt, inArray, eq, isNull } from "drizzle-orm";

const KEY_ROTATION_WARNING_DAYS = 90;
const KEY_EXPIRY_WARNING_DAYS = 14;

const scheduledTasks: ReturnType<typeof cron.schedule>[] = [];
const activeJobs = new Map<string, Promise<void>>();
const TIMEZONE = "America/New_York";

const DEFAULT_PORTFOLIO_SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000;
const MIN_PORTFOLIO_SYNC_INTERVAL_MS = 60 * 1000;
let portfolioSyncIntervalId: ReturnType<typeof setInterval> | null = null;
let lastPortfolioSyncAt: Date | null = null;
let lastPortfolioSyncAttemptAt: Date | null = null;
let portfolioSyncIntervalMs: number = DEFAULT_PORTFOLIO_SYNC_INTERVAL_MS;
let portfolioSyncStartedAt: Date | null = null;

async function runJob(name: string, fn: () => Promise<void>): Promise<void> {
  if (activeJobs.has(name)) {
    logger.warn({ job: name }, `[Scheduler] Skipping job (previous run still active): ${name}`);
    return;
  }

  const start = Date.now();
  logger.info({ job: name }, `[Scheduler] Starting job: ${name}`);

  const jobPromise = (async () => {
    try {
      await fn();
      const duration = Date.now() - start;
      logger.info({ job: name, duration_ms: duration }, `[Scheduler] Job completed: ${name}`);
    } catch (err) {
      const duration = Date.now() - start;
      logger.error({ job: name, err, duration_ms: duration }, `[Scheduler] Job failed: ${name}`);
    } finally {
      activeJobs.delete(name);
    }
  })();

  activeJobs.set(name, jobPromise);
  await jobPromise;
}

async function runAlertGeneration(): Promise<void> {
  const engine = new AlertEngine();
  const advisors = await storage.getAllAdvisors();
  let totalInserted = 0;
  let totalErrors = 0;

  for (const advisor of advisors) {
    try {
      const result = await engine.run(advisor.id);
      totalInserted += result.inserted;
      totalErrors += result.errors.length;
    } catch (err) {
      logger.error({ err, advisorId: advisor.id }, "[Scheduler] Alert generation failed for advisor");
      totalErrors++;
    }
  }

  logger.info({ totalInserted, totalErrors, advisorCount: advisors.length }, "[Scheduler] Alert generation summary");
}

async function runReminderChecks(): Promise<void> {
  const advisors = await storage.getAllAdvisors();
  let totalCreated = 0;
  let totalErrors = 0;

  for (const advisor of advisors) {
    try {
      const result = await checkAndCreateReminders(storage, advisor.id);
      totalCreated += result.createdTasks;
      totalErrors += result.tasksWithErrors;
    } catch (err) {
      logger.error({ err, advisorId: advisor.id }, "[Scheduler] Reminder check failed for advisor");
      totalErrors++;
    }
  }

  logger.info({ totalCreated, totalErrors, advisorCount: advisors.length }, "[Scheduler] Reminder check summary");
}

async function runInsightGeneration(): Promise<void> {
  await pruneExpiredInsights();

  const advisors = await storage.getAllAdvisors();
  let totalGenerated = 0;
  let totalErrors = 0;

  for (const advisor of advisors) {
    try {
      const summary = await generateInsightsForAdvisor(advisor.id);
      totalGenerated += summary.totalGenerated;
    } catch (err) {
      logger.error({ err, advisorId: advisor.id }, "[Scheduler] Insight generation failed for advisor");
      totalErrors++;
    }
  }

  logger.info({ totalGenerated, totalErrors, advisorCount: advisors.length }, "[Scheduler] Insight generation summary");
}

async function runMarketDataPrefetch(): Promise<void> {
  const advisors = await storage.getAllAdvisors();
  let successCount = 0;
  let errorCount = 0;

  for (const advisor of advisors) {
    try {
      await prefetchEngine.prefetchClientPortfolios(advisor.id);
      successCount++;
    } catch (err) {
      logger.error({ err, advisorId: advisor.id }, "[Scheduler] Market data prefetch failed for advisor");
      errorCount++;
    }
  }

  logger.info({ successCount, errorCount, advisorCount: advisors.length }, "[Scheduler] Market data prefetch summary");
}

async function runOnboardingMilestoneChecks(): Promise<void> {
  const advisors = await storage.getAllAdvisors();
  let totalChecked = 0;
  let totalEmails = 0;
  let totalTransitioned = 0;

  for (const advisor of advisors) {
    try {
      const result = await checkMilestoneProgression(storage, advisor.id);
      totalChecked += result.checked;
      totalEmails += result.emailsSent;
      totalTransitioned += result.transitioned;
    } catch (err) {
      logger.error({ err, advisorId: advisor.id }, "[Scheduler] Onboarding milestone check failed for advisor");
    }
  }

  logger.info({ totalChecked, totalEmails, totalTransitioned, advisorCount: advisors.length }, "[Scheduler] Onboarding milestone check summary");
}

async function runFeedIngestion(): Promise<void> {
  const result = await processAllFeeds();
  logger.info(result, "[Scheduler] Feed ingestion summary");
}

async function runKycRescreening(): Promise<void> {
  const advisors = await storage.getAllAdvisors();
  let totalScreened = 0;
  let totalMatches = 0;
  let totalErrors = 0;

  for (const advisor of advisors) {
    try {
      const config = await storage.getScreeningConfig(advisor.id);
      if (!config) continue;

      const frequencyDays = config.rescreeningFrequencyDays || 90;
      const lastRun = config.lastRescreeningRun;

      if (lastRun) {
        const daysSinceLastRun = Math.floor((Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastRun < frequencyDays) {
          logger.info({ advisorId: advisor.id, daysSinceLastRun, frequencyDays }, "[Scheduler] Skipping re-screening (not due yet)");
          continue;
        }
      }

      const clients = await storage.getClients(advisor.id);
      for (const client of clients) {
        try {
          const result = await runAutomatedScreening(client.id, advisor.id, advisor.name);
          if (result) {
            totalScreened++;
            totalMatches += result.screeningResult.matches.length;
          }
        } catch (err) {
          logger.error({ err, clientId: client.id }, "[Scheduler] Re-screening failed for client");
          totalErrors++;
        }
      }

      await storage.updateScreeningConfig(config.id, {
        lastRescreeningRun: new Date(),
      });
    } catch (err) {
      logger.error({ err, advisorId: advisor.id }, "[Scheduler] Re-screening failed for advisor");
      totalErrors++;
    }
  }

  logger.info({ totalScreened, totalMatches, totalErrors, advisorCount: advisors.length }, "[Scheduler] KYC re-screening summary");
}

async function runApiKeyRotationCheck(): Promise<void> {
  const keys = await storage.getAllApiKeyMetadata();
  const now = Date.now();
  const advisors = await storage.getAllAdvisors();
  if (advisors.length === 0) return;

  const existingAlerts = await db.select({ message: alerts.message, advisorId: alerts.advisorId })
    .from(alerts)
    .where(
      and(
        eq(alerts.alertType, "key_rotation"),
        isNull(alerts.dismissedAt)
      )
    );
  const existingAlertKeyNames = new Set<string>();
  for (const a of existingAlerts) {
    const match = a.message?.match(/^API key "([^"]+)"/);
    if (match) {
      existingAlertKeyNames.add(`${a.advisorId}::${match[1]}`);
    }
  }

  let alertCount = 0;
  for (const key of keys) {
    const lastRotated = key.lastRotatedAt ? new Date(key.lastRotatedAt).getTime() : null;
    const ageDays = lastRotated ? Math.floor((now - lastRotated) / (1000 * 60 * 60 * 24)) : -1;
    const expiresAt = key.expiresAt ? new Date(key.expiresAt).getTime() : null;
    const daysUntilExpiry = expiresAt ? Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

    let shouldAlert = false;
    let alertMessage = "";
    let severity = "warning";

    if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
      shouldAlert = true;
      severity = "critical";
      alertMessage = `API key "${key.keyName}" (${key.integration}) has expired ${Math.abs(daysUntilExpiry)} day(s) ago. Immediate rotation required.`;
    } else if (daysUntilExpiry !== null && daysUntilExpiry <= KEY_EXPIRY_WARNING_DAYS) {
      shouldAlert = true;
      severity = "warning";
      alertMessage = `API key "${key.keyName}" (${key.integration}) expires in ${daysUntilExpiry} day(s). Plan rotation soon.`;
    } else if (ageDays >= KEY_ROTATION_WARNING_DAYS && ageDays >= 0) {
      shouldAlert = true;
      severity = "warning";
      alertMessage = `API key "${key.keyName}" (${key.integration}) is ${ageDays} days old. Consider rotating for security.`;
    }

    if (shouldAlert) {
      for (const advisor of advisors) {
        const dedupeKey = `${advisor.id}::${key.keyName}`;
        if (existingAlertKeyNames.has(dedupeKey)) continue;
        await storage.createAlert({
          advisorId: advisor.id,
          type: "system",
          severity,
          title: "API Key Rotation Reminder",
          message: alertMessage,
          alertType: "key_rotation",
        });
        existingAlertKeyNames.add(dedupeKey);
        alertCount++;
      }
    }
  }

  logger.info({ alertCount, totalKeys: keys.length, advisorCount: advisors.length }, "[Scheduler] API key rotation check summary");
}

async function runStaleCassidyJobCleanup(): Promise<void> {
  const staleThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const staleRows = await db
    .select({ jobId: cassidyJobs.jobId })
    .from(cassidyJobs)
    .where(
      and(
        inArray(cassidyJobs.status, ["pending", "processing"]),
        lt(cassidyJobs.createdAt, staleThreshold)
      )
    );

  if (staleRows.length > 0) {
    const staleJobIds = staleRows.map((r) => r.jobId);
    await db
      .update(cassidyJobs)
      .set({ status: "timed_out", updatedAt: new Date() })
      .where(inArray(cassidyJobs.jobId, staleJobIds));
  }

  logger.info({ cleaned: staleRows.length }, "[Scheduler] Stale Cassidy job cleanup summary");
}

async function runPortfolioSync(): Promise<void> {
  if (!isOrionEnabled()) {
    logger.info("[Scheduler] Portfolio sync skipped — Orion not enabled");
    return;
  }

  lastPortfolioSyncAttemptAt = new Date();
  try {
    const result = await syncAllAccounts();
    lastPortfolioSyncAt = new Date();
    logger.info(
      { synced: result.synced, failed: result.failed, recordsProcessed: result.recordsProcessed },
      "[Scheduler] Portfolio sync summary"
    );
  } catch (err) {
    logger.error({ err }, "[Scheduler] Portfolio sync failed");
  }
}

export function getPortfolioSyncSchedule(): {
  enabled: boolean;
  intervalMs: number;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
} {
  const enabled = portfolioSyncIntervalId !== null;
  let nextSyncAt: Date | null = null;

  if (enabled) {
    const anchor = lastPortfolioSyncAttemptAt || portfolioSyncStartedAt;
    if (anchor) {
      nextSyncAt = new Date(anchor.getTime() + portfolioSyncIntervalMs);
    }
  }

  return {
    enabled,
    intervalMs: portfolioSyncIntervalMs,
    lastSyncAt: lastPortfolioSyncAt,
    nextSyncAt,
  };
}

export function startScheduler(): void {
  if (process.env.DISABLE_SCHEDULER === "true") {
    logger.info("[Scheduler] Disabled via DISABLE_SCHEDULER env var");
    return;
  }

  logger.info("[Scheduler] Starting scheduled job runner");

  const tz = { timezone: TIMEZONE };

  scheduledTasks.push(
    cron.schedule("0 */6 * * *", () => {
      runJob("alert-generation", runAlertGeneration);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("0 8 * * *", () => {
      runJob("reminder-checks", runReminderChecks);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("0 2 * * 1", () => {
      runJob("insight-generation", runInsightGeneration);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("30 9 * * 1-5", () => {
      runJob("market-data-prefetch", runMarketDataPrefetch);
    }, tz)
  );
  scheduledTasks.push(
    cron.schedule("0,30 10-15 * * 1-5", () => {
      runJob("market-data-prefetch", runMarketDataPrefetch);
    }, tz)
  );
  scheduledTasks.push(
    cron.schedule("0 16 * * 1-5", () => {
      runJob("market-data-prefetch", runMarketDataPrefetch);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("0 * * * *", () => {
      runJob("stale-cassidy-job-cleanup", runStaleCassidyJobCleanup);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("0 9 * * *", () => {
      runJob("onboarding-milestone-checks", runOnboardingMilestoneChecks);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("0 */6 * * *", () => {
      runJob("feed-ingestion", runFeedIngestion);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("0 3 * * 0", () => {
      runJob("kyc-rescreening", runKycRescreening);
    }, tz)
  );

  scheduledTasks.push(
    cron.schedule("0 7 * * *", () => {
      runJob("api-key-rotation-check", runApiKeyRotationCheck);
    }, tz)
  );

  if (isOrionEnabled()) {
    const envRaw = process.env.PORTFOLIO_SYNC_INTERVAL;
    const envInterval = envRaw && /^\d+$/.test(envRaw) ? parseInt(envRaw, 10) : NaN;
    if (Number.isFinite(envInterval) && envInterval >= MIN_PORTFOLIO_SYNC_INTERVAL_MS) {
      portfolioSyncIntervalMs = envInterval;
    } else {
      if (envRaw) {
        logger.warn(
          { value: envRaw, minimumMs: MIN_PORTFOLIO_SYNC_INTERVAL_MS },
          "[Scheduler] Invalid PORTFOLIO_SYNC_INTERVAL, using default"
        );
      }
      portfolioSyncIntervalMs = DEFAULT_PORTFOLIO_SYNC_INTERVAL_MS;
    }

    portfolioSyncStartedAt = new Date();
    portfolioSyncIntervalId = setInterval(() => {
      runJob("portfolio-sync", runPortfolioSync);
    }, portfolioSyncIntervalMs);

    logger.info(
      { intervalMs: portfolioSyncIntervalMs, intervalHours: portfolioSyncIntervalMs / (60 * 60 * 1000) },
      "[Scheduler] Portfolio sync scheduled"
    );
  } else {
    logger.info("[Scheduler] Portfolio sync not started — Orion not enabled");
  }

  const jobsList = [
    "alert-generation: every 6 hours (ET)",
    "reminder-checks: daily at 8am ET",
    "insight-generation: weekly Monday 2am ET",
    "market-data-prefetch: every 30min 9:30am-4pm ET weekdays",
    "stale-cassidy-job-cleanup: every hour (ET)",
    "onboarding-milestone-checks: daily at 9am ET",
    "feed-ingestion: every 6 hours (ET)",
    "kyc-rescreening: weekly Sunday 3am ET",
    "api-key-rotation-check: daily at 7am ET",
  ];

  if (isOrionEnabled()) {
    jobsList.push(`portfolio-sync: every ${portfolioSyncIntervalMs / (60 * 60 * 1000)}h`);
  }

  logger.info({ jobs: jobsList }, "[Scheduler] All jobs registered");
}

export async function stopScheduler(): Promise<void> {
  if (portfolioSyncIntervalId) {
    clearInterval(portfolioSyncIntervalId);
    portfolioSyncIntervalId = null;
    portfolioSyncStartedAt = null;
    lastPortfolioSyncAttemptAt = null;
  }

  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;

  if (activeJobs.size > 0) {
    logger.info({ activeCount: activeJobs.size }, "[Scheduler] Waiting for active jobs to complete...");
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 15000));
    await Promise.race([
      Promise.all(activeJobs.values()),
      timeout,
    ]);
  }

  logger.info("[Scheduler] All jobs stopped");
}
