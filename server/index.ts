/**
 * @deprecated — This Express entry point has been replaced by Next.js App Router.
 * Process-level initialization now lives in server/bootstrap.ts, called from
 * instrumentation.ts when the Next.js server starts.
 *
 * This file is kept only as a reference for the old Express route registrations
 * and test infrastructure. It is NOT used at runtime.
 */
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { PgRateLimitStore } from "./lib/db-rate-limiter";
import { registerRoutes } from "./routes";
import { registerParamValidators } from "./routes/middleware";
// serveStatic removed — Next.js handles frontend serving
import { createServer } from "http";
import { pool, ensureDbConnection } from "./db";
import { runMigrations } from "./migrate";
import { logger } from "./lib/logger";
import { initSentry, errorHandler } from "./lib/error-handler";
import { providerRegistry } from "./market-data/provider-registry";
import { YahooFinanceProvider } from "./market-data/providers/yahoo-provider";
import { FinnhubProvider } from "./market-data/providers/finnhub-provider";
import { FinnhubWebSocketClient } from "./market-data/finnhub-websocket";
import { AlphaVantageProvider } from "./market-data/providers/alpha-vantage-provider";
import { cacheManager } from "./market-data/cache-manager";
import { rateLimiter } from "./market-data/rate-limiter";
import { setWebSocketClient } from "./routes/market";
import { startScheduler, stopScheduler } from "./scheduler";
import { logEmailConfigurationStatus } from "./integrations/microsoft/email";
import { timeoutManager } from "./integrations/cassidy/timeout-manager";
import { rateLimiter as cassidyRateLimiter } from "./routes/cassidy/shared";
import { prewarmCache as prewarmFeatureFlags } from "./lib/feature-flags";
import { auditSalesforceIds } from "./integrations/salesforce/validate-salesforce-id";
import { storage } from "./storage";

initSentry();

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET environment variable is required and must be at least 32 characters long"
  );
}

const app = express();
const httpServer = createServer(app);

const isDev = process.env.NODE_ENV !== "production";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isDev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: isDev
        ? ["'self'", "https://api.openai.com", "ws:", "wss:"]
        : ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: isDev ? ["'self'", "https://*.replit.dev", "https://*.replit.app"] : ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isDev ? false : {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [];

if (allowedOrigins.length === 0 && process.env.NODE_ENV === "production") {
  logger.warn("CORS_ORIGIN is not configured — all cross-origin requests will be denied in production");
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PgRateLimitStore({ tableName: "rate_limit_general" }),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PgRateLimitStore({ tableName: "rate_limit_login", failClosed: true }),
});

app.use("/api/", generalLimiter);
registerParamValidators(app);
app.use("/api/auth/login", loginLimiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    userType: "advisor" | "associate";
    userName: string;
    userEmail: string;
    userAvatarUrl?: string;
  }
}

const PgStore = connectPgSimple(session);

if (!isDev) {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: !isDev,
      sameSite: "lax",
    },
  })
);

