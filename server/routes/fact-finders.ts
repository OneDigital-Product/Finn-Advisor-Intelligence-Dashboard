import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { db } from "../db";
import { factFinderDefinitions, factFinderResponses, clients } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { calculateCompletionPercentage, renderFactFinder } from "../engines/fact-finder-renderer";

export function registerFactFinderRoutes(app: Express) {
  app.get("/api/fact-finders", requireAuth, async (_req, res) => {
    try {
      const definitions = await db
        .select()
        .from(factFinderDefinitions)
        .where(eq(factFinderDefinitions.isActive, true))
        .orderBy(factFinderDefinitions.name);
      res.json(definitions);
    } catch (err) {
      logger.error({ err }, "GET /api/fact-finders error");
      res.status(500).json({ message: "Failed to fetch fact finders" });
    }
  });

  app.get("/api/fact-finders/:id", requireAuth, async (req, res) => {
    try {
      const [definition] = await db
        .select()
        .from(factFinderDefinitions)
        .where(eq(factFinderDefinitions.id, req.params.id as string))
        .limit(1);
      if (!definition) return res.status(404).json({ message: "Not found" });
      res.json(definition);
    } catch (err) {
      logger.error({ err }, "GET /api/fact-finders/:id error");
      res.status(500).json({ message: "Failed to fetch fact finder" });
    }
  });

  app.get("/api/fact-finders/:id/render", requireAuth, async (req, res) => {
    try {
      const [definition] = await db
        .select()
        .from(factFinderDefinitions)
        .where(eq(factFinderDefinitions.id, req.params.id as string))
        .limit(1);
      if (!definition) return res.status(404).json({ message: "Not found" });
      const answers = (req.query.answers ? JSON.parse(req.query.answers as string) : {});
      const rendered = renderFactFinder(definition, answers);
      res.json(rendered);
    } catch (err) {
      logger.error({ err }, "GET /api/fact-finders/:id/render error");
      res.status(500).json({ message: "Failed to render fact finder" });
    }
  });

  app.get("/api/fact-finder-responses", requireAuth, async (req, res) => {
    try {
      const advisor = (await getSessionAdvisor(req))!;
      const clientId = req.query.clientId as string;
      const status = req.query.status as string;
      let conditions: any[] = [eq(factFinderResponses.advisorId, advisor.id)];
      if (clientId) conditions.push(eq(factFinderResponses.clientId, clientId as string));
      if (status) conditions.push(eq(factFinderResponses.status, status as string));

      const responses = await db
        .select({
          response: factFinderResponses,
          definitionName: factFinderDefinitions.name,
          definitionCategory: factFinderDefinitions.category,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        })
        .from(factFinderResponses)
        .leftJoin(factFinderDefinitions, eq(factFinderResponses.definitionId, factFinderDefinitions.id))
        .leftJoin(clients, eq(factFinderResponses.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(factFinderResponses.createdAt));

      res.json(responses.map((r) => ({
        ...r.response,
        definitionName: r.definitionName,
        definitionCategory: r.definitionCategory,
        clientName: r.clientFirstName && r.clientLastName
          ? `${r.clientFirstName} ${r.clientLastName}`
          : r.clientFirstName || r.clientLastName || "—",
      })));
    } catch (err) {
      logger.error({ err }, "GET /api/fact-finder-responses error");
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.post("/api/fact-finder-responses", requireAuth, async (req, res) => {
    try {
      const advisor = (await getSessionAdvisor(req))!;
      const { definitionId, clientId, householdId } = req.body;
      if (!definitionId || !clientId) {
        return res.status(400).json({ message: "definitionId and clientId are required" });
      }

      const [response] = await db
        .insert(factFinderResponses)
        .values({
          definitionId,
          clientId,
          householdId: householdId || null,
          advisorId: advisor.id,
          status: "draft",
          answers: {},
          completionPercentage: 0,
        })
        .returning();

      res.status(201).json(response);
    } catch (err) {
      logger.error({ err }, "POST /api/fact-finder-responses error");
      res.status(500).json({ message: "Failed to create response" });
    }
  });

  app.get("/api/fact-finder-responses/:id", requireAuth, async (req, res) => {
    try {
      const advisor = (await getSessionAdvisor(req))!;
      const [response] = await db
        .select()
        .from(factFinderResponses)
        .where(and(eq(factFinderResponses.id, req.params.id as string), eq(factFinderResponses.advisorId, advisor.id)))
        .limit(1);
      if (!response) return res.status(404).json({ message: "Not found" });
      res.json(response);
    } catch (err) {
      logger.error({ err }, "GET /api/fact-finder-responses/:id error");
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  app.patch("/api/fact-finder-responses/:id", requireAuth, async (req, res) => {
    try {
      const advisor = (await getSessionAdvisor(req))!;
      const id = req.params.id as string;
      const { answers } = req.body;

      const [existing] = await db
        .select()
        .from(factFinderResponses)
        .where(and(eq(factFinderResponses.id, id), eq(factFinderResponses.advisorId, advisor.id)))
        .limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });

      const [definition] = await db
        .select()
        .from(factFinderDefinitions)
        .where(eq(factFinderDefinitions.id, existing.definitionId))
        .limit(1);

      const completionPercentage = definition
        ? calculateCompletionPercentage(definition, answers)
        : 0;

      const [updated] = await db
        .update(factFinderResponses)
        .set({ answers, completionPercentage, updatedAt: new Date() })
        .where(eq(factFinderResponses.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "PATCH /api/fact-finder-responses/:id error");
      res.status(500).json({ message: "Failed to update response" });
    }
  });

  app.patch("/api/fact-finder-responses/:id/submit", requireAuth, async (req, res) => {
    try {
      const advisor = (await getSessionAdvisor(req))!;
      const id = req.params.id as string;
      const [updated] = await db
        .update(factFinderResponses)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(factFinderResponses.id, id), eq(factFinderResponses.advisorId, advisor.id)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "PATCH /api/fact-finder-responses/:id/submit error");
      res.status(500).json({ message: "Failed to submit response" });
    }
  });
}
