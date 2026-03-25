import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { getReachableCompletedSteps, sendWorkflowNotifications } from "./utils";
import { storage } from "../storage";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  steps: z.array(z.any()).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  steps: z.array(z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const assignWorkflowSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
});

const updateWorkflowSchema = z.object({
  steps: z.array(z.any()).optional(),
  status: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const updateStepSchema = z.object({
  completed: z.boolean().optional(),
  notes: z.string().optional(),
  response: z.any().optional(),
});

export function registerWorkflowRoutes(app: Express) {
  app.get("/api/workflows/templates", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const templates = await storage.getWorkflowTemplates(advisor.id);
      res.json(templates);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/workflows/templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getWorkflowTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/workflows/templates", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const body = validateBody(createTemplateSchema, req, res);
      if (!body) return;
      const template = await storage.createWorkflowTemplate({
        advisorId: advisor.id,
        name: body.name,
        description: body.description || null,
        category: body.category || "general",
        steps: body.steps || [],
      });
      res.json(template);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/workflows/templates/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateTemplateSchema, req, res);
      if (!body) return;
      const template = await storage.updateWorkflowTemplate((req.params.id as string), body);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/workflows/templates/:id", requireAdvisor, async (req, res) => {
    try {
      await storage.deleteWorkflowTemplate((req.params.id as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/workflows", requireAuth, async (req, res) => {
    try {
      const workflows = await storage.getClientWorkflows(req.params.clientId);
      res.json(workflows);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/workflows", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const body = validateBody(assignWorkflowSchema, req, res);
      if (!body) return;
      const template = await storage.getWorkflowTemplate(body.templateId);
      if (!template) return res.status(404).json({ message: "Template not found" });
      const templateSteps = (template.steps as any[]) || [];
      const workflowSteps = templateSteps.map((s: any) => ({
        id: s.id || `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        stepNumber: s.stepNumber,
        title: s.title,
        description: s.description || "",
        outputType: s.outputType || "none",
        choices: s.choices || [],
        connections: s.connections || {},
        completed: false,
        completedAt: null,
        notes: "",
        response: null,
      }));
      const workflow = await storage.createClientWorkflow({
        clientId: (req.params.clientId as string),
        templateId: template.id,
        templateName: template.name,
        status: "active",
        steps: workflowSteps,
        startedAt: new Date().toISOString().split("T")[0],
        completedAt: null,
        assignedBy: advisor.name,
      });
      const notifications = await sendWorkflowNotifications(
        (req.params.clientId as string), template.name, "Workflow applied", req.session.userName!
      );
      res.json({ ...workflow, notifiedNames: notifications.notifiedNames });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/clients/:clientId/workflows/:workflowId", requireAuth, async (req, res) => {
    try {
      const workflow = await storage.getClientWorkflow(req.params.workflowId);
      if (!workflow || workflow.clientId !== (req.params.clientId as string)) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      const body = validateBody(updateWorkflowSchema, req, res);
      if (!body) return;
      const update: any = {};
      if (body.steps !== undefined) {
        update.steps = body.steps;
        const reachable = getReachableCompletedSteps(body.steps as any[]);
        const allCompleted = reachable.length > 0 && reachable.every((s: any) => s.completed);
        if (allCompleted) {
          update.status = "completed";
          update.completedAt = new Date().toISOString().split("T")[0];
        } else {
          update.status = "active";
          update.completedAt = null;
        }
      }
      if (body.status !== undefined) {
        update.status = body.status;
        if (body.status === "completed") {
          update.completedAt = new Date().toISOString().split("T")[0];
        }
      }
      const updated = await storage.updateClientWorkflow(req.params.workflowId, update);
      if (!updated) return res.status(404).json({ message: "Workflow not found" });
      const action = update.status === "completed" ? "Workflow completed" : "Workflow updated";
      const notifications = await sendWorkflowNotifications(
        (req.params.clientId as string), workflow.templateName, action, req.session.userName!
      );
      res.json({ ...updated, notifiedNames: notifications.notifiedNames });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/clients/:clientId/workflows/:workflowId/steps/:stepIndex", requireAuth, async (req, res) => {
    try {
      const workflow = await storage.getClientWorkflow(req.params.workflowId);
      if (!workflow || workflow.clientId !== (req.params.clientId as string)) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      const stepIndex = parseInt(req.params.stepIndex);
      if (!Number.isFinite(stepIndex)) {
        return res.status(400).json({ message: "Invalid step index" });
      }
      const steps = (workflow.steps as any[]) || [];
      if (stepIndex < 0 || stepIndex >= steps.length) {
        return res.status(400).json({ message: "Invalid step index" });
      }
      const body = validateBody(updateStepSchema, req, res);
      if (!body) return;
      if (body.completed !== undefined) {
        steps[stepIndex].completed = body.completed;
        steps[stepIndex].completedAt = body.completed ? new Date().toISOString().split("T")[0] : null;
        if (!body.completed) {
          steps[stepIndex].response = null;
        }
      }
      if (body.notes !== undefined) {
        steps[stepIndex].notes = body.notes;
      }
      if (body.response !== undefined) {
        steps[stepIndex].response = body.response;
      }
      const reachableSteps = getReachableCompletedSteps(steps);
      const allReachableCompleted = reachableSteps.length > 0 && reachableSteps.every((s: any) => s.completed);
      const update: any = { steps };
      if (allReachableCompleted && reachableSteps.length > 0) {
        update.status = "completed";
        update.completedAt = new Date().toISOString().split("T")[0];
      } else {
        update.status = "active";
        update.completedAt = null;
      }
      const updated = await storage.updateClientWorkflow(req.params.workflowId, update);

      if (body.completed && steps[stepIndex].taskConfig?.createTask) {
        const taskConfig = steps[stepIndex].taskConfig;
        const stepTitle = steps[stepIndex].title || `Step ${stepIndex + 1}`;
        const dueDateOffset = taskConfig.dueDateOffset ?? 7;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dueDateOffset);

        const advisor = await getSessionAdvisor(req);
        if (advisor) {
          await storage.createTask({
            advisorId: advisor.id,
            clientId: (req.params.clientId as string),
            title: taskConfig.taskTitle || `Follow up: ${stepTitle}`,
            description: `Auto-created from workflow "${workflow.templateName}" - step "${stepTitle}"`,
            type: taskConfig.taskType || "general",
            dueDate: dueDate.toISOString().split("T")[0],
            priority: "medium",
            status: "pending",
          });
        }
      }

      const stepTitle = steps[stepIndex].title || `Step ${stepIndex + 1}`;
      const action = body.completed
        ? `Step completed: ${stepTitle}`
        : `Step unchecked: ${stepTitle}`;
      const notifications = await sendWorkflowNotifications(
        (req.params.clientId as string), workflow.templateName, action, req.session.userName!
      );
      res.json({ ...updated, notifiedNames: notifications.notifiedNames });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
