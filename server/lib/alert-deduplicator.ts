import { db } from "../db";
import { alerts, type InsertAlert } from "@shared/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export class AlertDeduplicator {
  private severityScore(severity: string): number {
    return { info: 1, warning: 2, critical: 3 }[severity] || 0;
  }

  async deduplicate(newAlerts: InsertAlert[]): Promise<InsertAlert[]> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result: InsertAlert[] = [];
    const seen = new Map<string, number>();

    for (const newAlert of newAlerts) {
      const key = `${newAlert.clientId ?? ""}|${newAlert.alertType}`;
      const newScore = this.severityScore(newAlert.severity!);

      const existingBatchScore = seen.get(key);
      if (existingBatchScore !== undefined && existingBatchScore >= newScore) {
        continue;
      }

      const conditions = [
        eq(alerts.alertType, newAlert.alertType || ""),
        gte(alerts.createdAt, cutoff),
      ];

      if (newAlert.clientId) {
        conditions.push(eq(alerts.clientId, newAlert.clientId));
      }

      const [existing] = await db
        .select({ severity: alerts.severity })
        .from(alerts)
        .where(and(...conditions))
        .orderBy(sql`CASE ${alerts.severity} WHEN 'critical' THEN 3 WHEN 'warning' THEN 2 ELSE 1 END DESC`)
        .limit(1);

      if (existing && this.severityScore(existing.severity) >= newScore) {
        continue;
      }

      if (existingBatchScore !== undefined) {
        const idx = result.findIndex(
          (r) => `${r.clientId}|${r.alertType}` === key
        );
        if (idx >= 0) result.splice(idx, 1);
      }

      seen.set(key, newScore);
      result.push(newAlert);
    }

    return result;
  }
}
