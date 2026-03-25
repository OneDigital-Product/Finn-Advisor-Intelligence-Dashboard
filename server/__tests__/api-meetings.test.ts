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
    getClients: vi.fn().mockResolvedValue([]),
    getMeetings: vi.fn(),
    getMeeting: vi.fn(),
    createMeeting: vi.fn(),
    updateMeeting: vi.fn(),
    getMeetingsByClient: vi.fn(),
    getTasksByMeeting: vi.fn(),
    getHoldingsByClient: vi.fn(),
    getAccountsByClient: vi.fn(),
    getTasksByClient: vi.fn(),
    getLifeEvents: vi.fn(),
    getComplianceItemsByClient: vi.fn(),
    getPerformanceByHousehold: vi.fn(),
    getActiveMeetingPrepConfig: vi.fn(),
    getActiveMeetingSummaryConfig: vi.fn(),
    getActiveTranscriptConfig: vi.fn(),
    createTask: vi.fn(),
    createActivity: vi.fn(),
    getFilteredAlerts: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getHouseholds: vi.fn().mockResolvedValue([]),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    getClientsByAssociate: vi.fn().mockResolvedValue([]),
    checkMeetingConflicts: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({
  isAIAvailable: () => false,
  generateMeetingPrep: vi.fn().mockResolvedValue("Prep brief"),
  generateMeetingSummary: vi.fn().mockResolvedValue("Summary content"),
  summarizeTranscript: vi.fn().mockResolvedValue("Transcript summary"),
  analyzeTranscriptWithConfig: vi.fn().mockResolvedValue({ title: "Test", type: "review", summary: "Summary", actionItems: [] }),
  extractActionItems: vi.fn().mockResolvedValue([]),
}));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {}, insertMeetingSchema: {}, insertClientSchema: { omit: () => ({ partial: () => ({ refine: () => ({}) }) }) } }));

import { registerAuthRoutes } from "../routes/auth";
import { registerMeetingRoutes } from "../routes/meetings";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockMeeting = {
  id: "meeting-1", advisorId: "advisor-1", clientId: "client-1",
  title: "Annual Review", startTime: "2026-03-11T10:00:00.000Z",
  endTime: "2026-03-11T11:00:00.000Z", type: "review", status: "completed",
  notes: "Discussion about portfolio", location: "Office",
  prepBrief: null, transcriptRaw: null, transcriptSummary: null,
};
const mockClient = { id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe", email: "john@test.com" };

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
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

describe("Meeting API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor" });
    ms.getFirstAdvisor.mockResolvedValue({ id: "advisor-1" });
  });

  describe("GET /api/meetings", () => {
    it("should return meetings with client details", async () => {
      ms.getMeetings.mockResolvedValue([mockMeeting]);
      ms.getClient.mockResolvedValue(mockClient);
      ms.getTasksByMeeting.mockResolvedValue([]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/meetings");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty("client");
      expect(res.body[0]).toHaveProperty("taskCount", 0);
    });
  });

  describe("POST /api/meetings", () => {
    it("should create meeting with valid data", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.createMeeting.mockResolvedValue(mockMeeting);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings").send({
        title: "New Meeting", startTime: "2026-03-15T14:00:00Z",
        endTime: "2026-03-15T15:00:00Z", type: "review", clientId: "client-1",
      });

      expect(res.status).toBe(200);
      expect(ms.createMeeting).toHaveBeenCalled();
    });

    it("should reject missing required fields", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings").send({ title: "Only title" });

      expect(res.status).toBe(400);
    });

    it("should reject unauthorized client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings").send({
        title: "M", startTime: "2026-03-15T14:00:00Z",
        endTime: "2026-03-15T15:00:00Z", type: "review", clientId: "client-1",
      });

      expect(res.status).toBe(403);
    });

    it("should reject non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings").send({
        title: "M", startTime: "2026-03-15T14:00:00Z",
        endTime: "2026-03-15T15:00:00Z", type: "review", clientId: "nonexistent",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/meetings/:id", () => {
    it("should return meeting with client", async () => {
      ms.getMeeting.mockResolvedValue(mockMeeting);
      ms.getClient.mockResolvedValue(mockClient);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/meetings/meeting-1");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("title", "Annual Review");
      expect(res.body).toHaveProperty("client");
    });

    it("should return 404 for non-existent meeting", async () => {
      ms.getMeeting.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.get("/api/meetings/nonexistent")).status).toBe(404);
    });
  });

  describe("POST /api/meetings/:id/notes", () => {
    it("should update meeting notes", async () => {
      ms.getMeeting.mockResolvedValue(mockMeeting as any);
      ms.updateMeeting.mockResolvedValue({ ...mockMeeting, notes: "Updated" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/notes").send({ notes: "Updated" });

      expect(res.status).toBe(200);
      expect(ms.updateMeeting).toHaveBeenCalledWith("meeting-1", { notes: "Updated" });
    });

    it("should return 404 for non-existent meeting", async () => {
      ms.updateMeeting.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.post("/api/meetings/nonexistent/notes").send({ notes: "Test" })).status).toBe(404);
    });
  });

  describe("POST /api/meetings/:id/prep", () => {
    it("should return 404 for non-existent meeting", async () => {
      ms.getMeeting.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.post("/api/meetings/nonexistent/prep")).status).toBe(404);
    });

    it("should return 400 for meeting without client", async () => {
      ms.getMeeting.mockResolvedValue({ ...mockMeeting, clientId: null });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/prep");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No client associated");
    });
  });

  describe("POST /api/meetings/:id/summarize", () => {
    it("should return 400 for non-completed meeting", async () => {
      ms.getMeeting.mockResolvedValue({ ...mockMeeting, status: "scheduled" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/summarize");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only completed meetings can be summarized");
    });

    it("should return 400 for meeting without client", async () => {
      ms.getMeeting.mockResolvedValue({ ...mockMeeting, clientId: null });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.post("/api/meetings/meeting-1/summarize")).status).toBe(400);
    });
  });

  describe("POST /api/meetings/:id/transcript", () => {
    it("should return 404 for non-existent meeting", async () => {
      ms.getMeeting.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.post("/api/meetings/nonexistent/transcript").send({ text: "T" })).status).toBe(404);
    });

    it("should return 400 when no transcript provided", async () => {
      ms.getMeeting.mockResolvedValue(mockMeeting);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/transcript").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No transcript file or text provided");
    });
  });
});
