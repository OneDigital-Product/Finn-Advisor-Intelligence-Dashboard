import type { IStorage } from "../storage";
import { logger } from "../lib/logger";
import { sendEmail, isEmailEnabled } from "../integrations/microsoft/email";
import { db } from "../db";
import { clientWorkflows, clients, documentChecklist } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

export const ONBOARDING_MILESTONES = [
  { day: 1, label: "Day 1 — Welcome", deliverables: ["Welcome email sent", "Introduce advisor team", "Confirm communication preferences"], category: "welcome" },
  { day: 7, label: "Day 7 — Foundation", deliverables: ["KYC documents collected", "Risk assessment completed", "Initial discovery meeting held"], category: "foundation" },
  { day: 14, label: "Day 14 — Account Setup", deliverables: ["Custodial accounts opened", "Asset transfers initiated", "Beneficiary designations confirmed"], category: "setup" },
  { day: 30, label: "Day 30 — Planning", deliverables: ["Financial plan draft delivered", "Investment policy statement signed", "Insurance review completed"], category: "planning" },
  { day: 60, label: "Day 60 — Implementation", deliverables: ["Portfolio fully invested", "Automatic contributions configured", "Estate plan review scheduled"], category: "implementation" },
  { day: 90, label: "Day 90 — First Review", deliverables: ["90-day performance review", "Plan vs actuals comparison", "Adjust allocations if needed"], category: "review" },
  { day: 100, label: "Day 100 — Graduation", deliverables: ["Transition to regular service cadence", "Set next annual review date", "Client satisfaction check-in"], category: "graduation" },
];

export const FIRST_100_DAYS_TEMPLATE = {
  name: "First 100 Days",
  description: "Structured 100-day onboarding program with milestone tracking, automated check-ins, and paperwork management for new clients.",
  category: "onboarding",
  steps: ONBOARDING_MILESTONES.map((m, i) => ({
    stepNumber: i + 1,
    title: m.label,
    description: m.deliverables.join("; "),
    outputType: "checklist",
    milestoneDay: m.day,
    milestoneCategory: m.category,
    deliverables: m.deliverables,
  })),
};

export interface OnboardingStatus {
  workflowId: string;
  clientId: string;
  clientName: string;
  startDate: string;
  currentDay: number;
  progressPercent: number;
  currentMilestone: string;
  nextMilestone: string | null;
  completedMilestones: number;
  totalMilestones: number;
  overdueItems: string[];
  paperwork: {
    total: number;
    received: number;
    outstanding: string[];
  };
  status: "on_track" | "at_risk" | "behind" | "completed";
}

