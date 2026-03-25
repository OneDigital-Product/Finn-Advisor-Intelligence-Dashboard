/**
 * server/bootstrap.ts
 *
 * Process-level initialization that was previously inside the Express
 * server entry point (server/index.ts).  Now called once from
 * instrumentation.ts when the Next.js server starts.
 *
 * Responsibilities:
 *   1. Database connection + migrations
 *   2. Market-data provider registration (Yahoo, AlphaVantage, Finnhub + WS)
 *   3. Rate-limiter init (market-data + Cassidy)
 *   4. Feature-flag cache pre-warm
 *   5. Cassidy timeout-manager orphaned-job recovery
 *   6. Market-data cache-manager daily cleanup interval
 *   7. Scheduler (cron jobs)
 *   8. Salesforce ID audit (non-blocking)
 *   9. API-key metadata seeding
 *  10. Graceful-shutdown handlers (SIGTERM / SIGINT)
 */

import { pool, ensureDbConnection } from "./db";
import { runMigrations } from "./migrate";
import { logger } from "./lib/logger";
import { providerRegistry } from "./market-data/provider-registry";
import { YahooFinanceProvider } from "./market-data/providers/yahoo-provider";
import { FinnhubProvider } from "./market-data/providers/finnhub-provider";
import { FinnhubWebSocketClient } from "./market-data/finnhub-websocket";
import { AlphaVantageProvider } from "./market-data/providers/alpha-vantage-provider";
import { cacheManager } from "./market-data/cache-manager";
import { rateLimiter } from "./market-data/rate-limiter";
import { setWebSocketClient } from "./market-data/websocket-holder";
import { startScheduler, stopScheduler } from "./scheduler";
import { logEmailConfigurationStatus } from "./integrations/microsoft/email";
import { timeoutManager } from "./integrations/cassidy/timeout-manager";
import { rateLimiter as cassidyRateLimiter } from "./routes/cassidy/shared";
import { prewarmCache as prewarmFeatureFlags } from "./lib/feature-flags";
import { auditSalesforceIds } from "./integrations/salesforce/validate-salesforce-id";
import { storage } from "./storage";

// ---------------------------------------------------------------------------
// Guard against double-init during Next.js dev hot reloads
// ---------------------------------------------------------------------------
const g = globalThis as any;

