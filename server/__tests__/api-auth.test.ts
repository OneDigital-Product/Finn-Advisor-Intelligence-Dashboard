import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

vi.mock("../storage", () => {
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
    },
  };
});
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn(),
}));
vi.mock("@shared/schema", () => ({
  approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {},
}));

import { registerAuthRoutes } from "../routes/auth";
import { storage } from "../storage";

const ms = vi.mocked(storage);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  return app;
}

describe("Auth API Routes", () => {
  let app: ReturnType<typeof createApp>;
  const testPassword = "TestPassword123!";
  const passwordHash = hashPassword(testPassword);

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/auth/login", () => {
    it("should login advisor with valid credentials", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        title: "Senior Advisor", avatarUrl: null, onboardingCompleted: true, passwordHash,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "advisor@test.com", password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", "advisor-1");
      expect(res.body).toHaveProperty("type", "advisor");
      expect(res.body).toHaveProperty("onboardingCompleted", true);
    });

    it("should login associate with valid credentials", async () => {
      ms.getAdvisorByEmail.mockResolvedValue(null);
      ms.getAssociateByEmail.mockResolvedValue({
        id: "associate-1", name: "Test Associate", email: "associate@test.com",
        role: "analyst", avatarUrl: null, passwordHash, active: true,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "associate@test.com", password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("type", "associate");
      expect(res.body).toHaveProperty("role", "analyst");
    });

    it("should reject inactive associate", async () => {
      ms.getAdvisorByEmail.mockResolvedValue(null);
      ms.getAssociateByEmail.mockResolvedValue({
        id: "associate-1", name: "Inactive", email: "inactive@test.com",
        role: "analyst", passwordHash, active: false,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "inactive@test.com", password: testPassword });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Account is inactive");
    });

    it("should return 401 for invalid credentials", async () => {
      ms.getAdvisorByEmail.mockResolvedValue(null);
      ms.getAssociateByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "unknown@test.com", password: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should return 401 for wrong password", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test", email: "advisor@test.com", passwordHash,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "advisor@test.com", password: "WrongPassword!" });

      expect(res.status).toBe(401);
    });

    it("should return 400 for missing email", async () => {
      const res = await request(app).post("/api/auth/login").send({ password: "test" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });

    it("should return 400 for missing password", async () => {
      const res = await request(app).post("/api/auth/login").send({ email: "t@t.com" });
      expect(res.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const res = await request(app).post("/api/auth/login").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 when not authenticated", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Not authenticated");
    });

    it("should return user info when authenticated", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Senior Advisor",
      });
      ms.getAdvisor.mockResolvedValue({ id: "advisor-1", onboardingCompleted: true });

      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      const res = await agent.get("/api/auth/me");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", "advisor-1");
      expect(res.body).toHaveProperty("type", "advisor");
    });
  });

  describe("Protected routes", () => {
    it("should return 401 for unauthenticated /api/advisor", async () => {
      const res = await request(app).get("/api/advisor");
      expect(res.status).toBe(401);
    });

    it("should return 401 for unauthenticated /api/dashboard", async () => {
      const res = await request(app).get("/api/dashboard");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/onboarding/complete", () => {
    it("should complete onboarding for authenticated advisor", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: false, avatarUrl: null, title: "Advisor",
      });
      ms.getAdvisor.mockResolvedValue({ id: "advisor-1", onboardingCompleted: false });
      ms.updateAdvisor.mockResolvedValue({ id: "advisor-1", onboardingCompleted: true });

      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      const res = await agent.post("/api/onboarding/complete");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, onboardingCompleted: true });
      expect(ms.updateAdvisor).toHaveBeenCalledWith("advisor-1", { onboardingCompleted: true });
    });
  });
});
