import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { sanitizeErrorMessage } from "../lib/error-utils";
import { requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { workflowOrchestrator } from "../engines/workflow-orchestrator";

const triggerWorkflowSchema = z.object({
  definitionId: z.string().optional(),
  slug: z.string().optional(),
  clientId: z.string().optional(),
  meetingId: z.string().optional(),
  triggerPayload: z.record(z.any()).optional(),
}).refine((data) => data.definitionId || data.slug, {
  message: "Either definitionId or slug must be provided",
});

const gateActionSchema = z.object({
  decision: z.enum(["approved", "rejected", "request_changes"]),
  decisionNote: z.string().optional(),
});

async function assertInstanceOwnership(instanceId: string, advisorId: string) {
  const instance = await storage.getWorkflowInstance(instanceId);
  if (!instance) return null;
  if (instance.advisorId !== advisorId) return null;
  return instance;
}

export function registerWorkflowAutomationRoutes(app: Express) {
  app.get("/api/workflow-automations/definitions", requireAdvisor, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const isActive = req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined;
      const definitions = await storage.getWorkflowDefinitions_v2({ category, isActive });
      res.json(definitions);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/workflow-automations/definitions/:id", requireAdvisor, async (req, res) => {
    try {
      const definition = await storage.getWorkflowDefinition_v2(req.params.id);
      if (!definition) return res.status(404).json({ message: "Definition not found" });
      res.json(definition);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/workflow-automations/instances", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const filters: any = { advisorId: advisor.id };
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.clientId) filters.clientId = req.query.clientId as string;
      if (req.query.definitionId) filters.definitionId = req.query.definitionId as string;
      if (req.query.meetingId) filters.meetingId = req.query.meetingId as string;

      const instances = await storage.getWorkflowInstances(filters);

      const enriched = await Promise.all(
        instances.map(async (inst) => {
          const definition = await storage.getWorkflowDefinition_v2(inst.definitionId);
          const gates = await storage.getWorkflowGatesByInstance(inst.id);
          const stepExecutions = await storage.getWorkflowStepExecutions(inst.id);
          const pendingGates = gates.filter((g) => g.status === "pending");
          const client = inst.clientId ? await storage.getClient(inst.clientId) : null;
          const stepsArray = Array.isArray(definition?.steps) ? definition.steps : [];
          const totalSteps = stepsArray.length;
          const completedSteps = stepExecutions.filter((s) => s.status === "completed").length;
          const lastCompletedStep = stepExecutions
            .filter((s) => s.status === "completed" && s.outputPayload)
            .sort((a, b) => (a.stepIndex > b.stepIndex ? -1 : 1))[0];
          const completionSummary = lastCompletedStep?.outputPayload
            ? (typeof (lastCompletedStep.outputPayload as Record<string, unknown>).summary === "string"
                ? (lastCompletedStep.outputPayload as Record<string, unknown>).summary as string
                : typeof (lastCompletedStep.outputPayload as Record<string, unknown>).content === "string"
                  ? String((lastCompletedStep.outputPayload as Record<string, unknown>).content).slice(0, 200)
                  : null)
            : null;
          return {
            ...inst,
            definitionName: definition?.name || "Unknown",
            definitionSlug: definition?.slug || "unknown",
            definitionCategory: definition?.category || "general",
            clientName: client ? `${client.firstName} ${client.lastName}` : null,
            totalSteps,
            completedSteps,
            completionSummary,
            pendingGateCount: pendingGates.length,
            pendingGates: pendingGates.map((g) => ({
              id: g.id,
              gateName: g.gateName,
              expiresAt: g.expiresAt,
              escalationLevel: g.escalationLevel,
            })),
          };
        })
      );

      res.json(enriched);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/workflow-automations/instances/:id", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const instance = await assertInstanceOwnership(req.params.id, advisor.id);
      if (!instance) return res.status(404).json({ message: "Instance not found" });

      const [definition, steps, gates] = await Promise.all([
        storage.getWorkflowDefinition_v2(instance.definitionId),
        storage.getWorkflowStepExecutions(instance.id),
        storage.getWorkflowGatesByInstance(instance.id),
      ]);

      res.json({
        ...instance,
        definitionName: definition?.name || "Unknown",
        definitionSlug: definition?.slug || "unknown",
        stepExecutions: steps,
        gates,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/workflow-automations/trigger", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const body = validateBody(triggerWorkflowSchema, req, res);
      if (!body) return;

      if (body.clientId) {
        const client = await storage.getClient(body.clientId);
        if (!client || client.advisorId !== advisor.id) {
          return res.status(403).json({ message: "Client does not belong to this advisor" });
        }
      }
      if (body.meetingId) {
        const meeting = await storage.getMeeting(body.meetingId);
        if (!meeting || meeting.advisorId !== advisor.id) {
          return res.status(403).json({ message: "Meeting does not belong to this advisor" });
        }
      }

      const payload = body.triggerPayload || {};

      let instance;
      if (body.slug) {
        instance = await workflowOrchestrator.triggerWorkflowBySlug(
          body.slug,
          advisor.id,
          payload,
          { clientId: body.clientId, meetingId: body.meetingId }
        );
      } else {
        instance = await workflowOrchestrator.triggerWorkflow(
          body.definitionId!,
          advisor.id,
          payload,
          { clientId: body.clientId, meetingId: body.meetingId }
        );
      }

      res.json(instance);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: sanitizeErrorMessage(error, "Failed to trigger workflow") });
    }
  });

  app.post("/api/workflow-automations/gates/:gateId/action", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const gate = await storage.getWorkflowGate(req.params.gateId);
      if (!gate) return res.status(404).json({ message: "Gate not found" });
      if (gate.ownerId !== advisor.id) return res.status(403).json({ message: "Not authorized to act on this gate" });

      const body = validateBody(gateActionSchema, req, res);
      if (!body) return;

      await workflowOrchestrator.resolveGate(req.params.gateId, body.decision, body.decisionNote);

      const updatedGate = await storage.getWorkflowGate(req.params.gateId);
      res.json(updatedGate);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: sanitizeErrorMessage(error, "Failed to process gate action") });
    }
  });

  app.get("/api/workflow-automations/gates/pending", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const gates = await storage.getWorkflowGatesByOwner(advisor.id, "pending");

      const enriched = await Promise.all(
        gates.map(async (gate) => {
          const instance = await storage.getWorkflowInstance(gate.instanceId);
          const definition = instance ? await storage.getWorkflowDefinition_v2(instance.definitionId) : null;
          const client = instance?.clientId ? await storage.getClient(instance.clientId) : null;
          return {
            ...gate,
            workflowName: definition?.name || "Unknown",
            clientName: client ? `${client.firstName} ${client.lastName}` : null,
            clientId: instance?.clientId,
          };
        })
      );

      res.json(enriched);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/workflow-automations/instances/:id/cancel", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const instance = await assertInstanceOwnership(req.params.id, advisor.id);
      if (!instance) return res.status(404).json({ message: "Instance not found" });

      const result = await workflowOrchestrator.cancelWorkflow(req.params.id);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: sanitizeErrorMessage(error, "Failed to cancel workflow") });
    }
  });

  app.post("/api/workflow-automations/instances/:id/pause", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const instance = await assertInstanceOwnership(req.params.id, advisor.id);
      if (!instance) return res.status(404).json({ message: "Instance not found" });

      const result = await workflowOrchestrator.pauseWorkflow(req.params.id);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: sanitizeErrorMessage(error, "Failed to pause workflow") });
    }
  });

  app.post("/api/workflow-automations/instances/:id/resume", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const instance = await assertInstanceOwnership(req.params.id, advisor.id);
      if (!instance) return res.status(404).json({ message: "Instance not found" });

      const result = await workflowOrchestrator.resumeWorkflow(req.params.id);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: sanitizeErrorMessage(error, "Failed to resume workflow") });
    }
  });

  app.post("/api/workflow-automations/check-overdue-gates", requireAdvisor, async (req, res) => {
    try {
      const escalated = await workflowOrchestrator.checkOverdueGates();
      res.json({ escalated });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
