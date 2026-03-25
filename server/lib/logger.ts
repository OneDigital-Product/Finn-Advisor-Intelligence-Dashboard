import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
      },
    },
  }),
});

export function createRequestLogger(req: { method: string; url: string; user?: { id?: string } }) {
  return logger.child({
    userId: req.user?.id,
    method: req.method,
    url: req.url,
  });
}

export function createIntegrationLogger(integration: string) {
  return logger.child({ integration });
}
