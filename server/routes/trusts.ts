import { logger } from "../lib/logger";
import type { Express } from "express";
import { requireAdvisor } from "./middleware";
import { storage } from "../storage";
import { validateBody } from "../lib/validation";
import { insertTrustSchema, insertTrustRelationshipSchema } from "@shared/schema";

const updateTrustSchema = insertTrustSchema.omit({ advisorId: true, clientId: true }).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export function registerTrustRoutes(app: Express) {
  app.get("/api/clients/:clientId/trusts", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const trusts = await storage.getTrustsByClient(req.params.clientId);
      res.json(trusts);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/trusts/:id", async (req, res) => {
    try {
      const trust = await storage.getTrust(req.params.id);
      if (!trust) return res.status(404).json({ message: "Trust not found" });
      if (trust.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const relationships = await storage.getTrustRelationships(trust.id);
      res.json({ ...trust, relationships });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  const createTrustSchema = insertTrustSchema.omit({ advisorId: true });
  const createTrustRelSchema = insertTrustRelationshipSchema.omit({ trustId: true });

  app.post("/api/trusts", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createTrustSchema, req, res);
      if (!body) return;
      if (body.clientId) {
        const client = await storage.getClient(body.clientId);
        if (!client || client.advisorId !== req.session.userId!) {
          return res.status(400).json({ message: "Client not found or not owned by you" });
        }
      }
      const trust = await storage.createTrust({ ...body, advisorId: req.session.userId! });
      res.status(201).json(trust);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/trusts/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateTrustSchema, req, res);
      if (!body) return;
      const existing = await storage.getTrust(req.params.id);
      if (!existing) return res.status(404).json({ message: "Trust not found" });
      if (existing.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const result = await storage.updateTrust(req.params.id, body);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/trusts/:id", requireAdvisor, async (req, res) => {
    try {
      const existing = await storage.getTrust(req.params.id);
      if (!existing) return res.status(404).json({ message: "Trust not found" });
      if (existing.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteTrust(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/trusts/:id/relationships", async (req, res) => {
    try {
      const trust = await storage.getTrust(req.params.id);
      if (!trust) return res.status(404).json({ message: "Trust not found" });
      if (trust.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const relationships = await storage.getTrustRelationships(req.params.id);
      res.json(relationships);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/trusts/:id/relationships", requireAdvisor, async (req, res) => {
    try {
      const trust = await storage.getTrust(req.params.id);
      if (!trust) return res.status(404).json({ message: "Trust not found" });
      if (trust.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const body = validateBody(createTrustRelSchema, req, res);
      if (!body) return;
      const relationship = await storage.createTrustRelationship({ ...body, trustId: req.params.id });
      res.status(201).json(relationship);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/trust-relationships/:id", requireAdvisor, async (req, res) => {
    try {
      const rel = await storage.getTrustRelationship(req.params.id);
      if (!rel) return res.status(404).json({ message: "Trust relationship not found" });
      const trust = await storage.getTrust(rel.trustId);
      if (!trust || trust.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteTrustRelationship(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
