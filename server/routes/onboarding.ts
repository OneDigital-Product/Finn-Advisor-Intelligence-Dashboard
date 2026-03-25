import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import {
  getActiveOnboardings,
  checkMilestoneProgression,
  createFirst100DaysWorkflow,
} from "../engines/onboarding-engine";

const createOnboardingSchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
});

export function registerOnboardingRoutes(app: Express) {
  app.get("/api/onboarding/active", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const onboardings = await getActiveOnboardings(storage, advisor.id);
      res.json(onboardings);
    } catch (error: any) {
      logger.error({ err: error }, "API error fetching active onboardings");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/onboarding/create", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const body = validateBody(createOnboardingSchema, req, res);
      if (!body) return;

      const client = await storage.getClient(body.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized for this client" });

      const workflow = await createFirst100DaysWorkflow(
        storage,
        body.clientId,
        advisor.id,
        advisor.name,
      );
      res.json(workflow);
    } catch (error: any) {
      logger.error({ err: error }, "API error creating onboarding");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/onboarding/check-milestones", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const result = await checkMilestoneProgression(storage, advisor.id);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error checking milestones");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/onboarding/:clientId/status", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const onboardings = await getActiveOnboardings(storage, advisor.id);
      const clientOnboarding = onboardings.find(o => o.clientId === req.params.clientId);
      if (!clientOnboarding) return res.status(404).json({ message: "No active onboarding found for this client" });
      res.json(clientOnboarding);
    } catch (error: any) {
      logger.error({ err: error }, "API error fetching onboarding status");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