export function calculateOnboardingDay(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diffDays = Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export function getCurrentMilestoneIndex(day: number): number {
  for (let i = ONBOARDING_MILESTONES.length - 1; i >= 0; i--) {
    if (day >= ONBOARDING_MILESTONES[i].day) return i;
  }
  return 0;
}

export function getOnboardingStatus(
  currentDay: number,
  completedSteps: boolean[],
): "on_track" | "at_risk" | "behind" | "completed" {
  if (completedSteps.every(Boolean)) return "completed";

  const expectedIndex = getCurrentMilestoneIndex(currentDay);
  const completedCount = completedSteps.filter(Boolean).length;

  if (completedCount >= expectedIndex + 1) return "on_track";
  if (completedCount >= expectedIndex) return "at_risk";
  return "behind";
}

export async function getActiveOnboardings(
  storage: IStorage,
  advisorId: string,
): Promise<OnboardingStatus[]> {
  const advisorClients = await storage.getClients(advisorId);
  const clientIds = advisorClients.map(c => c.id);
  if (clientIds.length === 0) return [];

  const allWorkflows = await db
    .select()
    .from(clientWorkflows)
    .where(
      and(
        inArray(clientWorkflows.clientId, clientIds),
        eq(clientWorkflows.templateName, "First 100 Days"),
        eq(clientWorkflows.status, "active"),
      ),
    );

  const results: OnboardingStatus[] = [];

  for (const wf of allWorkflows) {
    const client = advisorClients.find(c => c.id === wf.clientId);
    if (!client) continue;

    const clientName = `${client.firstName} ${client.lastName}`;
    const steps = (wf.steps as any[]) || [];
    const startDate = wf.startedAt || new Date().toISOString().split("T")[0];
    const currentDay = calculateOnboardingDay(startDate);
    const completedSteps = steps.map((s: any) => !!s.completed);
    const completedCount = completedSteps.filter(Boolean).length;
    const progressPercent = Math.round((completedCount / steps.length) * 100);

    const milestoneIndex = getCurrentMilestoneIndex(currentDay);
    const currentMilestone = ONBOARDING_MILESTONES[milestoneIndex]?.label || "Day 1 — Welcome";
    const nextMilestoneObj = ONBOARDING_MILESTONES[milestoneIndex + 1];
    const nextMilestone = nextMilestoneObj ? nextMilestoneObj.label : null;

    const overdueItems: string[] = [];
    for (let i = 0; i <= milestoneIndex && i < steps.length; i++) {
      if (!steps[i].completed) {
        overdueItems.push(steps[i].title);
      }
    }

    const checklist = await storage.getDocumentChecklist(wf.clientId);
    const requiredDocs = checklist.filter(d => d.required);
    const receivedDocs = requiredDocs.filter(d => d.received);
    const outstandingDocs = requiredDocs.filter(d => !d.received).map(d => d.documentName);

    const status = wf.status === "completed"
      ? "completed" as const
      : getOnboardingStatus(currentDay, completedSteps);

    results.push({
      workflowId: wf.id,
      clientId: wf.clientId,
      clientName,
      startDate,
      currentDay: Math.min(currentDay, 100),
      progressPercent,
      currentMilestone,
      nextMilestone,
      completedMilestones: completedCount,
      totalMilestones: steps.length,
      overdueItems,
      paperwork: {
        total: requiredDocs.length,
        received: receivedDocs.length,
        outstanding: outstandingDocs,
      },
      status,
    });
  }

  return results.sort((a, b) => {
    const statusOrder = { behind: 0, at_risk: 1, on_track: 2, completed: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
}

export async function checkMilestoneProgression(
  storage: IStorage,
  advisorId: string,
): Promise<{ checked: number; emailsSent: number; transitioned: number }> {
  let checked = 0;
  let emailsSent = 0;
  let transitioned = 0;

  const onboardings = await getActiveOnboardings(storage, advisorId);

  for (const ob of onboardings) {
    checked++;

    const workflow = await storage.getClientWorkflow(ob.workflowId);
    if (!workflow) continue;

    const steps = (workflow.steps as any[]) || [];
    const currentDay = ob.currentDay;

    for (let i = 0; i < steps.length; i++) {
      const milestone = ONBOARDING_MILESTONES[i];
      if (!milestone) continue;

      if (currentDay >= milestone.day && !steps[i].notified) {
        steps[i].notified = true;
        steps[i].notifiedAt = new Date().toISOString().split("T")[0];

        const advisor = await storage.getAdvisor(advisorId);
        if (advisor?.email) {
          try {
            const statusLabel = ob.status === "behind" ? "BEHIND SCHEDULE" : ob.status === "at_risk" ? "AT RISK" : "ON TRACK";
            const result = await sendEmail({
              to: advisor.email,
              subject: `[First 100 Days] ${ob.clientName} — ${milestone.label}`,
              htmlContent: buildMilestoneEmail(ob, milestone, statusLabel),
              plainText: `${milestone.label} milestone reached for ${ob.clientName}. Status: ${statusLabel}. Day ${ob.currentDay}/100. Progress: ${ob.progressPercent}%.`,
            });
            if (result.success) emailsSent++;
          } catch (err) {
            logger.error({ err, clientId: ob.clientId }, "Failed to send milestone email");
          }
        }
      }
    }

    const allComplete = steps.every((s: any) => s.completed);
    if (allComplete) {
      await storage.updateClientWorkflow(ob.workflowId, {
        steps,
        status: "completed",
        completedAt: new Date().toISOString().split("T")[0],
      });
      transitioned++;

      try {
        await transitionToRegularCadence(storage, ob.clientId, advisorId, ob.clientName);
      } catch (err) {
        logger.error({ err, clientId: ob.clientId }, "Failed to transition to regular cadence");
      }

      const advisor = await storage.getAdvisor(advisorId);
      if (advisor?.email) {
        try {
          await sendEmail({
            to: advisor.email,
            subject: `[First 100 Days] ${ob.clientName} — Onboarding Complete!`,
            htmlContent: buildCompletionEmail(ob),
            plainText: `Congratulations! ${ob.clientName} has completed the First 100 Days onboarding program. They are now transitioning to regular service cadence.`,
          });
        } catch (err) {
          logger.error({ err, clientId: ob.clientId }, "Failed to send completion celebration email");
        }
      }
    } else {
      await storage.updateClientWorkflow(ob.workflowId, { steps });
    }
  }

  return { checked, emailsSent, transitioned };
}

function buildMilestoneEmail(
  ob: OnboardingStatus,
  milestone: typeof ONBOARDING_MILESTONES[number],
  statusLabel: string,
): string {
  const statusColor = statusLabel === "ON TRACK" ? "#22c55e" : statusLabel === "AT RISK" ? "#f59e0b" : "#ef4444";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; color: white; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0 0 4px; font-size: 18px;">First 100 Days Update</h2>
        <p style="margin: 0; opacity: 0.7; font-size: 13px;">${ob.clientName}</p>
      </div>
      <div style="background: white; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 16px; color: #1e293b;">${milestone.label}</h3>
          <span style="background: ${statusColor}20; color: ${statusColor}; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px;">${statusLabel}</span>
        </div>
        <div style="background: #f8fafc; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 12px; color: #64748b;">Progress</span>
            <span style="font-size: 12px; font-weight: 600; color: #1e293b;">Day ${ob.currentDay}/100</span>
          </div>
          <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="background: ${statusColor}; height: 100%; width: ${ob.progressPercent}%; border-radius: 4px;"></div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #94a3b8; margin-top: 4px;">${ob.progressPercent}% complete</div>
        </div>
        <h4 style="font-size: 13px; color: #475569; margin: 0 0 8px;">Deliverables for this milestone:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #64748b; line-height: 1.8;">
          ${milestone.deliverables.map(d => `<li>${d}</li>`).join("")}
        </ul>
        ${ob.overdueItems.length > 0 ? `
          <div style="margin-top: 16px; padding: 12px; background: #fef2f2; border-radius: 6px; border-left: 3px solid #ef4444;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #dc2626;">Overdue Milestones:</p>
            <p style="margin: 0; font-size: 11px; color: #991b1b;">${ob.overdueItems.join(", ")}</p>
          </div>
        ` : ""}
        ${ob.paperwork.outstanding.length > 0 ? `
          <div style="margin-top: 12px; padding: 12px; background: #fffbeb; border-radius: 6px; border-left: 3px solid #f59e0b;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #d97706;">Outstanding Paperwork (${ob.paperwork.outstanding.length}):</p>
            <p style="margin: 0; font-size: 11px; color: #92400e;">${ob.paperwork.outstanding.join(", ")}</p>
          </div>
        ` : ""}
      </div>
      <div style="background: #f8fafc; padding: 16px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">OneDigital Advisor Intelligence Suite</p>
      </div>
    </div>
  `;
}

function buildCompletionEmail(ob: OnboardingStatus): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #22c55e; color: white; padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0 0 4px; font-size: 22px;">Onboarding Complete!</h2>
        <p style="margin: 0; opacity: 0.9; font-size: 14px;">${ob.clientName}</p>
      </div>
      <div style="background: white; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="font-size: 14px; color: #1e293b; line-height: 1.6; margin: 0 0 16px;">
          Congratulations! <strong>${ob.clientName}</strong> has successfully completed all milestones in the First 100 Days onboarding program.
        </p>
        <div style="background: #f0fdf4; border-radius: 6px; padding: 16px; margin-bottom: 16px; border-left: 3px solid #22c55e;">
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #166534;">All ${ob.totalMilestones} milestones completed</p>
          <p style="margin: 0; font-size: 12px; color: #15803d;">Started: ${ob.startDate} &middot; Completed in ${ob.currentDay} days</p>
        </div>
        <h4 style="font-size: 13px; color: #475569; margin: 0 0 8px;">Next Steps:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #64748b; line-height: 1.8;">
          <li>Transition to regular service cadence</li>
          <li>Schedule first annual review</li>
          <li>Set up recurring check-in reminders</li>
        </ul>
      </div>
      <div style="background: #f8fafc; padding: 16px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">OneDigital Advisor Intelligence Suite</p>
      </div>
    </div>
  `;
}

export async function triggerWelcomeSequence(
  storage: IStorage,
  clientId: string,
  advisorId: string,
): Promise<void> {
  const client = await storage.getClient(clientId);
  if (!client) return;

  const advisor = await storage.getAdvisor(advisorId);
  const clientName = `${client.firstName} ${client.lastName}`;
  const advisorName = advisor?.name || "Your Advisor";
  const advisorEmail = advisor?.email;

  const welcomeTasks = [
    { title: `Send welcome email to ${clientName}`, dueOffset: 0, description: `Send personalized welcome email introducing the advisory team and outlining the First 100 Days program.` },
    { title: `Schedule discovery meeting with ${clientName}`, dueOffset: 3, description: `Schedule initial discovery meeting to understand goals, risk tolerance, and financial situation.` },
    { title: `Prepare welcome packet for ${clientName}`, dueOffset: 1, description: `Assemble welcome packet with firm overview, team bios, service agreement, and communication preferences form.` },
    { title: `Set up client portal access for ${clientName}`, dueOffset: 2, description: `Create client portal account and send credentials with onboarding guide.` },
  ];

  const today = new Date();
  for (const task of welcomeTasks) {
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + task.dueOffset);
    await storage.createTask({
      advisorId,
      clientId,
      title: task.title,
      description: task.description,
      type: "onboarding",
      dueDate: dueDate.toISOString().split("T")[0],
      priority: "high",
      status: "pending",
    });
  }

  if (advisorEmail) {
    try {
      await sendEmail({
        to: advisorEmail,
        subject: `[First 100 Days] Welcome sequence started for ${clientName}`,
        htmlContent: buildWelcomeSequenceEmail(clientName, advisorName),
        plainText: `The First 100 Days onboarding program has started for ${clientName}. Welcome tasks have been created in your action queue.`,
      });
    } catch (err) {
      logger.error({ err, clientId }, "Failed to send welcome sequence notification");
    }
  }
}

function buildWelcomeSequenceEmail(clientName: string, advisorName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; color: white; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0 0 4px; font-size: 18px;">First 100 Days — Welcome Sequence</h2>
        <p style="margin: 0; opacity: 0.7; font-size: 13px;">${clientName}</p>
      </div>
      <div style="background: white; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="font-size: 14px; color: #1e293b; line-height: 1.6; margin: 0 0 16px;">
          The onboarding program has started for <strong>${clientName}</strong>. The following welcome tasks have been automatically created:
        </p>
        <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 12px; color: #64748b; line-height: 2;">
          <li><strong>Today:</strong> Send welcome email to client</li>
          <li><strong>Day 1:</strong> Prepare welcome packet</li>
          <li><strong>Day 2:</strong> Set up client portal access</li>
          <li><strong>Day 3:</strong> Schedule discovery meeting</li>
        </ul>
        <p style="font-size: 12px; color: #64748b;">Check your Action Queue for these tasks. The milestone engine will track progress automatically.</p>
      </div>
      <div style="background: #f8fafc; padding: 16px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">OneDigital Advisor Intelligence Suite</p>
      </div>
    </div>
  `;
}

async function transitionToRegularCadence(
  storage: IStorage,
  clientId: string,
  advisorId: string,
  clientName: string,
): Promise<void> {
  const advisor = await storage.getAdvisor(advisorId);
  const advisorName = advisor?.name || "System";

  const templates = await storage.getWorkflowTemplates(advisorId);
  const annualReviewTemplate = templates.find(t => t.name === "Annual Review");

  if (annualReviewTemplate) {
    const existingWorkflows = await storage.getClientWorkflows(clientId);
    const hasActiveReview = existingWorkflows.some(
      w => w.templateName === "Annual Review" && w.status === "active",
    );

    if (!hasActiveReview) {
      const templateSteps = (annualReviewTemplate.steps as any[]) || [];
      await storage.createClientWorkflow({
        clientId,
        templateId: annualReviewTemplate.id,
        templateName: annualReviewTemplate.name,
        status: "active",
        steps: templateSteps.map((s: any) => ({
          id: `step_ar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          stepNumber: s.stepNumber,
          title: s.title,
          description: s.description || "",
          outputType: s.outputType || "none",
          completed: false,
          completedAt: null,
          notes: "",
          response: null,
        })),
        startedAt: new Date().toISOString().split("T")[0],
        completedAt: null,
        assignedBy: advisorName,
      });
    }
  }

  const reviewDate = new Date();
  reviewDate.setFullYear(reviewDate.getFullYear() + 1);
  await storage.createTask({
    advisorId,
    clientId,
    title: `Annual review — ${clientName}`,
    description: `Automatically scheduled after completing the First 100 Days onboarding. Client is now on regular service cadence.`,
    type: "review",
    dueDate: reviewDate.toISOString().split("T")[0],
    priority: "medium",
    status: "pending",
  });

  const quarterlyDate = new Date();
  quarterlyDate.setMonth(quarterlyDate.getMonth() + 3);
  await storage.createTask({
    advisorId,
    clientId,
    title: `Quarterly check-in — ${clientName}`,
    description: `First quarterly check-in after completing the onboarding program.`,
    type: "general",
    dueDate: quarterlyDate.toISOString().split("T")[0],
    priority: "medium",
    status: "pending",
  });
}

