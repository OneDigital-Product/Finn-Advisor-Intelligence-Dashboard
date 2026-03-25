import type { Express } from "express";
import { requireAuth, requireAdvisor } from "./middleware";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { executeTriggers } from "../engines/trigger-engine";

export function registerTriggerRoutes(app: Express) {
  app.get("/api/triggers/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getTriggerCategories();
      res.json(categories);
    } catch (err) {
      logger.error({ err }, "GET /api/triggers/categories error");
      res.status(500).json({ error: "Failed to fetch trigger categories" });
    }
  });

  app.post("/api/triggers/categories", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const { name, description, defaultActions } = req.body;
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }
      const category = await storage.createTriggerCategory({
        name,
        description: description || null,
        defaultActions: defaultActions || [],
        isActive: true,
      });
      res.status(201).json(category);
    } catch (err) {
      logger.error({ err }, "POST /api/triggers/categories error");
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/api/triggers/categories/:categoryId", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const { name, description, defaultActions } = req.body;
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (defaultActions !== undefined) updateData.defaultActions = defaultActions;

      const category = await storage.updateTriggerCategory((req.params.categoryId as string), updateData);
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (err) {
      logger.error({ err }, "PUT /api/triggers/categories/:categoryId error");
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.put("/api/triggers/categories/:categoryId/activate", requireAuth, requireAdvisor, async (req, res) => {
    try {
      await storage.toggleTriggerCategoryActive((req.params.categoryId as string), true);
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "PUT /api/triggers/categories/:categoryId/activate error");
      res.status(500).json({ error: "Failed to activate category" });
    }
  });

  app.put("/api/triggers/categories/:categoryId/deactivate", requireAuth, requireAdvisor, async (req, res) => {
    try {
      await storage.toggleTriggerCategoryActive((req.params.categoryId as string), false);
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "PUT /api/triggers/categories/:categoryId/deactivate error");
      res.status(500).json({ error: "Failed to deactivate category" });
    }
  });

  app.get("/api/triggers/actions/:lifeEventId", requireAuth, async (req, res) => {
    try {
      const lifeEvent = await storage.getLifeEvent((req.params.lifeEventId as string));
      if (!lifeEvent) {
        return res.status(404).json({ error: "Life event not found" });
      }

      const client = await storage.getClient(lifeEvent.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const advisorId = req.session.userId!;
      if (client.advisorId !== advisorId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const actions = await storage.getTriggerActionsForEvent((req.params.lifeEventId as string));
      res.json(actions);
    } catch (err) {
      logger.error({ err }, "GET /api/triggers/actions/:lifeEventId error");
      res.status(500).json({ error: "Failed to fetch trigger actions" });
    }
  });

  app.post("/api/life-events", requireAuth, async (req, res) => {
    try {
      const { clientId, eventType, eventDate, description, triggerCategoryId } = req.body;

      if (!clientId || !eventType || !eventDate || !description) {
        return res.status(400).json({ error: "clientId, eventType, eventDate, and description are required" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const advisorId = req.session.userId!;
      if (client.advisorId !== advisorId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const lifeEvent = await storage.createLifeEvent({
        clientId,
        eventType,
        eventDate,
        description,
        triggerCategoryId: triggerCategoryId || null,
      });

      const triggerResults = await executeTriggers(storage, lifeEvent.id, {
        clientId,
        eventType,
        description,
        triggerCategoryId,
      });

      const downstreamActions = triggerResults;

      if (triggerResults.length > 0) {
        await storage.updateLifeEvent(lifeEvent.id, {
          downstreamActions,
        });
      }

      res.status(201).json({ ...lifeEvent, downstreamActions });
    } catch (err) {
      logger.error({ err }, "POST /api/life-events error");
      res.status(500).json({ error: "Failed to create life event" });
    }
  });
}
