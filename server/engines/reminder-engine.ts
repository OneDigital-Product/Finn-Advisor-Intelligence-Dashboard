import type { IStorage } from "../storage";
import type { InvestorProfile } from "@shared/schema";
import { logger } from "../lib/logger";
import { sseEventBus } from "../lib/sse-event-bus";
import { sendEmail, isEmailEnabled } from "../integrations/microsoft/email";

export interface ReminderCheckResult {
  createdTasks: number;
  skippedDuplicates: number;
  tasksWithErrors: number;
  emailsSent: number;
  emailsSkipped: number;
}

export interface PendingReminder {
  profileId: string;
  clientId: string;
  clientName: string;
  profileType: string;
  entityType: string | null;
  expirationDate: string;
  daysUntilExpiration: number;
  status: "expired" | "pending";
}

export async function checkAndCreateReminders(
  storage: IStorage,
  advisorId: string,
  days: number[] = [90, 60, 30],
  includeExpired: boolean = true
): Promise<ReminderCheckResult> {
  let createdTasks = 0;
  let skippedDuplicates = 0;
  let tasksWithErrors = 0;
  let emailsSent = 0;
  let emailsSkipped = 0;

  const clients = await storage.getClients(advisorId);
  const clientIds = new Set(clients.map((c) => c.id));

  const allProfiles = (await storage.getAllInvestorProfiles()).filter(
    (p) => clientIds.has(p.clientId)
  );
  const now = new Date();

  for (const profile of allProfiles) {
    if (!profile.expirationDate) continue;

    const expirationDate = new Date(profile.expirationDate);
    const daysLeft = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isExpired = daysLeft <= 0;
    const isUpcoming = !isExpired && days.some((d) => daysLeft <= d);

    if (isExpired && !includeExpired) continue;
    if (!isExpired && !isUpcoming) continue;

    const remindDays = isExpired ? 0 : days.filter((d) => daysLeft <= d).sort((a, b) => a - b)[0];

    try {
      const exists = await storage.getExistingReminder(profile.id, remindDays);
      if (exists) {
        skippedDuplicates++;
        continue;
      }

      const client = await storage.getClient(profile.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}` : "Unknown Client";

      const advisor = await storage.getAdvisorByEmail(profile.createdBy);
      const advisorId = advisor?.id || profile.createdBy;

      let title: string;
      let priority: string;

      if (isExpired) {
        title = `⚠️ URGENT: Profile Expired - ${clientName}`;
        priority = "high";
      } else if (remindDays <= 30) {
        title = `Re-profile due in ${daysLeft} days - ${clientName}`;
        priority = "medium";
      } else {
        title = `Re-profile reminder (${remindDays} days) - ${clientName}`;
        priority = "low";
      }

      const description = `Profile ${profile.id} for ${clientName} ${
        isExpired
          ? `expired on ${expirationDate.toISOString().split("T")[0]}`
          : `expires on ${expirationDate.toISOString().split("T")[0]}`
      }. Please review and re-profile. [remindDays:${remindDays}]`;

      await storage.createTask({
        advisorId,
        clientId: profile.clientId,
        title,
        description,
        dueDate: isExpired
          ? new Date().toISOString().split("T")[0]
          : expirationDate.toISOString().split("T")[0],
        priority,
        category: "profile_reminder",
        type: "reminder",
        status: "pending",
      });

      createdTasks++;

      const advisor2 = await storage.getAdvisorByEmail(profile.createdBy);
      const advisorEmail = advisor2?.email || profile.createdBy;
      if (advisorEmail && advisorEmail.includes("@")) {
        try {
          const emailResult = await sendEmail({
            to: advisorEmail,
            subject: title,
            htmlContent: `<p>${description.replace(/\n/g, "<br/>")}</p>`,
            plainText: description,
          });
          if (emailResult.success) {
            emailsSent++;
          } else {
            emailsSkipped++;
          }
        } catch (emailErr) {
          logger.error({ err: emailErr, profileId: profile.id }, "Failed to send reminder email notification");
          emailsSkipped++;
        }
      }
    } catch (err) {
      logger.error({ err, profileId: profile.id }, "Error creating reminder for profile");
      tasksWithErrors++;
    }
  }

  if (createdTasks > 0) {
    sseEventBus.publishToUser(advisorId, "reminder:created", { createdTasks });
  }

  return { createdTasks, skippedDuplicates, tasksWithErrors, emailsSent, emailsSkipped };
}

export async function getProfileReminders(
  storage: IStorage,
  advisorId: string
): Promise<PendingReminder[]> {
  const clients = await storage.getClients(advisorId);
  const clientIds = new Set(clients.map((c) => c.id));
  const allProfiles = (await storage.getAllInvestorProfiles()).filter(
    (p) => clientIds.has(p.clientId)
  );
  const now = new Date();
  const reminders: PendingReminder[] = [];

  for (const profile of allProfiles) {
    if (!profile.expirationDate) continue;

    const expirationDate = new Date(profile.expirationDate);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration > 90) continue;

    const client = await storage.getClient(profile.clientId);
    const clientName = client ? `${client.firstName} ${client.lastName}` : "Unknown Client";

    reminders.push({
      profileId: profile.id,
      clientId: profile.clientId,
      clientName,
      profileType: profile.profileType,
      entityType: profile.entityType ?? null,
      expirationDate: expirationDate.toISOString().split("T")[0],
      daysUntilExpiration,
      status: daysUntilExpiration <= 0 ? "expired" : "pending",
    });
  }

  return reminders.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
}
