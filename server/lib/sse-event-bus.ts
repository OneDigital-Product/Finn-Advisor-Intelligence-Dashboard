import { EventEmitter } from "events";
import { logger } from "./logger";

export type SSEEventType =
  | "cassidy:job_completed"
  | "signals:proactive_scan_complete"
  | "signals:household_updated"
  | "workflow:meeting_processed"
  | "alert:new"
  | "approval:new"
  | "approval:status_changed"
  | "reminder:created"
  | "heartbeat";

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

/** Minimal writable interface — works with both Express Response and Next.js mock streams. */
export interface SSEWritable {
  write(data: string): void;
  end(): void;
  on?(event: string, listener: (...args: any[]) => void): void;
}

interface SSEClient {
  res: SSEWritable;
  userId: string;
}

class SSEEventBus extends EventEmitter {
  private clients = new Map<SSEWritable, SSEClient>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.setMaxListeners(100);
    this.startHeartbeat();
  }

  addClient(res: SSEWritable, userId: string): void {
    this.clients.set(res, { res, userId });
    logger.info({ clientCount: this.clients.size, userId }, "SSE client connected");

    if (typeof res.on === "function") {
      res.on("close", () => {
        this.clients.delete(res);
        logger.info({ clientCount: this.clients.size }, "SSE client disconnected");
      });
    }
  }

  removeClient(res: SSEWritable): void {
    this.clients.delete(res);
    logger.info({ clientCount: this.clients.size }, "SSE client disconnected");
  }

  publishToUser(userId: string, type: SSEEventType, data: Record<string, unknown>): void {
    const event: SSEEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const [res, client] of this.clients) {
      if (client.userId !== userId) continue;
      try {
        res.write(payload);
      } catch {
        this.clients.delete(res);
      }
    }
  }

  broadcast(type: SSEEventType, data: Record<string, unknown>): void {
    const event: SSEEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const [res] of this.clients) {
      try {
        res.write(payload);
      } catch {
        this.clients.delete(res);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcast("heartbeat", { clients: this.clients.size });
      }
    }, 30_000);
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    for (const [res] of this.clients) {
      try {
        res.end();
      } catch {}
    }
    this.clients.clear();
  }
}

// Use globalThis to survive Next.js dev hot reloads
const _g = globalThis as any;
if (!_g._sseEventBus) {
  _g._sseEventBus = new SSEEventBus();
}
export const sseEventBus: SSEEventBus = _g._sseEventBus;
