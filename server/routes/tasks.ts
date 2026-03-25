import type { Express } from "express";
import { z } from "zod";
import { getSessionAdvisor, requireAuth } from "./middleware";
import { storage } from "../storage";
import { insertTaskSchema, insertActivitySchema } from "@shared/schema";
import { validateBody } from "../lib/validation";
import { isValidSalesforceId } from "../integrations/salesforce/validate-salesforce-id";
import { logger } from "../lib/logger";

function calculateNextDueDate(currentDue: string, pattern: string, interval: number, daysOfWeek?: number[], dateOfMonth?: number | null): string {
  const d = new Date(currentDue);
  switch (pattern) {
    case "daily":
      d.setDate(d.getDate() + interval);
      break;
    case "weekly":
      if (daysOfWeek && daysOfWeek.length > 0) {
        const sorted = [...daysOfWeek].sort((a, b) => a - b);
        const currentDay = d.getDay();
        const nextDay = sorted.find(day => day > currentDay);
        if (nextDay !== undefined) {
          d.setDate(d.getDate() + (nextDay - currentDay));
        } else {
          d.setDate(d.getDate() + (7 * interval - currentDay + sorted[0]));
        }
      } else {
        d.setDate(d.getDate() + 7 * interval);
      }
      break;
    case "monthly":
      d.setMonth(d.getMonth() + interval);
      if (dateOfMonth && dateOfMonth >= 1 && dateOfMonth <= 28) {
        d.setDate(dateOfMonth);
      }
      break;
  }
  return d.toISOString().split("T")[0];
}

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  category: z.string().nullable().optional(),
  type: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  meetingId: z.string().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export function registerTaskRoutes(app: Express) {
  app.get("/api/tasks/overdue", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const overdue = await storage.getOverdueTasks(advisor.id);
      const tasksWithClients = await Promise.all(
        overdue.map(async (task) => {
          if (!task.clientId) return { ...task, clientName: null };
          const client = await storage.getClient(task.clientId);
          return { ...task, clientName: client ? `${client.firstName} ${client.lastName}` : null };
        })
      );
      res.json(tasksWithClients);
    } catch (err) {
      logger.error({ err }, "[Tasks] overdue fetch failed");
      res.status(500).json({ message: "Failed to load overdue tasks" });
    }
  });

  app.get("/api/tasks/upcoming", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const days = parseInt(req.query.days as string) || 7;
      const upcoming = await storage.getUpcomingTasks(advisor.id, days);
      const tasksWithClients = await Promise.all(
        upcoming.map(async (task) => {
          if (!task.clientId) return { ...task, clientName: null };
          const client = await storage.getClient(task.clientId);
          return { ...task, clientName: client ? `${client.firstName} ${client.lastName}` : null };
        })
      );
      res.json(tasksWithClients);
    } catch (err) {
      logger.error({ err }, "[Tasks] upcoming fetch failed");
      res.status(500).json({ message: "Failed to load upcoming tasks" });
    }
  });

  app.put("/api/tasks/:id/complete", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const existing = await storage.getTask(req.params.id);
      if (!existing) return res.status(404).json({ message: "Task not found" });
      if (existing.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const task = await storage.completeTask(req.params.id);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const recurringConfig = await storage.getRecurringTaskByTaskId(task.id);
      let nextTask = null;
      if (recurringConfig && recurringConfig.active) {
        const daysOfWeek = Array.isArray(recurringConfig.daysOfWeek) ? recurringConfig.daysOfWeek as number[] : undefined;
        const nextDue = calculateNextDueDate(task.dueDate || new Date().toISOString().split("T")[0], recurringConfig.pattern, recurringConfig.interval, daysOfWeek, recurringConfig.dateOfMonth);

        if (recurringConfig.endDate && nextDue > recurringConfig.endDate) {
          await storage.updateRecurringTask(recurringConfig.id, { active: false });
        } else {
          nextTask = await storage.createTask({
            advisorId: task.advisorId,
            clientId: task.clientId || undefined,
            title: task.title,
            description: task.description || undefined,
            dueDate: nextDue,
            priority: task.priority,
            status: "pending",
            category: task.category || undefined,
            type: task.type,
          });
          await storage.updateRecurringTask(recurringConfig.id, { taskId: nextTask.id, nextDueDate: nextDue });
        }
      }

      res.json({ task, nextTask, recurring: !!recurringConfig });
    } catch (err) {
      logger.error({ err }, "[Tasks] complete failed");
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.get("/api/tasks/:id/recurring", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ message: "Task not found" });
      if (task.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const config = await storage.getRecurringTaskByTaskId(task.id);
      res.json(config || null);
    } catch (err) {
      logger.error({ err }, "[Tasks] recurring config fetch failed");
      res.status(500).json({ message: "Failed to load recurring config" });
    }
  });

  app.post("/api/tasks/:id/recurring", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ message: "Task not found" });
      if (task.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const existing = await storage.getRecurringTaskByTaskId(task.id);
      if (existing && existing.active) {
        await storage.updateRecurringTask(existing.id, { active: false });
        return res.json({ ...existing, active: false, toggled: "off" });
      }

      const { pattern, interval, daysOfWeek, dateOfMonth, endDate } = req.body;
      if (!pattern || !["daily", "weekly", "monthly"].includes(pattern)) {
        return res.status(400).json({ message: "pattern must be daily, weekly, or monthly" });
      }

      const nextDue = calculateNextDueDate(task.dueDate || new Date().toISOString().split("T")[0], pattern, interval || 1, daysOfWeek, dateOfMonth);
      const config = await storage.createRecurringTask({
        taskId: task.id,
        pattern,
        interval: interval || 1,
        daysOfWeek: daysOfWeek || [],
        dateOfMonth: dateOfMonth || null,
        endDate: endDate || null,
        nextDueDate: nextDue,
        active: true,
      });

      res.json({ ...config, toggled: "on" });
    } catch (err) {
      logger.error({ err }, "[Tasks] recurring create/toggle failed");
      res.status(500).json({ message: "Failed to update recurring config" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const allTasks = await storage.getTasks(advisor.id);

      const tasksWithClients = await Promise.all(
        allTasks.map(async (task) => {
          if (!task.clientId) return { ...task, clientName: null };
          const client = await storage.getClient(task.clientId);
          return { ...task, clientName: client ? `${client.firstName} ${client.lastName}` : null };
        })
      );
      res.json(tasksWithClients);
    } catch (err) {
      logger.error({ err }, "[Tasks] list fetch failed");
      res.status(500).json({ message: "Failed to load tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const createTaskSchema = insertTaskSchema.omit({ advisorId: true });
      const body = validateBody(createTaskSchema, req, res);
      if (!body) return;
      if (body.salesforceTaskId !== undefined && body.salesforceTaskId !== null && !isValidSalesforceId(body.salesforceTaskId)) {
        return res.status(400).json({ message: "Invalid Salesforce Task ID format" });
      }
      const task = await storage.createTask({ ...body, advisorId: advisor.id });
      res.json(task);
    } catch (err) {
      logger.error({ err }, "[Tasks] create failed");
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const body = validateBody(updateTaskSchema, req, res);
      if (!body) return;
      const task = await storage.updateTask(req.params.id, body);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (err) {
      logger.error({ err }, "[Tasks] update failed");
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Not authorized" });
      const allTasks = await storage.getTasks(advisor.id);
      if (!allTasks.some(t => t.id === (req.params.id as string))) {
        return res.status(403).json({ message: "Not authorized to delete this task" });
      }
      await storage.deleteTask((req.params.id as string));
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "[Tasks] delete failed");
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.get("/api/clients/:clientId/tasks", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Not authorized" });
      const client = await storage.getClient((req.params.clientId as string));
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      const clientTasks = await storage.getTasksByClient((req.params.clientId as string));
      const allAssociates = await storage.getAllAssociates();
      const tasksWithAssignee = clientTasks.map((task) => {
        const assignee = task.assigneeId ? allAssociates.find((a) => a.id === task.assigneeId) : null;
        return {
          ...task,
          assigneeName: assignee?.name || null,
          assigneeAvatarUrl: assignee?.avatarUrl || null,
        };
      });
      res.json(tasksWithAssignee);
    } catch (err) {
      logger.error({ err }, "[Tasks] client tasks fetch failed");
      res.status(500).json({ message: "Failed to load client tasks" });
    }
  });

  app.get("/api/meetings/:meetingId/tasks", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Not authorized" });
      const meeting = await storage.getMeeting((req.params.meetingId as string));
      if (!meeting || meeting.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      const meetingTasks = await storage.getTasksByMeeting((req.params.meetingId as string));
      const allAssociates = await storage.getAllAssociates();
      const tasksWithAssignee = meetingTasks.map((task) => {
        const assignee = task.assigneeId ? allAssociates.find((a) => a.id === task.assigneeId) : null;
        return {
          ...task,
          assigneeName: assignee?.name || null,
          assigneeAvatarUrl: assignee?.avatarUrl || null,
        };
      });
      res.json(tasksWithAssignee);
    } catch (err) {
      logger.error({ err }, "[Tasks] meeting tasks fetch failed");
      res.status(500).json({ message: "Failed to load meeting tasks" });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { severity, type: alertType, clientId, limit, offset } = req.query;
      const allAlerts = await storage.getFilteredAlerts(advisor.id, {
        severity: severity as string | undefined,
        alertType: alertType as string | undefined,
        clientId: clientId as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      const alertsWithClients = await Promise.all(
        allAlerts.map(async (alert) => {
          if (!alert.clientId) return { ...alert, clientName: null };
          const client = await storage.getClient(alert.clientId);
          return { ...alert, clientName: client ? `${client.firstName} ${client.lastName}` : null };
        })
      );
      res.json(alertsWithClients);
    } catch (err) {
      logger.error({ err }, "[Tasks] alerts fetch failed");
      res.status(500).json({ message: "Failed to load alerts" });
    }
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const alert = await storage.markAlertRead(req.params.id, advisor.id);
      if (!alert) return res.status(404).json({ message: "Alert not found" });
      res.json(alert);
    } catch (err) {
      logger.error({ err }, "[Tasks] alert mark-read failed");
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const createActivitySchema = insertActivitySchema.omit({ advisorId: true });
      const body = validateBody(createActivitySchema, req, res);
      if (!body) return;
      if (body.salesforceActivityId !== undefined && body.salesforceActivityId !== null && !isValidSalesforceId(body.salesforceActivityId)) {
        return res.status(400).json({ message: "Invalid Salesforce Activity ID format" });
      }
      const activity = await storage.createActivity({ ...body, advisorId: advisor.id });
      res.json(activity);
    } catch (err) {
      logger.error({ err }, "[Tasks] activity create failed");
      res.status(500).json({ message: "Failed to create activity" });
    }
  });
}
