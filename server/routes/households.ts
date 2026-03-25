import { logger } from "../lib/logger";
import type { Express } from "express";
import { requireAdvisor } from "./middleware";
import { storage } from "../storage";
import { validateBody, qp } from "../lib/validation";
import { insertHouseholdSchema, insertHouseholdMemberSchema } from "@shared/schema";
import { isMulesoftEnabled } from "../integrations/mulesoft/client";
import { getHouseholds as getLiveHouseholds, getHouseholdMembers as getLiveHouseholdMembers } from "../integrations/mulesoft/api";

const updateHouseholdSchema = insertHouseholdSchema.omit({ advisorId: true }).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export function registerHouseholdRoutes(app: Express) {
  app.get("/api/households", async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      if (!advisorId) return res.status(401).json({ message: "Not authenticated" });
      let list = await storage.getHouseholds(advisorId);

      const householdIds = list.map(h => h.id);
      const aumMap = await storage.getAumByHousehold(householdIds);
      const enrichedList = list.map(h => ({
        ...h,
        currentAUM: aumMap.get(h.id) ?? 0,
      }));

      const page = Math.max(1, parseInt(qp(req.query.page) || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(qp(req.query.limit) || "50", 10)));
      const total = enrichedList.length;
      const start = (page - 1) * limit;
      const paged = enrichedList.slice(start, start + limit);

      res.json({ total, page, limit, households: paged });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  // -------------------------------------------------------------------------
  // MuleSoft → Salesforce Household V3 (LIVE endpoints)
  // These MUST be registered before /:id to avoid Express matching "live"
  // as a household ID parameter.
  // -------------------------------------------------------------------------

  /** GET /api/households/live — Household summary via MuleSoft → Salesforce */
  app.get("/api/households/live", async (req, res) => {
    try {
      if (!isMulesoftEnabled()) {
        return res.status(503).json({ message: "MuleSoft integration not enabled" });
      }
      const username = qp(req.query.username);
      if (!username) {
        return res.status(400).json({ message: "username query parameter is required" });
      }
      const result = await getLiveHouseholds({
        username,
        searchName: qp(req.query.searchName) || undefined,
        pageSize: req.query.pageSize ? parseInt(qp(req.query.pageSize) || "50", 10) : undefined,
        offset: req.query.offset ? parseInt(qp(req.query.offset) || "0", 10) : undefined,
      });
      if (!result) {
        return res.status(502).json({ message: "Failed to fetch households from MuleSoft" });
      }
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "[Households] Live household fetch failed");
      res.status(500).json({ message: "An error occurred fetching live household data." });
    }
  });

  /** GET /api/households/live/members — Household members via MuleSoft → Salesforce */
  app.get("/api/households/live/members", async (req, res) => {
    try {
      if (!isMulesoftEnabled()) {
        return res.status(503).json({ message: "MuleSoft integration not enabled" });
      }
      const username = qp(req.query.username);
      const householdId = qp(req.query.householdId);
      if (!username || !householdId) {
        return res.status(400).json({ message: "username and householdId query parameters are required" });
      }
      const result = await getLiveHouseholdMembers({
        username,
        householdId,
        searchName: qp(req.query.searchName) || undefined,
        pageSize: req.query.pageSize ? parseInt(qp(req.query.pageSize) || "50", 10) : undefined,
        offset: req.query.offset ? parseInt(qp(req.query.offset) || "0", 10) : undefined,
      });
      if (!result) {
        return res.status(502).json({ message: "Failed to fetch household members from MuleSoft" });
      }
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "[Households] Live household members fetch failed");
      res.status(500).json({ message: "An error occurred fetching live household members." });
    }
  });

  // -------------------------------------------------------------------------
  // Local DB household routes (after /live to avoid route conflicts)
  // -------------------------------------------------------------------------

  app.get("/api/households/:id", async (req, res) => {
    try {
      const household = await storage.getHousehold(req.params.id);
      if (!household) return res.status(404).json({ message: "Household not found" });
      if (household.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const members = await storage.getHouseholdMembers(household.id);
      const memberClientIds = members.map(m => m.clientId);
      const clientAumMap = await storage.getAumByClient(memberClientIds);
      const membersWithAum = members.map(m => ({
        ...m,
        currentAUM: clientAumMap.get(m.clientId)?.totalAum ?? 0,
      }));
      const currentAUM = membersWithAum.reduce((sum, m) => sum + m.currentAUM, 0);
      res.json({ ...household, currentAUM, members: membersWithAum });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/households/:id/members", async (req, res) => {
    try {
      const household = await storage.getHousehold(req.params.id);
      if (!household) return res.status(404).json({ message: "Household not found" });
      if (household.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      const members = await storage.getHouseholdMembers(req.params.id);
      res.json(members);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  const createHouseholdSchema = insertHouseholdSchema.omit({ advisorId: true });

  app.post("/api/households", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createHouseholdSchema, req, res);
      if (!body) return;
      if (body.primaryClientId) {
        const client = await storage.getClient(body.primaryClientId);
        if (!client || client.advisorId !== req.session.userId!) {
          return res.status(400).json({ message: "Primary client not found or not owned by you" });
        }
      }
      const household = await storage.createHousehold({ ...body, advisorId: req.session.userId! });
      res.status(201).json(household);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/households/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateHouseholdSchema, req, res);
      if (!body) return;
      const existing = await storage.getHousehold(req.params.id);
      if (!existing) return res.status(404).json({ message: "Household not found" });
      if (existing.advisorId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (body.primaryClientId) {
        const client = await storage.getClient(body.primaryClientId);
        if (!client || client.advisorId !== req.session.userId!) {
          return res.status(400).json({ message: "Primary client not found or not owned by you" });
        }
      }
      const result = await storage.updateHousehold(req.params.id, body);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