app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      logger.info({
        method: req.method,
        path: reqPath,
        statusCode: res.statusCode,
        duration,
      }, `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

let gracefulShutdown: ((signal: string) => Promise<void>) | null = null;

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection — initiating shutdown");
  if (gracefulShutdown) {
    gracefulShutdown("unhandledRejection").finally(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — initiating shutdown");
  if (gracefulShutdown) {
    gracefulShutdown("uncaughtException").finally(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

(async () => {
  await ensureDbConnection();
  try {
    await runMigrations();
  } catch (err) {
    logger.warn({ err }, "Migrations failed, continuing with existing schema");
  }

  const yahooProvider = new YahooFinanceProvider();
  providerRegistry.register(yahooProvider);

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    const alphaVantageProvider = new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY);
    providerRegistry.register(alphaVantageProvider);
  } else {
    logger.info("ALPHA_VANTAGE_API_KEY not set, skipping Alpha Vantage provider registration");
  }

  logEmailConfigurationStatus();

  logger.info("Starting state recovery checks...");
  const recoveryActions: string[] = [];

  await rateLimiter.init();
  recoveryActions.push("Market data rate limiter initialized with persistent storage");

  const cassidyRlInitialized = await cassidyRateLimiter.init();
  recoveryActions.push(
    cassidyRlInitialized
      ? "Cassidy rate limiter initialized with DB-backed state"
      : "Cassidy rate limiter running in degraded in-memory mode (DB init failed)"
  );

  const prewarmCount = await prewarmFeatureFlags();
  if (prewarmCount > 0) {
    recoveryActions.push(`Pre-warmed ${prewarmCount} feature flag(s) into cache`);
  }

  const jobRecovery = await timeoutManager.recoverOrphanedJobs();
  if (jobRecovery.orphaned > 0) {
    recoveryActions.push(`Marked ${jobRecovery.orphaned} orphaned Cassidy job(s) as timed_out`);
  }
  if (jobRecovery.rearmed > 0) {
    recoveryActions.push(`Re-armed timeouts for ${jobRecovery.rearmed} recent pending Cassidy job(s)`);
  }

  setInterval(() => cacheManager.cleanup(), 24 * 60 * 60 * 1000);

  if (process.env.FINNHUB_API_KEY) {
    const finnhubProvider = new FinnhubProvider(process.env.FINNHUB_API_KEY);
    providerRegistry.register(finnhubProvider);

    const finnhubWsUrl = process.env.FINNHUB_WEBSOCKET_URL || `wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`;
    const finnhubWs = new FinnhubWebSocketClient(finnhubWsUrl);
    setWebSocketClient(finnhubWs);

    finnhubWs.connect().catch(error => {
      logger.warn({ err: error }, "Failed to connect Finnhub WebSocket; will retry on next request");
    });
  } else {
    logger.info("FINNHUB_API_KEY not set, skipping Finnhub provider registration");
  }

  const restoredProviders = await providerRegistry.restoreHealthMetrics();
  if (restoredProviders > 0) {
    recoveryActions.push(`Restored health metrics for ${restoredProviders} market data provider(s)`);
  }

  if (recoveryActions.length > 0) {
    logger.info({ actions: recoveryActions }, `Startup recovery complete: ${recoveryActions.length} action(s) taken`);
  } else {
    logger.info("Startup recovery complete: no recovery actions needed");
  }

  auditSalesforceIds(storage).catch((err) => {
    logger.error({ err }, "Salesforce ID audit failed during startup");
  });

  const defaultApiKeys = [
    { keyName: "OPENAI_API_KEY", integration: "OpenAI" },
    { keyName: "CASSIDY_API_KEY", integration: "Cassidy" },
    { keyName: "SALESFORCE_CLIENT_SECRET", integration: "Salesforce" },
    { keyName: "ORION_API_KEY", integration: "Orion" },
  ];
  for (const def of defaultApiKeys) {
    const existing = await storage.getApiKeyMetadata(def.keyName);
    if (!existing) {
      await storage.upsertApiKeyMetadata(def.keyName, { integration: def.integration });
    }
  }
  logger.info("API key metadata defaults seeded");

  await registerRoutes(httpServer, app);

  startScheduler();

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    if (status >= 500) {
      errorHandler(err, req, res, next);
      return;
    }

    if (res.headersSent) {
      return next(err);
    }

    const clientMessage = err.message || "Request error";
    return res.status(status).json({ message: clientMessage });
  });

  // Next.js handles frontend serving — Express only serves API routes

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  const shutdown = async (signal: string) => {
    log(`${signal} received — shutting down gracefully`);
    await stopScheduler();
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        log("HTTP server closed");
        resolve();
      });
    });
    try {
      await cassidyRateLimiter.shutdown();
      log("Cassidy rate limiter state flushed to DB");
    } catch (err) {
      logger.error({ err }, "Error flushing Cassidy rate limiter state");
    }
    try {
      await pool.end();
      log("Database pool closed");
    } catch (err) {
      logger.error({ err }, "Error closing database pool");
    }
    setTimeout(() => {
      log("Forced shutdown after timeout");
      process.exit(1);
    }, 30000).unref();
  };

  gracefulShutdown = shutdown;

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

})();
