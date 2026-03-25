import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const assignWorkflowSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
});

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const clientId = id;
    const workflows = await storage.getClientWorkflows(clientId);
    return NextResponse.json(workflows);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const clientId = id;
    const body = await request.json();
    const validation = validateBody(assignWorkflowSchema, body);
    if (validation.error) return validation.error;
    const data = validation.data;

    const template = await storage.getWorkflowTemplate(data.templateId);
    if (!template) return NextResponse.json({ message: "Template not found" }, { status: 404 });

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
      clientId,
      templateId: template.id,
      templateName: template.name,
      status: "active",
      steps: workflowSteps,
      startedAt: new Date().toISOString().split("T")[0],
      completedAt: null,
      assignedBy: advisor.name,
    });

    const notifications = await sendWorkflowNotifications(
      clientId, template.name, "Workflow applied", session.userName!
    );

    return NextResponse.json({ ...workflow, notifiedNames: notifications.notifiedNames });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
