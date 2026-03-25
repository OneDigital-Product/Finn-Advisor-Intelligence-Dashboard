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
    getDocument: vi.fn(),
    getDocumentsByClient: vi.fn(),
    createDocument: vi.fn(),
    getDocumentChecklist: vi.fn(),
    createDocumentChecklistItem: vi.fn(),
    updateDocumentChecklistItem: vi.fn(),
    getActiveDocumentClassificationConfig: vi.fn(),
    updateClient: vi.fn(),
    createAccount: vi.fn(),
    getAccountsByClient: vi.fn(),
    createHolding: vi.fn(),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    getMeetings: vi.fn().mockResolvedValue([]),
    getFilteredAlerts: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getClients: vi.fn().mockResolvedValue([]),
    getHouseholds: vi.fn().mockResolvedValue([]),
    getClientsByAssociate: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({
  isAIAvailable: () => false,
  parseClientDocument: vi.fn().mockResolvedValue({ profileUpdates: {}, accounts: [], holdings: [] }),
  classifyDocument: vi.fn().mockResolvedValue({ matchedChecklistItemId: null, reasoning: "", confidence: 0 }),
}));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));

import { registerAuthRoutes } from "../routes/auth";
import { registerDocumentRoutes } from "../routes/documents";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerDocumentRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
  });
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Document API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor" });
    ms.getFirstAdvisor.mockResolvedValue({ id: "advisor-1" });
  });

  describe("PATCH /api/document-checklist/:id", () => {
    it("should update checklist item", async () => {
      ms.updateDocumentChecklistItem.mockResolvedValue({ id: "cl-1", received: true, receivedDate: "2026-03-11" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/document-checklist/cl-1").send({ received: true, receivedDate: "2026-03-11" });

      expect(res.status).toBe(200);
    });

    it("should return 400 for invalid body", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.patch("/api/document-checklist/cl-1").send({ received: "not-bool" })).status).toBe(400);
    });

    it("should return 404 for non-existent item", async () => {
      ms.updateDocumentChecklistItem.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.patch("/api/document-checklist/nonexistent").send({ received: true })).status).toBe(404);
    });
  });

  describe("POST /api/clients/:id/init-checklist", () => {
    it("should initialize checklist", async () => {
      ms.getClient.mockResolvedValue({ id: "client-1", firstName: "John", lastName: "Doe" });
      ms.getDocumentChecklist.mockResolvedValue([]);
      ms.createDocumentChecklistItem.mockResolvedValue({ id: "item-1", category: "Identity" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/init-checklist");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return existing checklist if initialized", async () => {
      ms.getClient.mockResolvedValue({ id: "client-1" });
      ms.getDocumentChecklist.mockResolvedValue([{ id: "item-1" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/init-checklist");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 404 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.post("/api/clients/nonexistent/init-checklist")).status).toBe(404);
    });
  });

  describe("GET /api/documents/:id/download", () => {
    it("should download document for authorized advisor", async () => {
      ms.getDocument.mockResolvedValue({ id: "doc-1", clientId: "client-1", name: "Tax Return", fileName: "tax.txt", fileContent: "content" });
      ms.getClient.mockResolvedValue({ id: "client-1", advisorId: "advisor-1" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/documents/doc-1/download");

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toContain("tax.txt");
      expect(res.text).toBe("content");
    });

    it("should return 404 for non-existent document", async () => {
      ms.getDocument.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.get("/api/documents/nonexistent/download")).status).toBe(404);
    });

    it("should return 403 for unauthorized access", async () => {
      ms.getDocument.mockResolvedValue({ id: "doc-1", clientId: "client-1" });
      ms.getClient.mockResolvedValue({ id: "client-1", advisorId: "other-advisor" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.get("/api/documents/doc-1/download")).status).toBe(403);
    });

    it("should return 404 when no file content", async () => {
      ms.getDocument.mockResolvedValue({ id: "doc-1", clientId: "client-1", fileContent: null });
      ms.getClient.mockResolvedValue({ id: "client-1", advisorId: "advisor-1" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/documents/doc-1/download");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("No file content available for this document");
    });
  });
});
