import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

let Sentry: any = null;

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("Sentry DSN not configured, error tracking disabled");
    return;
  }

  try {
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
    });
    logger.info("Sentry initialized");
  } catch (err) {
    logger.warn({ err }, "Failed to initialize Sentry, error tracking disabled");
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  let errorId: string | undefined;

  if (Sentry) {
    errorId = Sentry.captureException(err, {
      contexts: {
        express: {
          method: req.method,
          url: req.url,
          userId: (req as any).user?.id,
        },
      },
      level: "error",
    });
  }

  logger.error(
    {
      err,
      errorId,
      method: req.method,
      url: req.url,
      userId: (req as any).user?.id,
    },
    "Unhandled error"
  );

  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      ...(errorId && { errorId }),
    });
  }
}
