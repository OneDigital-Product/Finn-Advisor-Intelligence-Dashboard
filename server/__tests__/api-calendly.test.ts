import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

const {
  mockCreateCalendlyIntegration,
  mockEncryptToken,
  mockDecryptToken,
} = vi.hoisted(() => ({
  mockCreateCalendlyIntegration: vi.fn(),
  mockEncryptToken: vi.fn(),
  mockDecryptToken: vi.fn(),
}));

vi.mock("../storage", () => ({
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
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({ db: {} }));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {} }));
vi.mock("../integrations/calendly", () => ({
  createCalendlyIntegration: mockCreateCalendlyIntegration,
}));
vi.mock("../lib/crypto", () => ({
  encryptToken: mockEncryptToken,
  decryptToken: mockDecryptToken,
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerCalendlyRoutes } from "../routes/calendly";
import { storage } from "../storage";
import type { IStorage } from "../storage";

const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockAdvisor = {
  id: "advisor-1",
  name: "Test Advisor",
  email: "advisor@test.com",
  passwordHash,
  onboardingCompleted: true,
  avatarUrl: null,
  title: "Advisor",
  phone: null,
  bio: null,
  firmName: null,
  feeSchedule: null,
  maxCapacity: 120,
  salesforceUserId: null,
  microsoftUserId: null,
  orionUserId: null,
  calendlyUrl: null,
  calendlyAccessToken: null,
  calendlyUserId: null,
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerCalendlyRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue(mockAdvisor);
  ms.getAdvisor.mockResolvedValue(mockAdvisor);
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Calendly Integration API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/integrations/calendly/status", () => {
    it("should return not connected when no token", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisor.mockResolvedValue({ ...mockAdvisor, calendlyAccessToken: null });

      const res = await agent.get("/api/integrations/calendly/status");
      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
    });

    it("should return connected when token exists", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisor.mockResolvedValue({ ...mockAdvisor, calendlyAccessToken: "encrypted-token" });

      const res = await agent.get("/api/integrations/calendly/status");
      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/integrations/calendly/status");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/integrations/calendly/event-types", () => {
    it("should return event types when configured", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisor.mockResolvedValue({ ...mockAdvisor, calendlyAccessToken: "encrypted-token" });
      mockDecryptToken.mockReturnValue("real-token");
      const mockCalendly = { getEventTypes: vi.fn().mockResolvedValue([{ id: "et-1", name: "30-min meeting" }]) };
      mockCreateCalendlyIntegration.mockReturnValue(mockCalendly);

      const res = await agent.get("/api/integrations/calendly/event-types");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("30-min meeting");
    });

    it("should return 401 when Calendly not configured", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisor.mockResolvedValue({ ...mockAdvisor, calendlyAccessToken: null });

      const res = await agent.get("/api/integrations/calendly/event-types");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("NOT_CONFIGURED");
    });
  });

  describe("GET /api/integrations/calendly/link/:eventTypeId", () => {
    it("should return booking URL for event type", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisor.mockResolvedValue({ ...mockAdvisor, calendlyAccessToken: "encrypted-token" });
      mockDecryptToken.mockReturnValue("real-token");
      const mockCalendly = { getEventTypeLink: vi.fn().mockResolvedValue("https://calendly.com/test/30min") };
      mockCreateCalendlyIntegration.mockReturnValue(mockCalendly);

      const res = await agent.get("/api/integrations/calendly/link/et-1");
      expect(res.status).toBe(200);
      expect(res.body.bookingUrl).toBe("https://calendly.com/test/30min");
    });

    it("should return 404 when event type not found", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisor.mockResolvedValue({ ...mockAdvisor, calendlyAccessToken: "encrypted-token" });
      mockDecryptToken.mockReturnValue("real-token");
      const mockCalendly = { getEventTypeLink: vi.fn().mockResolvedValue(null) };
      mockCreateCalendlyIntegration.mockReturnValue(mockCalendly);

      const res = await agent.get("/api/integrations/calendly/link/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/integrations/calendly/config", () => {
    it("should connect Calendly with valid token", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const mockCalendly = { getUser: vi.fn().mockResolvedValue({ id: "cal-user-1", name: "Test User" }) };
      mockCreateCalendlyIntegration.mockReturnValue(mockCalendly);
      mockEncryptToken.mockReturnValue("encrypted-access-token");
      ms.updateAdvisor.mockResolvedValue(undefined);

      const res = await agent.post("/api/integrations/calendly/config").send({ accessToken: "valid-token" });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("connected successfully");
      expect(res.body.userName).toBe("Test User");
      expect(ms.updateAdvisor).toHaveBeenCalledWith("advisor-1", {
        calendlyAccessToken: "encrypted-access-token",
        calendlyUserId: "cal-user-1",
      });
    });

    it("should reject missing access token", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/calendly/config").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("accessToken is required");
    });

    it("should return 400 on invalid token", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const mockCalendly = { getUser: vi.fn().mockRejectedValue(new Error("Invalid token")) };
      mockCreateCalendlyIntegration.mockReturnValue(mockCalendly);

      const res = await agent.post("/api/integrations/calendly/config").send({ accessToken: "bad-token" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Failed to connect Calendly");
    });
  });

  describe("DELETE /api/integrations/calendly/config", () => {
    it("should disconnect Calendly", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.updateAdvisor.mockResolvedValue(undefined);

      const res = await agent.delete("/api/integrations/calendly/config");
      expect(res.status).toBe(204);
      expect(ms.updateAdvisor).toHaveBeenCalledWith("advisor-1", {
        calendlyAccessToken: null,
        calendlyUserId: null,
      });
    });
  });
});
