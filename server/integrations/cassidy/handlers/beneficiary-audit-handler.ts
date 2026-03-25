import { storage } from "../../../storage";
import { tasks, alerts } from "../../../../shared/schema";
import crypto from "crypto";

export async function validate(signal: any, _advisorId: string) {
  if (!signal) {
    return { valid: false, error: "No signal payload provided" };
  }
  if (!signal.clientId) {
    return { valid: false, error: "Signal must include a clientId for beneficiary audit" };
  }
  return { valid: true };
}

export async function execute(signal: any, advisorId: string) {
  const taskId = crypto.randomUUID();
  const alertId = crypto.randomUUID();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const signalDescription = signal.description || "Beneficiary review needed";
  const signalSource = signal.sourceSnippet || "N/A";
  const isCritical = signal.materiality === "CRITICAL";

  await storage.db.transaction(async (tx) => {
    await tx.insert(tasks).values({
      id: taskId,
      clientId: signal.clientId,
      advisorId: advisorId,
      title: `Beneficiary Audit: ${signalDescription}`,
      description: `A beneficiary audit has been triggered based on a detected signal.\n\nSignal type: ${signal.signalType || "beneficiary_change"}\nSource: ${signalSource}\n\nPlease review the client's beneficiary designations and update as needed.`,
      priority: isCritical ? "high" : "medium",
      dueDate: dueDate.toISOString().split("T")[0],
      status: "pending",
      type: "beneficiary_audit",
    });

    await tx.insert(alerts).values({
      id: alertId,
      advisorId: advisorId,
      clientId: signal.clientId,
      type: "signal",
      severity: isCritical ? "warning" : "info",
      title: "Beneficiary Audit Required",
      message: `${signalDescription}. A task has been created to review and update beneficiary designations.`,
      alertType: signal.materiality || "INFO",
      isRead: false,
    });
  });

  return {
    success: true,
    action_taken: "run_beneficiary_audit",
    task_id: taskId,
    alert_id: alertId,
    message: "Beneficiary audit task and alert created. Check your tasks for next steps.",
  };
}
