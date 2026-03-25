import { storage } from "../../../storage";
import { alerts } from "../../../../shared/schema";
import crypto from "crypto";

export async function validate(_signal: any, _advisorId: string) {
  return { valid: true };
}

export async function execute(signal: any, advisorId: string) {
  const alertId = crypto.randomUUID();

  await storage.db.insert(alerts).values({
    id: alertId,
    advisorId: advisorId,
    clientId: signal.clientId,
    type: "signal",
    severity: signal.materiality === "CRITICAL" ? "warning" : "info",
    title: `Signal: ${signal.signalType.replace(/_/g, " ")}`,
    message: signal.description,
    alertType: signal.materiality,
    isRead: false,
  });

  return {
    success: true,
    action_taken: "notify_advisor",
    alert_id: alertId,
    message: "Alert created and will appear in your dashboard",
  };
}
