import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import session from "express-session";
import http from "http";
import crypto from "crypto";
import autocannon from "autocannon";

const CONCURRENT_REQUESTS = 50;

const queueDepthTracker = {
  pendingJobs: new Set<string>(),
  maxQueueDepth: 0,
  queueDepthSamples: [] as { timestamp: number; depth: number }[],
  record(jobId: string) {
    this.pendingJobs.add(jobId);
    const depth = this.pendingJobs.size;
    if (depth > this.maxQueueDepth) this.maxQueueDepth = depth;
    this.queueDepthSamples.push({ timestamp: Date.now(), depth });
  },
  complete(jobId: string) {
    this.pendingJobs.delete(jobId);
    this.queueDepthSamples.push({ timestamp: Date.now(), depth: this.pendingJobs.size });
  },
  reset() {
    this.pendingJobs.clear();
    this.maxQueueDepth = 0;
    this.queueDepthSamples = [];
  },
  getAvgDepth() {
    if (this.queueDepthSamples.length === 0) return 0;
    return Math.round(
      (this.queueDepthSamples.reduce((s, d) => s + d.depth, 0) / this.queueDepthSamples.length) * 100
    ) / 100;
  },
};

vi.mock("../../storage", () => {
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((val: any) => {
        if (val?.jobId) {
          queueDepthTracker.record(val.jobId);
        }
        return Promise.resolve([{ jobId: val?.jobId || "job-1" }]);
      }),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
  return {
    storage: {
      db: mockDb,
      getAdvisorByEmail: vi.fn(),
      getFirstAdvisor: vi.fn(),
    },
  };
});

vi.mock("../../openai", () => ({
  isAIAvailable: () => false,
  sanitizeForPrompt: vi.fn((s: string) => s),
  sanitizeObjectStrings: vi.fn((o: Record<string, unknown>) => o),
}));

vi.mock("../../lib/prompt-sanitizer", () => ({
  sanitizePromptInput: vi.fn((s: string) => s),
}));

vi.mock("../../integrations/cassidy/webhook-client", () => ({
  callCassidyWorkflow: vi.fn().mockResolvedValue({
    status: "accepted",
    cassidy_request_id: "mock-req-id",
  }),
}));

vi.mock("../../integrations/cassidy/audit-logger", () => ({
  AuditLogger: { logEvent: vi.fn().mockResolvedValue(undefined) },
  AuditEventType: {
    REQUEST_SENT: "request_sent",
    CALLBACK_RECEIVED: "callback_received",
    RESULT_RENDERED: "result_rendered",
    AGENT_RESPONDED: "agent_responded",
  },
}));

vi.mock("../../integrations/cassidy/timeout-manager", () => ({
  timeoutManager: { startTimeout: vi.fn(), clearTimeout: vi.fn() },
}));

