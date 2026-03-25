import { storage } from "../../../storage";
import { tasks } from "../../../../shared/schema";
import crypto from "crypto";

export async function validate(_signal: any, _advisorId: string) {
  return { valid: true };
}

export async function execute(signal: any, advisorId: string) {
  const taskId = crypto.randomUUID();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  await storage.db.insert(tasks).values({
    id: taskId,
    clientId: signal.clientId,
    advisorId: advisorId,
    title: `Follow up: ${signal.description}`,
    description: `Signal detected: ${signal.signalType}\nSource: ${signal.sourceSnippet || "N/A"}`,
    priority: signal.materiality === "CRITICAL" ? "high" : "medium",
    dueDate: dueDate.toISOString().split("T")[0],
    status: "pending",
    type: "signal_followup",
  });

  return {
    success: true,
    action_taken: "create_task",
    task_id: taskId,
    message: "Follow-up task created",
  };
}
