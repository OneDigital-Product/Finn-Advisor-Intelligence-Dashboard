import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../health", () => ({
  healthCheckShallow: vi.fn((_req: any, res: any) => res.json({ status: "ok" })),
  healthCheckDetailed: vi.fn((_req: any, res: any) => res.json({ status: "ok", database: "connected", uptime: 12345 })),
  healthCheckReady: vi.fn((_req: any, res: any) => res.json({ ready: true })),
}));

import { registerHealthRoutes } from "../routes/health";

describe("Health API Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    registerHealthRoutes(app);
  });

  describe("GET /api/health", () => {
    it("should return shallow health check", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
    });
  });

  describe("GET /api/health/detailed", () => {
    it("should return detailed health check", async () => {
      const res = await request(app).get("/api/health/detailed");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
      expect(res.body).toHaveProperty("database");
    });
  });

  describe("GET /api/health/ready", () => {
    it("should return readiness check", async () => {
      const res = await request(app).get("/api/health/ready");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("ready", true);
    });
  });
});