vi.mock("../../integrations/cassidy/event-bus", () => ({
  jobEventBus: {
    publishJobUpdate: vi.fn(),
    subscribeToJob: vi.fn().mockReturnValue(() => {}),
    getSubscriberCount: vi.fn().mockReturnValue(0),
    getActiveJobs: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("../../integrations/cassidy/conversation-context", () => ({
  buildConversationContext: vi.fn().mockResolvedValue(""),
  getConversationSummary: vi.fn().mockResolvedValue(""),
}));

vi.mock("../../lib/cassidy", () => ({
  chat: vi.fn().mockResolvedValue("mock response"),
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: "load-test-secret",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false },
    })
  );
  app.use((req, _res, next) => {
    (req.session as any).userId = "load-test-advisor-id";
    next();
  });
  return app;
}

function buildRequestPayload() {
  return {
    advisor_request: "Load test request - analyze portfolio allocation for client",
    conversation_id: crypto.randomUUID(),
    advisor_name: "LoadTestAdvisor",
    session_id: crypto.randomUUID(),
    source: "dashboard",
    task_type: "query",
    timestamp: new Date().toISOString(),
  };
}

describe("Load Test: Concurrent Cassidy Webhook Invocations (autocannon)", () => {
  let app: express.Express;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    queueDepthTracker.reset();
    app = createTestApp();
    const { registerCoreRoutes } = await import("../../routes/cassidy/core");
    registerCoreRoutes(app);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.restoreAllMocks();
  });

  it(`should handle ${CONCURRENT_REQUESTS} concurrent POST /api/cassidy/request via autocannon`, async () => {
    const result = await autocannon({
      url: `http://127.0.0.1:${port}/api/cassidy/request`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestPayload()),
      connections: CONCURRENT_REQUESTS,
      duration: 5,
      amount: CONCURRENT_REQUESTS,
    });

    const totalReqs = result.requests.total;
    const errors = result.errors;
    const non2xx = result.non2xx;
    const successCount = result["2xx"];

    console.log("\n========================================");
    console.log("AUTOCANNON RESULTS: Concurrent Webhook Invocations");
    console.log(`Endpoint: POST /api/cassidy/request`);
    console.log("========================================");
    console.log(`Connections:         ${CONCURRENT_REQUESTS}`);
    console.log(`Total Requests:      ${totalReqs}`);
    console.log(`2xx Responses:       ${successCount}`);
    console.log(`Non-2xx Responses:   ${non2xx}`);
    console.log(`Errors:              ${errors}`);
    console.log(`Avg Latency:         ${result.latency.average}ms`);
    console.log(`P50 Latency:         ${result.latency.p50}ms`);
    console.log(`P95 Latency:         ${result.latency.p95}ms`);
    console.log(`P99 Latency:         ${result.latency.p99}ms`);
    console.log(`Max Latency:         ${result.latency.max}ms`);
    console.log(`Req/sec (avg):       ${result.requests.average}`);
    console.log(`Throughput (avg):    ${Math.round(result.throughput.average / 1024)}KB/s`);
    console.log(`Queue Depth (max):   ${queueDepthTracker.maxQueueDepth}`);
    console.log(`Queue Depth (avg):   ${queueDepthTracker.getAvgDepth()}`);
    console.log(`Queue Depth (current): ${queueDepthTracker.pendingJobs.size}`);
    console.log(`Queue Samples:       ${queueDepthTracker.queueDepthSamples.length}`);
    console.log("========================================\n");

    expect(successCount + (result["4xx"] || 0)).toBeGreaterThanOrEqual(totalReqs * 0.9);
    expect(errors).toBe(0);
  }, 30000);

  it("should handle burst load (50 connections, short duration) via autocannon", async () => {
    const result = await autocannon({
      url: `http://127.0.0.1:${port}/api/cassidy/request`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestPayload()),
      connections: 50,
      duration: 3,
    });

    const successCount = result["2xx"];
    const rateLimited = result["4xx"] || 0;
    const serverErrors = result["5xx"] || 0;

    console.log("\n========================================");
    console.log("AUTOCANNON RESULTS: Burst Load");
    console.log("========================================");
    console.log(`Total Requests:      ${result.requests.total}`);
    console.log(`2xx Responses:       ${successCount}`);
    console.log(`4xx (rate limited):  ${rateLimited}`);
    console.log(`5xx (server errors): ${serverErrors}`);
    console.log(`Errors:              ${result.errors}`);
    console.log(`Avg Latency:         ${result.latency.average}ms`);
    console.log(`P99 Latency:         ${result.latency.p99}ms`);
    console.log(`Req/sec (avg):       ${result.requests.average}`);
    console.log(`Queue Depth (max):   ${queueDepthTracker.maxQueueDepth}`);
    console.log(`Queue Depth (avg):   ${queueDepthTracker.getAvgDepth()}`);
    console.log(`Queue Depth (current): ${queueDepthTracker.pendingJobs.size}`);
    console.log("========================================\n");

    expect(serverErrors).toBe(0);
    expect(result.errors).toBe(0);
    expect(successCount + rateLimited).toBe(result.requests.total);
  }, 30000);

  it("should handle sustained load with increasing connections via autocannon", async () => {
    const phases = [10, 25, 50];
    const results: any[] = [];

    for (const connections of phases) {
      queueDepthTracker.reset();
      const result = await autocannon({
        url: `http://127.0.0.1:${port}/api/cassidy/request`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload()),
        connections,
        duration: 2,
      });
      results.push({
        connections,
        result,
        maxQueueDepth: queueDepthTracker.maxQueueDepth,
        avgQueueDepth: queueDepthTracker.getAvgDepth(),
      });
    }

    console.log("\n========================================");
    console.log("AUTOCANNON RESULTS: Sustained Load (Increasing Connections)");
    console.log("========================================");
    for (const { connections, result, maxQueueDepth, avgQueueDepth } of results) {
      const serverErrors = result["5xx"] || 0;
      console.log(`  ${connections} connections: ${result.requests.total} reqs, ` +
        `${result["2xx"]} 2xx, ${result["4xx"] || 0} 4xx, ${serverErrors} 5xx, ` +
        `avg ${result.latency.average}ms, p99 ${result.latency.p99}ms, ` +
        `queue max=${maxQueueDepth} avg=${avgQueueDepth}`);
      expect(serverErrors).toBe(0);
      expect(result.errors).toBe(0);
    }
    console.log("========================================\n");
  }, 60000);
});
