import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

vi.mock("../storage", () => ({
  storage: {
    getAdvisor: vi.fn(),
    getAdvisorByEmail: vi.fn(),
    getAssociateByEmail: vi.fn(),
    getFirstAdvisor: vi.fn(),
    updateAdvisor: vi.fn(),
    getClient: vi.fn(),
    getClients: vi.fn(),
    getAccountsByClient: vi.fn(),
    getHoldingsByClient: vi.fn(),
    getHoldingsByAccount: vi.fn(),
    getClientsByAssociate: vi.fn().mockResolvedValue([]),
    getClientTeamMembers: vi.fn(),
    getAllAssociates: vi.fn(),
    createAssociate: vi.fn(),
    updateAssociate: vi.fn(),
    deleteAssociate: vi.fn(),
    getMeetings: vi.fn().mockResolvedValue([]),
    getMeeting: vi.fn(),
    createMeeting: vi.fn(),
    getFilteredAlerts: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getHouseholds: vi.fn().mockResolvedValue([]),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    addClientTeamMember: vi.fn(),
    removeClientTeamMember: vi.fn(),
    searchClients: vi.fn(),
    getTasksByMeeting: vi.fn(),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {}, insertMeetingSchema: {}, insertClientSchema: { omit: () => ({ partial: () => ({ refine: () => ({}) }) }) } }));

import { registerAuthRoutes } from "../routes/auth";
import { registerClientRoutes } from "../routes/clients";
import { registerMeetingRoutes } from "../routes/meetings";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerClientRoutes(app);
  registerMeetingRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
  });
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Error Handling Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor" });
    ms.getFirstAdvisor.mockResolvedValue({ id: "advisor-1" });
  });

  describe("Authentication Failures", () => {
    it("should return 401 for all protected routes without auth", async () => {
      for (const path of ["/api/clients", "/api/meetings", "/api/advisor", "/api/dashboard"]) {
        const res = await request(app).get(path);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message");
      }
    });

    it("should return consistent error format", async () => {
      const res = await request(app).get("/api/clients");
      expect(res.body).toEqual({ message: "Not authenticated" });
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 with validation details for invalid login", async () => {
      const res = await request(app).post("/api/auth/login").send({ email: "", password: "" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "Validation failed");
      expect(res.body).toHaveProperty("errors");
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it("should return validation errors with path and message", async () => {
      const res = await request(app).post("/api/auth/login").send({});

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: expect.any(String), message: expect.any(String) }),
        ])
      );
    });

    it("should reject meeting creation with invalid body", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.post("/api/meetings").send({ title: "" })).status).toBe(400);
    });
  });

  describe("Not Found Errors", () => {
    it("should return 404 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/nonexistent");

      expect(res.status).toBe(404);
    });

    it("should return 404 for non-existent meeting", async () => {
      ms.getMeeting.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.get("/api/meetings/nonexistent")).status).toBe(404);
    });
  });

  describe("Storage Error Handling", () => {
    it("should return 500 and sanitize error for holdings", async () => {
      ms.getHoldingsByAccount.mockRejectedValue(new Error("Column 'secret_field' does not exist"));

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/accounts/account-1/holdings");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("An error occurred. Please try again later.");
      expect(res.body.message).not.toContain("Column");
    });

    it("should return 500 for team member errors", async () => {
      ms.getClientTeamMembers.mockRejectedValue(new Error("DB error"));

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.get("/api/clients/client-1/team")).status).toBe(500);
    });

    it("should return 500 for associates list errors", async () => {
      ms.getAllAssociates.mockRejectedValue(new Error("DB error"));

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.get("/api/associates")).status).toBe(500);
    });
  });

  describe("Authorization Errors", () => {
    it("should return 403 when associate tries advisor-only operations", async () => {
      ms.getAdvisorByEmail.mockResolvedValue(null);
      ms.getAssociateByEmail.mockResolvedValue({
        id: "associate-1", name: "Associate", email: "associate@test.com",
        passwordHash, role: "analyst", active: true, avatarUrl: null,
      });

      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "associate@test.com", password: testPassword });

      expect((await agent.post("/api/associates").send({ name: "N", email: "n@t.com", password: "P!" })).status).toBe(403);
      expect((await agent.delete("/api/associates/a-1")).status).toBe(403);
      expect((await agent.patch("/api/associates/a-1").send({ name: "X" })).status).toBe(403);
    });
  });

  describe("Rate limiting", () => {
    it("should return 429 when rate limit is exceeded", async () => {
      const rateLimitedApp = express();
      rateLimitedApp.use(express.json());
      rateLimitedApp.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));

      const { default: rateLimit } = await import("express-rate-limit");
      const limiter = rateLimit({ windowMs: 60000, max: 2, standardHeaders: true, legacyHeaders: false });
      rateLimitedApp.use("/api/limited", limiter);
      rateLimitedApp.get("/api/limited", (_req, res) => res.json({ ok: true }));

      await request(rateLimitedApp).get("/api/limited").expect(200);
      await request(rateLimitedApp).get("/api/limited").expect(200);

      const res = await request(rateLimitedApp).get("/api/limited");
      expect(res.status).toBe(429);
    });

    it("should include rate limit headers in response", async () => {
      const rateLimitedApp = express();
      rateLimitedApp.use(express.json());
      const { default: rateLimit } = await import("express-rate-limit");
      const limiter = rateLimit({ windowMs: 60000, max: 5, standardHeaders: true, legacyHeaders: false });
      rateLimitedApp.use("/api/limited", limiter);
      rateLimitedApp.get("/api/limited", (_req, res) => res.json({ ok: true }));

      const res = await request(rateLimitedApp).get("/api/limited");
      expect(res.status).toBe(200);
      expect(res.headers["ratelimit-limit"]).toBeDefined();
      expect(res.headers["ratelimit-remaining"]).toBeDefined();
    });
  });
});
