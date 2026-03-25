import type { Express } from "express";
import { requireAuth } from "./middleware";
import { sseEventBus } from "../lib/sse-event-bus";
import { logger } from "../lib/logger";

export function registerEventRoutes(app: Express) {
  app.get("/api/events/stream", requireAuth, (req, res) => {
    const userId = req.session.userId!;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ message: "SSE stream connected" })}\n\n`);

    sseEventBus.addClient(res, userId);

    req.on("close", () => {
      logger.debug({ userId }, "SSE request closed");
    });
  });
}
