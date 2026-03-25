import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

vi.mock("../storage", () => {
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ jobId: "job-1" }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
  return {
    storage: {
      getAdvisorByEmail: vi.fn(),
      getAssociateByEmail: vi.fn(),
      getAdvisor: vi.fn(),
      updateAdvisor: vi.fn(),
      recordLoginEvent: vi.fn().mockResolvedValue(undefined),
      getMeetings: vi.fn().mockResolvedValue([]),
      getFilteredAlerts: vi.fn().mockResolvedValue([]),
      getTasks: vi.fn().mockResolvedValue([]),
      getClients: vi.fn().mockResolvedValue([]),
      getHouseholds: vi.fn().mockResolvedValue([]),
      getFirstAdvisor: vi.fn(),
      getClientsByAssociate: vi.fn().mockResolvedValue([]),
      getClient: vi.fn(),
      getAccountsByClient: vi.fn().mockResolvedValue([]),
      getTasksByMeeting: vi.fn().mockResolvedValue([]),
      db: mockDb,
    },
  };
});
vi.mock("../openai", () => ({
  isAIAvailable: () => false,
  sanitizeForPrompt: vi.fn((s: string) => s),
  sanitizeObjectStrings: vi.fn((o: Record<string, unknown>) => o),
}));
vi.mock("../db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    }),
  },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn(), inArray: vi.fn(), asc: vi.fn(),
}));
vi.mock("@shared/schema", () => ({
  approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {},
  cassidyJobs: {}, cassidyAuditLog: {}, detectedSignals: {},
}));
vi.mock("../integrations/cassidy/rate-limiter", () => {
  const MockRateLimiter = vi.fn();
  MockRateLimiter.prototype.checkLimit = vi.fn().mockReturnValue({ allowed: true });
  return { RateLimiter: MockRateLimiter };
});
vi.mock("../integrations/cassidy/webhook-client", () => ({
  callCassidyWorkflow: vi.fn().mockResolvedValue({ cassidy_request_id: "cr-1", status: "ok" }),
}));
vi.mock("../integrations/cassidy/event-bus", () => {
  const { EventEmitter } = require("events");
  return { jobEventBus: new EventEmitter() };
});
vi.mock("../integrations/cassidy/timeout-manager", () => ({
  timeoutManager: { startTimeout: vi.fn(), clearTimeout: vi.fn() },
}));
vi.mock("../integrations/cassidy/audit-logger", () => ({
  AuditLogger: { logEvent: vi.fn().mockResolvedValue(undefined) },
  AuditEventType: {
    REQUEST_SENT: "request_sent", ROUTING_DECISION: "routing_decision",
    AGENT_CALLED: "agent_called", AGENT_RESPONDED: "agent_responded",
    CALLBACK_RECEIVED: "callback_received", ERROR: "error",
  },
}));
vi.mock("../integrations/cassidy/callback-handler", () => ({
  handleCassidyCallback: vi.fn((req: unknown, res: { json: (data: unknown) => void }, _next: unknown) => {
    res.json({ ok: true });
  }),
}));
vi.mock("../integrations/cassidy/conversation-context", () => ({
  buildConversationContext: vi.fn().mockResolvedValue("context"),
  getConversationSummary: vi.fn().mockResolvedValue("summary"),
}));
vi.mock("../lib/prompt-sanitizer", () => ({
  sanitizePromptInput: vi.fn((s: string) => s),
}));
vi.mock("../integrations/cassidy/signature-verifier", () => ({
  generateSignature: vi.fn().mockReturnValue("sig"),
  verifySignature: vi.fn().mockReturnValue(true),
}));
vi.mock("../lib/sse-event-bus", () => ({
  sseEventBus: { emit: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerCoreRoutes } from "../routes/cassidy/core";
import { storage } from "../storage";
import { RateLimiter } from "../integrations/cassidy/rate-limiter";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerCoreRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: request.SuperAgentTest) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    title: "Senior Advisor", avatarUrl: null, onboardingCompleted: true, passwordHash,
  } as ReturnType<typeof ms.getAdvisorByEmail> extends Promise<infer T> ? T : never);
  ms.getAdvisor.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    title: "Senior Advisor", avatarUrl: null, onboardingCompleted: true, passwordHash,
  } as ReturnType<typeof ms.getAdvisor> extends Promise<infer T> ? T : never);
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Cassidy Integration API (Mock-based)", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(RateLimiter.prototype.checkLimit).mockReturnValue({ allowed: true } as ReturnType<typeof RateLimiter.prototype.checkLimit>);
    app = createApp();
  });

  describe("POST /api/cassidy/request", () => {
    it("should accept a valid cassidy request and return 202", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/cassidy/request").send({
        advisor_request: "Analyze portfolio for risk exposure",
        task_type: "analysis",
        source: "dashboard",
        advisor_name: "Test Advisor",
        conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(res.status).toBe(202);
      expect(res.body.job_id).toBeDefined();
      expect(res.body.status).toBe("accepted");
    });

    it("should reject unauthenticated cassidy requests", async () => {
      const res = await request(app).post("/api/cassidy/request").send({
        advisor_request: "test",
      });
      expect(res.status).toBe(401);
    });

    it("should validate request body and reject invalid input", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/cassidy/request").send({
        advisor_request: "",
        task_type: "invalid_type",
        source: "unknown_source",
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("should enforce rate limits and return 429", async () => {
      vi.mocked(RateLimiter.prototype.checkLimit).mockReturnValue({
        allowed: false,
        retryAfterSeconds: 60,
        limitType: "per_minute",
      } as ReturnType<typeof RateLimiter.prototype.checkLimit>);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/cassidy/request").send({
        advisor_request: "test request that should be rate limited",
        task_type: "query",
        source: "dashboard",
        advisor_name: "Test",
        conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(res.status).toBe(429);
      expect(res.body.error).toContain("Rate limit");
      expect(res.body.retry_after_seconds).toBe(60);
    });
  });

  describe("POST /api/cassidy/callback", () => {
    it("should process callback from external service", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/cassidy/callback").send({
        job_id: "job-123",
        status: "completed",
        result: { content: "analysis complete" },
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe("GET /api/cassidy/jobs", () => {
    it("should list jobs for authenticated user", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/cassidy/jobs");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should reject unauthenticated job listing", async () => {
      const res = await request(app).get("/api/cassidy/jobs");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/cassidy/job-output/:job_id", () => {
    it("should return 404 when job not found", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/cassidy/job-output/550e8400-e29b-41d4-a716-446655440000");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });

    it("should reject invalid job_id format", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/cassidy/job-output/not-a-uuid");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid");
    });

    it("should reject unauthenticated output requests", async () => {
      const res = await request(app).get("/api/cassidy/job-output/550e8400-e29b-41d4-a716-446655440000");
      expect(res.status).toBe(401);
    });
  });
});
