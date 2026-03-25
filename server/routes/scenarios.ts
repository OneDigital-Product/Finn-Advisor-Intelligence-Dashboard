import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { runMonteCarloSimulation, type SimulationParams } from "../monte-carlo";

export function registerScenarioRoutes(app: Express) {
  app.get("/api/clients/:clientId/scenarios", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const scenarios = await storage.getMonteCarloScenarios((req.params.clientId as string));
      res.json(scenarios);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/scenarios/:scenarioId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const scenario = await storage.getMonteCarloScenario((req.params.scenarioId as string));
      if (!scenario || scenario.clientId !== (req.params.clientId as string)) return res.status(404).json({ message: "Scenario not found" });
      const events = await storage.getScenarioEvents((req.params.scenarioId as string));
      res.json({ ...scenario, events });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/scenarios", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const { name, currentAge, retirementAge, lifeExpectancy, annualSpending, expectedReturn, returnStdDev, inflationRate, preRetirementContribution } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ message: "Name is required" });
      if (!currentAge || !retirementAge || !annualSpending) return res.status(400).json({ message: "Current age, retirement age, and annual spending are required" });

      const scenario = await storage.createMonteCarloScenario({
        clientId: (req.params.clientId as string),
        name,
        currentAge: parseInt(currentAge),
        retirementAge: parseInt(retirementAge),
        lifeExpectancy: lifeExpectancy ? parseInt(lifeExpectancy) : 90,
        annualSpending: String(annualSpending),
        expectedReturn: expectedReturn ? String(expectedReturn) : "0.07",
        returnStdDev: returnStdDev ? String(returnStdDev) : "0.12",
        inflationRate: inflationRate ? String(inflationRate) : "0.03",
        preRetirementContribution: preRetirementContribution ? String(preRetirementContribution) : "0",
      });
      res.json(scenario);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/clients/:clientId/scenarios/:scenarioId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const scenario = await storage.getMonteCarloScenario((req.params.scenarioId as string));
      if (!scenario || scenario.clientId !== (req.params.clientId as string)) return res.status(404).json({ message: "Scenario not found" });
      await storage.deleteMonteCarloScenario((req.params.scenarioId as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/scenarios/:scenarioId/events", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const scenario = await storage.getMonteCarloScenario((req.params.scenarioId as string));
      if (!scenario || scenario.clientId !== (req.params.clientId as string)) return res.status(404).json({ message: "Scenario not found" });

      const { name, type, amount, startAge, endAge, inflationAdjusted } = req.body;
      if (!name || !type || !amount || !startAge) return res.status(400).json({ message: "Name, type, amount, and start age are required" });
      if (!["expense", "income"].includes(type)) return res.status(400).json({ message: "Type must be 'expense' or 'income'" });

      const event = await storage.createScenarioEvent({
        scenarioId: (req.params.scenarioId as string),
        name,
        type,
        amount: String(amount),
        startAge: parseInt(startAge),
        endAge: endAge ? parseInt(endAge) : null,
        inflationAdjusted: inflationAdjusted !== false,
      });
      res.json(event);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/clients/:clientId/scenarios/:scenarioId/events/:eventId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const scenario = await storage.getMonteCarloScenario((req.params.scenarioId as string));
      if (!scenario || scenario.clientId !== (req.params.clientId as string)) return res.status(404).json({ message: "Scenario not found" });
      const events = await storage.getScenarioEvents((req.params.scenarioId as string));
      const eventBelongs = events.some(e => e.id === (req.params.eventId as string));
      if (!eventBelongs) return res.status(404).json({ message: "Event not found in this scenario" });
      await storage.deleteScenarioEvent((req.params.eventId as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/scenarios/:scenarioId/run", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const scenario = await storage.getMonteCarloScenario((req.params.scenarioId as string));
      if (!scenario || scenario.clientId !== (req.params.clientId as string)) return res.status(404).json({ message: "Scenario not found" });

      const clientAccounts = await storage.getAccountsByClient(req.params.clientId as string);
      const totalPortfolio = clientAccounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

      const events = await storage.getScenarioEvents((req.params.scenarioId as string));

      const simParams: SimulationParams = {
        currentAge: scenario.currentAge,
        retirementAge: scenario.retirementAge,
        lifeExpectancy: scenario.lifeExpectancy,
        initialPortfolio: totalPortfolio,
        annualSpending: parseFloat(scenario.annualSpending),
        expectedReturn: parseFloat(scenario.expectedReturn),
        returnStdDev: parseFloat(scenario.returnStdDev),
        inflationRate: parseFloat(scenario.inflationRate),
        preRetirementContribution: parseFloat(scenario.preRetirementContribution || "0"),
        events: events.map(e => ({
          name: e.name,
          type: e.type as "expense" | "income",
          amount: parseFloat(e.amount),
          startAge: e.startAge,
          endAge: e.endAge,
          inflationAdjusted: e.inflationAdjusted,
        })),
      };

      const results = runMonteCarloSimulation(simParams);

      await storage.updateMonteCarloScenario((req.params.scenarioId as string), { results });

      res.json({ scenario: { ...scenario, results }, simulationResults: results, portfolioUsed: totalPortfolio });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
