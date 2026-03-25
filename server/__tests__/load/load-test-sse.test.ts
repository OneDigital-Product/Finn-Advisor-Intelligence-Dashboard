import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import session from "express-session";
import http from "http";
import crypto from "crypto";

const CONCURRENT_SSE_CONNECTIONS = 100;

vi.mock("../../storage", () => ({
  storage: {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    },
    getAdvisorByEmail: vi.fn(),
    getFirstAdvisor: vi.fn(),
  },
}));

vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "load-test-secret", resave: false, saveUninitialized: true, cookie: { secure: false } }));
  app.use((req, _res, next) => {
    (req.session as any).userId = "load-test-advisor-id";
    next();
  });
  return app;
}

describe("Load Test: SSE Connection Handling (/api/events/stream)", () => {
  let app: express.Express;
  let server: http.Server;
  let port: number;
  let sseEventBus: any;

  beforeEach(async () => {
    app = createTestApp();
    const { registerEventRoutes } = await import("../../routes/events");
    registerEventRoutes(app);

    const sseMod = await import("../../lib/sse-event-bus");
    sseEventBus = sseMod.sseEventBus;

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
    server.maxConnections = 200;
  });

  afterEach(async () => {
    sseEventBus.shutdown();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.restoreAllMocks();
  });

  it(`should handle ${CONCURRENT_SSE_CONNECTIONS} simultaneous SSE connections to /api/events/stream`, async () => {
    let connectedCount = 0;
    let receivedConnectEvent = 0;
    const errors: string[] = [];
    const requests: http.ClientRequest[] = [];
    const responses: http.IncomingMessage[] = [];

    const batchSize = 25;
    const totalBatches = CONCURRENT_SSE_CONNECTIONS / batchSize;

    for (let b = 0; b < totalBatches; b++) {
      const batchPromises: Promise<void>[] = [];
      for (let i = 0; i < batchSize; i++) {
        batchPromises.push(new Promise<void>((resolve) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) { resolved = true; resolve(); }
          }, 5000);

          const req = http.get(`http://127.0.0.1:${port}/api/events/stream`, (res) => {
            clearTimeout(timeout);
            connectedCount++;
            responses.push(res);
            res.on("data", (chunk: Buffer) => {
              const data = chunk.toString();
              if (data.includes("event: connected")) {
                receivedConnectEvent++;
              }
            });
            if (!resolved) { resolved = true; resolve(); }
          });
          req.on("error", (err) => {
            clearTimeout(timeout);
            errors.push(err.message);
            if (!resolved) { resolved = true; resolve(); }
          });
          requests.push(req);
        }));
      }
      await Promise.all(batchPromises);
    }

    await new Promise((r) => setTimeout(r, 500));

    const clientCount = sseEventBus.getClientCount();

    console.log("\n========================================");
    console.log("LOAD TEST RESULTS: SSE /api/events/stream");
    console.log("========================================");
    console.log(`Target Connections:    ${CONCURRENT_SSE_CONNECTIONS}`);
    console.log(`Connected:             ${connectedCount}`);
    console.log(`SSE Bus Clients:       ${clientCount}`);
    console.log(`Connect Events Rcvd:   ${receivedConnectEvent}`);
    console.log(`Errors:                ${errors.length}`);
    if (errors.length > 0) {
      console.log(`Sample Errors:         ${errors.slice(0, 5).join(", ")}`);
    }
    console.log("========================================\n");

    for (const res of responses) { res.destroy(); }
    for (const req of requests) { req.destroy(); }

    expect(connectedCount).toBeGreaterThanOrEqual(CONCURRENT_SSE_CONNECTIONS * 0.9);
    expect(errors.length).toBe(0);
  }, 45000);

  it("should deliver cassidy:job_completed events to all connected SSE listeners", async () => {
    const listenerCount = 50;
    let connectedCount = 0;
    const receivedJobCompleted: number[] = Array(listenerCount).fill(0);
    const requests: http.ClientRequest[] = [];
    const responses: http.IncomingMessage[] = [];

    const allConnected = new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (connectedCount >= listenerCount) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(interval); resolve(); }, 10000);
    });

    for (let i = 0; i < listenerCount; i++) {
      const idx = i;
      const req = http.get(`http://127.0.0.1:${port}/api/events/stream`, (res) => {
        connectedCount++;
        responses.push(res);
        res.on("data", (chunk: Buffer) => {
          const data = chunk.toString();
          if (data.includes("cassidy:job_completed")) {
            receivedJobCompleted[idx]++;
          }
        });
      });
      req.on("error", () => {});
      requests.push(req);
    }

    await allConnected;
    await new Promise((r) => setTimeout(r, 200));

    const jobId = crypto.randomUUID();
    const messageCount = 5;
    for (let m = 0; m < messageCount; m++) {
      sseEventBus.publishToUser("load-test-advisor-id", "cassidy:job_completed", {
        job_id: jobId,
        status: "completed",
        called_agent: "test_agent",
        message_index: m,
      });
    }

    await new Promise((r) => setTimeout(r, 500));

    const totalReceived = receivedJobCompleted.reduce((a, b) => a + b, 0);
    const expected = listenerCount * messageCount;
    const droppedMessages = expected - totalReceived;

    console.log("\n========================================");
    console.log("CASSIDY:JOB_COMPLETED DELIVERY TEST");
    console.log("========================================");
    console.log(`Listeners:             ${listenerCount}`);
    console.log(`Messages Sent:         ${messageCount}`);
    console.log(`Expected Total:        ${expected}`);
    console.log(`Total Received:        ${totalReceived}`);
    console.log(`Dropped Messages:      ${droppedMessages}`);
    console.log(`Drop Rate:             ${Math.round((droppedMessages / expected) * 100)}%`);
    console.log("========================================\n");

    for (const res of responses) { res.destroy(); }
    for (const req of requests) { req.destroy(); }

    expect(droppedMessages).toBe(0);
  }, 30000);

  it("should handle rapid connection open/close cycles without leaking SSE clients", async () => {
    const cycles = 30;
    let connectedCount = 0;

    for (let i = 0; i < cycles; i++) {
      await new Promise<void>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) { resolved = true; resolve(); }
        }, 2000);
        const req = http.get(`http://127.0.0.1:${port}/api/events/stream`, (res) => {
          clearTimeout(timeout);
          connectedCount++;
          res.destroy();
          if (!resolved) { resolved = true; resolve(); }
        });
        req.on("error", () => {
          clearTimeout(timeout);
          if (!resolved) { resolved = true; resolve(); }
        });
      });
    }

    await new Promise((r) => setTimeout(r, 500));

    const remainingClients = sseEventBus.getClientCount();

    console.log("\n========================================");
    console.log("SSE CLIENT LIFECYCLE TEST RESULTS");
    console.log("========================================");
    console.log(`Total Cycles:          ${cycles}`);
    console.log(`Connected:             ${connectedCount}`);
    console.log(`Remaining Clients:     ${remainingClients}`);
    console.log("========================================\n");

    expect(connectedCount).toBeGreaterThanOrEqual(cycles * 0.9);
    expect(remainingClients).toBe(0);
  }, 60000);

  it("should broadcast cassidy:job_completed to 100 listeners without drops", async () => {
    const listenerCount = 100;
    const messageCount = 10;

    const received: number[] = Array(listenerCount).fill(0);
    const fakeResponses: any[] = [];

    for (let i = 0; i < listenerCount; i++) {
      const idx = i;
      const fakeRes = {
        write: vi.fn(() => { received[idx]++; return true; }),
        on: vi.fn(),
        end: vi.fn(),
      };
      fakeResponses.push(fakeRes);
      sseEventBus.addClient(fakeRes, "load-test-advisor-id");
    }

    for (let m = 0; m < messageCount; m++) {
      sseEventBus.publishToUser("load-test-advisor-id", "cassidy:job_completed", {
        job_id: crypto.randomUUID(),
        status: "completed",
        message_index: m,
      });
    }

    const totalReceived = received.reduce((a, b) => a + b, 0);
    const expected = listenerCount * messageCount;
    const droppedMessages = expected - totalReceived;

    console.log("\n========================================");
    console.log("SSE BROADCAST TEST (100 listeners, 10 messages)");
    console.log("========================================");
    console.log(`Listeners:             ${listenerCount}`);
    console.log(`Messages Sent:         ${messageCount}`);
    console.log(`Expected Total:        ${expected}`);
    console.log(`Total Received:        ${totalReceived}`);
    console.log(`Dropped Messages:      ${droppedMessages}`);
    console.log(`Drop Rate:             ${Math.round((droppedMessages / expected) * 100)}%`);
    console.log(`Client Count:          ${sseEventBus.getClientCount()}`);
    console.log("========================================\n");

    expect(droppedMessages).toBe(0);
  }, 10000);
});
