import type { IStorage } from "../storage";
import type { InsertLifeEvent } from "@shared/schema";
import { logger } from "../lib/logger";

export interface TriggerExecutionResult {
  actionType: string;
  status: "executed" | "failed" | "skipped";
  resultMetadata?: Record<string, any>;
  error?: string;
}

export async function executeTriggers(
  storage: IStorage,
  lifeEventId: string,
  lifeEventData: { clientId: string; eventType: string; description: string; triggerCategoryId?: string | null }
): Promise<TriggerExecutionResult[]> {
  const results: TriggerExecutionResult[] = [];

  try {
    let categoryId = lifeEventData.triggerCategoryId;

    if (!categoryId) {
      const category = await storage.getTriggerCategoryByName(lifeEventData.eventType);
      categoryId = category?.id || null;
    }

    if (!categoryId) {
      return [];
    }

    const category = await storage.getTriggerCategory(categoryId);
    if (!category?.isActive) {
      return [];
    }

    const actions = Array.isArray(category.defaultActions) ? category.defaultActions : [];

    for (const action of actions as any[]) {
      try {
        const result = await executeAction(storage, action, lifeEventData);

        await storage.createTriggerAction({
          lifeEventId,
          triggerCategoryId: categoryId,
          actionType: action.actionType,
          status: result.status,
          resultMetadata: result.resultMetadata || null,
        });

        results.push(result);
      } catch (err) {
        logger.error({ err, actionType: action.actionType }, "Error executing trigger action");

        await storage.createTriggerAction({
          lifeEventId,
          triggerCategoryId: categoryId,
          actionType: action.actionType,
          status: "failed",
          resultMetadata: { error: String(err) },
        });

        results.push({
          actionType: action.actionType,
          status: "failed",
          error: String(err),
        });
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in executeTriggers");
  }

  return results;
}

async function executeAction(
  storage: IStorage,
  action: any,
  lifeEventData: { clientId: string; eventType: string; description: string }
): Promise<TriggerExecutionResult> {
  switch (action.actionType) {
    case "create_task":
      return createTaskAction(storage, action, lifeEventData);
    case "refresh_profile":
      return refreshProfileAction(storage, lifeEventData);
    case "create_reminder":
      return createReminderAction(storage, action, lifeEventData);
    case "flag_review":
      return flagReviewAction(storage, lifeEventData);
    default:
      return { actionType: action.actionType, status: "skipped" };
  }
}

async function createTaskAction(
  storage: IStorage,
  action: any,
  data: { clientId: string; eventType: string }
): Promise<TriggerExecutionResult> {
  const client = await storage.getClient(data.clientId);
  if (!client) throw new Error("Client not found");

  const dueDate = new Date();
  if (action.dueDays) {
    dueDate.setDate(dueDate.getDate() + action.dueDays);
  }

  const task = await storage.createTask({
    advisorId: client.advisorId,
    clientId: data.clientId,
    title: action.taskTitle || `Action required: ${data.eventType}`,
    description: action.taskDescription || `Triggered by life event: ${data.eventType}`,
    dueDate: dueDate.toISOString().split("T")[0],
    priority: action.taskPriority || "medium",
    category: "life_event_action",
    type: "trigger",
    status: "pending",
  });

  return {
    actionType: "create_task",
    status: "executed",
    resultMetadata: { taskId: task.id, title: task.title },
  };
}

async function refreshProfileAction(
  storage: IStorage,
  data: { clientId: string; eventType: string }
): Promise<TriggerExecutionResult> {
  const profiles = await storage.getInvestorProfilesByClient(data.clientId);
  if (profiles.length === 0) {
    return { actionType: "refresh_profile", status: "skipped" };
  }

  const activeProfile = profiles.find((p) => p.status !== "expired") || profiles[0];
  await storage.updateInvestorProfile(activeProfile.id, { status: "expired" });

  return {
    actionType: "refresh_profile",
    status: "executed",
    resultMetadata: { profileId: activeProfile.id, newStatus: "expired" },
  };
}

async function createReminderAction(
  storage: IStorage,
  action: any,
  data: { clientId: string; eventType: string }
): Promise<TriggerExecutionResult> {
  const client = await storage.getClient(data.clientId);
  if (!client) throw new Error("Client not found");

  const dueDate = new Date();
  if (action.remindDays) {
    dueDate.setDate(dueDate.getDate() + action.remindDays);
  }

  const task = await storage.createTask({
    advisorId: client.advisorId,
    clientId: data.clientId,
    title: `Follow-up: ${data.eventType}`,
    description: `Client experienced ${data.eventType}. Follow up required.`,
    dueDate: dueDate.toISOString().split("T")[0],
    priority: "medium",
    category: "life_event_reminder",
    type: "trigger",
    status: "pending",
  });

  return {
    actionType: "create_reminder",
    status: "executed",
    resultMetadata: { taskId: task.id },
  };
}

async function flagReviewAction(
  storage: IStorage,
  data: { clientId: string; eventType: string; description: string }
): Promise<TriggerExecutionResult> {
  const client = await storage.getClient(data.clientId);
  if (!client) throw new Error("Client not found");

  const review = await storage.createComplianceReview({
    clientId: data.clientId,
    advisorId: client.advisorId,
    title: `Review required: ${data.eventType}`,
    advisorNotes: `Triggered by life event: ${data.description}`,
  });

  return {
    actionType: "flag_review",
    status: "executed",
    resultMetadata: { reviewId: review.id },
  };
}