export async function createFirst100DaysWorkflow(
  storage: IStorage,
  clientId: string,
  advisorId: string,
  advisorName: string,
): Promise<any> {
  const templates = await storage.getWorkflowTemplates(advisorId);
  let template = templates.find(t => t.name === "First 100 Days");

  if (!template) {
    template = await storage.createWorkflowTemplate({
      advisorId,
      ...FIRST_100_DAYS_TEMPLATE,
    });
  }

  const existingWorkflows = await storage.getClientWorkflows(clientId);
  const existing = existingWorkflows.find(
    w => w.templateName === "First 100 Days" && w.status === "active",
  );
  if (existing) {
    return existing;
  }

  const steps = FIRST_100_DAYS_TEMPLATE.steps.map((s, i) => ({
    id: `step_100d_${Date.now()}_${i}`,
    stepNumber: s.stepNumber,
    title: s.title,
    description: s.description,
    outputType: s.outputType,
    milestoneDay: s.milestoneDay,
    milestoneCategory: s.milestoneCategory,
    deliverables: s.deliverables,
    completed: false,
    completedAt: null,
    notified: false,
    notifiedAt: null,
    notes: "",
    response: null,
  }));

  const workflow = await storage.createClientWorkflow({
    clientId,
    templateId: template.id,
    templateName: "First 100 Days",
    status: "active",
    steps,
    startedAt: new Date().toISOString().split("T")[0],
    completedAt: null,
    assignedBy: advisorName,
  });

  try {
    await triggerWelcomeSequence(storage, clientId, advisorId);
  } catch (err) {
    logger.error({ err, clientId }, "Failed to trigger welcome sequence");
  }

  return workflow;
}
