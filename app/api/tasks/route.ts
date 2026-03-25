import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor, isSalesforceUser } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { insertTaskSchema } from "@shared/schema";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import { logger } from "@server/lib/logger";
import { batchResolveClientIdentities, getNavigationalId } from "@server/lib/client-identity";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { createTask as sfCreateTask } from "@server/integrations/salesforce/queries";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const allTasks = await storage.getTasks(advisor.id);

    // Batch-resolve client identities for all tasks
    const clientIds = allTasks.map((t) => t.clientId).filter(Boolean) as string[];
    const identityMap = await batchResolveClientIdentities(clientIds, session.userEmail);

    const tasksWithClients = await Promise.all(
      allTasks.map(async (task) => {
        if (!task.clientId) return { ...task, clientName: null, resolvedClientId: null };
        const client = await storage.getClient(task.clientId);
        const identity = identityMap.get(task.clientId);
        return {
          ...task,
          clientName: client ? `${client.firstName} ${client.lastName}` : null,
          resolvedClientId: identity ? getNavigationalId(identity) : null,
        };
      })
    );
    return NextResponse.json(tasksWithClients);
  } catch (err) {
    logger.error({ err: err }, "[Tasks] list fetch failed");
    return NextResponse.json({ message: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const createTaskSchema = insertTaskSchema.omit({ advisorId: true });
    const body = await request.json();
    const validation = validateBody(createTaskSchema, body);
    if (validation.error) return validation.error;
    const data = validation.data;

    if (data.salesforceTaskId !== undefined && data.salesforceTaskId !== null && !isValidSalesforceId(data.salesforceTaskId)) {
      return NextResponse.json({ message: "Invalid Salesforce Task ID format" }, { status: 400 });
    }

    const task = await storage.createTask({ ...data, advisorId: advisor.id });

    // Also push to Salesforce if connected (fire-and-forget)
    let sfTaskId: string | null = null;
    if (isSalesforceEnabled() && isSalesforceUser(advisor.email)) {
      try {
        const sfResult = await sfCreateTask({
          Subject: data.title || "Task",
          Status: data.status === "completed" ? "Completed" : "Not Started",
          Priority: data.priority === "high" ? "High" : data.priority === "low" ? "Low" : "Normal",
          ActivityDate: data.dueDate || undefined,
          Description: data.description || undefined,
        });
        if (sfResult?.success) {
          sfTaskId = sfResult.id || null;
          logger.info({ taskId: task.id, sfTaskId }, "[Tasks] Synced task to Salesforce");
        }
      } catch (err) {
        logger.warn({ err, taskId: task.id }, "[Tasks] SF task sync failed — task saved locally");
      }
    }

    return NextResponse.json({ ...task, sfTaskId });
  } catch (err) {
    logger.error({ err: err }, "[Tasks] create failed");
    return NextResponse.json({ message: "Failed to create task" }, { status: 500 });
  }
}