export async function bootstrap(): Promise<void> {
  if (g.__bootstrapDone) {
    logger.info("Bootstrap already completed — skipping (hot reload)");
    return;
  }

  logger.info("Starting server bootstrap…");

  // 1. Database -----------------------------------------------------------
  await ensureDbConnection();
  try {
    await runMigrations();
  } catch (err) {
    logger.warn({ err }, "Migrations failed, continuing with existing schema");
  }

  // 2. Market-data providers ----------------------------------------------
  const yahooProvider = new YahooFinanceProvider();
  providerRegistry.register(yahooProvider);

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    const alphaVantageProvider = new AlphaVantageProvider(
      process.env.ALPHA_VANTAGE_API_KEY,
    );
    providerRegistry.register(alphaVantageProvider);
  } else {
    logger.info("ALPHA_VANTAGE_API_KEY not set — skipping Alpha Vantage");
  }

  if (process.env.FINNHUB_API_KEY) {
    const finnhubProvider = new FinnhubProvider(process.env.FINNHUB_API_KEY);
    providerRegistry.register(finnhubProvider);

    const finnhubWsUrl =
      process.env.FINNHUB_WEBSOCKET_URL ||
      `wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`;
    const finnhubWs = new FinnhubWebSocketClient(finnhubWsUrl);
    setWebSocketClient(finnhubWs);

    finnhubWs.connect().catch((error) => {
      logger.warn(
        { err: error },
        "Failed to connect Finnhub WebSocket; will retry on next request",
      );
    });
  } else {
    logger.info("FINNHUB_API_KEY not set — skipping Finnhub");
  }

  // 3. Email config status ------------------------------------------------
  logEmailConfigurationStatus();

  // 4. State recovery -----------------------------------------------------
  const recoveryActions: string[] = [];

  await rateLimiter.init();
  recoveryActions.push("Market data rate limiter initialized");

  const cassidyRlInitialized = await cassidyRateLimiter.init();
  recoveryActions.push(
    cassidyRlInitialized
      ? "Cassidy rate limiter initialized (DB-backed)"
      : "Cassidy rate limiter running in degraded in-memory mode",
  );

  const prewarmCount = await prewarmFeatureFlags();
  if (prewarmCount > 0) {
    recoveryActions.push(`Pre-warmed ${prewarmCount} feature flag(s)`);
  }

  const jobRecovery = await timeoutManager.recoverOrphanedJobs();
  if (jobRecovery.orphaned > 0) {
    recoveryActions.push(
      `Marked ${jobRecovery.orphaned} orphaned Cassidy job(s) as timed_out`,
    );
  }
  if (jobRecovery.rearmed > 0) {
    recoveryActions.push(
      `Re-armed timeouts for ${jobRecovery.rearmed} pending Cassidy job(s)`,
    );
  }

  const restoredProviders = await providerRegistry.restoreHealthMetrics();
  if (restoredProviders > 0) {
    recoveryActions.push(
      `Restored health metrics for ${restoredProviders} provider(s)`,
    );
  }

  if (recoveryActions.length > 0) {
    logger.info(
      { actions: recoveryActions },
      `Bootstrap recovery: ${recoveryActions.length} action(s)`,
    );
  }

  // 5. Periodic cleanup ---------------------------------------------------
  setInterval(() => cacheManager.cleanup(), 24 * 60 * 60 * 1000);

  // 6. Salesforce ID audit (fire-and-forget) ------------------------------
  auditSalesforceIds(storage).catch((err) => {
    logger.error({ err }, "Salesforce ID audit failed");
  });

  // 7. API key metadata defaults ------------------------------------------
  const defaultApiKeys = [
    { keyName: "OPENAI_API_KEY", integration: "OpenAI" },
    { keyName: "CASSIDY_API_KEY", integration: "Cassidy" },
    { keyName: "SALESFORCE_CLIENT_SECRET", integration: "Salesforce" },
    { keyName: "ORION_API_KEY", integration: "Orion" },
  ];
  for (const def of defaultApiKeys) {
    const existing = await storage.getApiKeyMetadata(def.keyName);
    if (!existing) {
      await storage.upsertApiKeyMetadata(def.keyName, {
        integration: def.integration,
      });
    }
  }
  logger.info("API key metadata defaults seeded");

  // 8. Scheduler ----------------------------------------------------------
  startScheduler();

  // 9. Graceful shutdown --------------------------------------------------
  registerShutdownHandlers();

  g.__bootstrapDone = true;
  logger.info("Server bootstrap complete");
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------
let shutdownInProgress = false;

async function shutdown(signal: string): Promise<void> {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  logger.info({ signal }, "Graceful shutdown initiated");

  try {
    await stopScheduler();
    logger.info("Scheduler stopped");
  } catch (err) {
    logger.error({ err }, "Error stopping scheduler");
  }

  try {
    await cassidyRateLimiter.shutdown();
    logger.info("Cassidy rate limiter state flushed");
  } catch (err) {
    logger.error({ err }, "Error flushing Cassidy rate limiter");
  }

  try {
    await pool.end();
    logger.info("Database pool closed");
  } catch (err) {
    logger.error({ err }, "Error closing database pool");
  }

  setTimeout(() => {
    logger.warn("Forced shutdown after 30 s timeout");
    process.exit(1);
  }, 30_000).unref();
}

function registerShutdownHandlers(): void {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Unhandled rejection — shutting down");
    shutdown("unhandledRejection").finally(() => process.exit(1));
  });

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception — shutting down");
    shutdown("uncaughtException").finally(() => process.exit(1));
  });
}
