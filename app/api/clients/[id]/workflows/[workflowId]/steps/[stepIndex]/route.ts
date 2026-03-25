import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateStepSchema = z.object({
  completed: z.boolean().optional(),
  notes: z.string().optional(),
  response: z.any().optional(),
});

function getReachableCompletedSteps(steps: any[]): any[] {
  const hasIds = steps.some((s: any) => s.id);
  if (!hasIds) return steps;
  const incomingIds = new Set<string>();
  for (const st of steps) {
    for (const targetId of Object.values(st.connections || {})) {
      incomingIds.add(targetId as string);
    }
  }
  const roots = steps.filter((s: any) => !incomingIds.has(s.id));
  if (roots.length === 0) return steps;
  const reachable: any[] = [];
  const visited = new Set<string>();
  const queue = roots.map((r: any) => r.id);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const step = steps.find((s: any) => s.id === id);
    if (!step) continue;
    reachable.push(step);
    if (step.completed && step.connections) {
      if (step.outputType === "choice" && step.response) {
        const nextId = step.connections[step.response];
        if (nextId) queue.push(nextId);
      } else {
        const nextId = step.connections["next"];
        if (nextId) queue.push(nextId);
      }
    }
  }
  return reachable;
}

async function sendWorkflowNotifications(
  clientId: string,
  workflowName: string,
  action: string,
  updatedBy: string,
): Promise<{ notifiedNames: string[]; notifiedEmails: string[] }> {
  const members = await storage.getClientTeamMembers(clientId);
  const client = await storage.getClient(clientId);
  const clientName = client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  const advisor = client ? await storage.getAdvisor(client.advisorId) : null;

  const recipients: { name: string; email: string }[] = [];

  for (const member of members) {
    recipients.push({ name: member.associate.name, email: member.associate.email });
  }

  if (advisor) {
    const isAdvisorUpdater = updatedBy === advisor.name;
    if (!isAdvisorUpdater) {
      recipients.push({ name: advisor.name, email: advisor.email });
    }
  }

  const filtered = recipients.filter(r => r.name !== updatedBy);

  for (const r of filtered) {
    console.info(`Email notification sent: to=${r.email}, workflow=${workflowName}, client=${clientName}, action=${action}, updatedBy=${updatedBy}`);
  }

  return {
    notifiedNames: filtered.map(r => r.name),
    notifiedEmails: filtered.map(r => r.email),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; workflowId: string; stepIndex: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const { id: clientId, workflowId, stepIndex: stepIndexStr } = await params;
    const workflow = await storage.getClientWorkflow(workflowId);
    if (!workflow || workflow.clientId !== clientId) {
      return NextResponse.json({ message: "Workflow not found" }, { status: 404 });
    }

    const stepIndex = parseInt(stepIndexStr);
    if (!Number.isFinite(stepIndex)) {
      return NextResponse.json({ message: "Invalid step index" }, { status: 400 });
    }

    const steps = (workflow.steps as any[]) || [];
    if (stepIndex < 0 || stepIndex >= steps.length) {
      return NextResponse.json({ message: "Invalid step index" }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateBody(updateStepSchema, body);
    if (validation.error) return validation.error;
    const data = validation.data;

    if (data.completed !== undefined) {
      steps[stepIndex].completed = data.completed;
      steps[stepIndex].completedAt = data.completed ? new Date().toISOString().split("T")[0] : null;
      if (!data.completed) {
        steps[stepIndex].response = null;
      }
    }
    if (data.notes !== undefined) {
      steps[stepIndex].notes = data.notes;
    }
    if (data.response !== undefined) {
      steps[stepIndex].response = data.response;
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

    const updated = await storage.updateClientWorkflow(workflowId, update);

    if (data.completed && steps[stepIndex].taskConfig?.createTask) {
      const taskConfig = steps[stepIndex].taskConfig;
      const stepTitle = steps[stepIndex].title || `Step ${stepIndex + 1}`;
      const dueDateOffset = taskConfig.dueDateOffset ?? 7;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDateOffset);

      const advisor = await getSessionAdvisor(session);
      if (advisor) {
        await storage.createTask({
          advisorId: advisor.id,
          clientId,
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
    const action = data.completed
      ? `Step completed: ${stepTitle}`
      : `Step unchecked: ${stepTitle}`;
    const notifications = await sendWorkflowNotifications(
      clientId, workflow.templateName, action, session.userName!
    );

    return NextResponse.json({ ...updated, notifiedNames: notifications.notifiedNames });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
