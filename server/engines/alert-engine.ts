import { db } from "../db";
import { logger } from "../lib/logger";
import { alerts, type InsertAlert } from "@shared/schema";
import { and, sql, lt } from "drizzle-orm";
import { AlertDeduplicator } from "../lib/alert-deduplicator";
import { sseEventBus } from "../lib/sse-event-bus";
import { RmdGenerator } from "./generators/rmd-generator";
import { BirthdayGenerator } from "./generators/birthday-generator";
import { TransactionGenerator } from "./generators/transaction-generator";
import { RebalanceGenerator } from "./generators/rebalance-generator";
import { ContactCadenceGenerator } from "./generators/contact-cadence-generator";
import { ComplianceGenerator } from "./generators/compliance-generator";

export interface AlertGenerationResult {
  rmd: number;
  birthday: number;
  transaction: number;
  rebalance: number;
  contactCadence: number;
  compliance: number;
  deduplicated: number;
  inserted: number;
  duration_ms: number;
  errors: string[];
}

export type AlertType = "rmd" | "birthday" | "transaction" | "rebalance" | "contact_cadence" | "compliance";

export class AlertEngine {
  private deduplicator: AlertDeduplicator;

  constructor() {
    this.deduplicator = new AlertDeduplicator();
  }

  async run(advisorId: string, types?: AlertType[]): Promise<AlertGenerationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const counts: Record<string, number> = {
      rmd: 0, birthday: 0, transaction: 0,
      rebalance: 0, contactCadence: 0, compliance: 0,
    };

    const allAlerts: InsertAlert[] = [];
    const typesToRun = types || ["rmd", "birthday", "transaction", "rebalance", "contact_cadence", "compliance"];

    const generatorMap: Record<string, { gen: any; countKey: string }> = {
      rmd: { gen: new RmdGenerator(), countKey: "rmd" },
      birthday: { gen: new BirthdayGenerator(), countKey: "birthday" },
      transaction: { gen: new TransactionGenerator(), countKey: "transaction" },
      rebalance: { gen: new RebalanceGenerator(), countKey: "rebalance" },
      contact_cadence: { gen: new ContactCadenceGenerator(), countKey: "contactCadence" },
      compliance: { gen: new ComplianceGenerator(), countKey: "compliance" },
    };

    const promises = typesToRun.map(async (type) => {
      const entry = generatorMap[type];
      if (!entry) return;

      try {
        const generated = await entry.gen.generate(advisorId);
        counts[entry.countKey] = generated.length;
        allAlerts.push(...generated);
      } catch (err: any) {
        logger.error({ err, type }, "Alert generator failed");
        errors.push(`${type}: ${err.message}`);
      }
    });

    await Promise.all(promises);

    const dedupedAlerts = await this.deduplicator.deduplicate(allAlerts);
    const deduplicated = allAlerts.length - dedupedAlerts.length;

    let inserted = 0;
    if (dedupedAlerts.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < dedupedAlerts.length; i += BATCH_SIZE) {
        const batch = dedupedAlerts.slice(i, i + BATCH_SIZE);
        await db.insert(alerts).values(batch);
        inserted += batch.length;
      }
    }

    const duration_ms = Date.now() - startTime;
    logger.info({ inserted, deduplicated, duration_ms }, "AlertEngine complete");

    if (inserted > 0) {
      sseEventBus.publishToUser(advisorId, "alert:new", { inserted, duration_ms });
    }

    return {
      rmd: counts.rmd,
      birthday: counts.birthday,
      transaction: counts.transaction,
      rebalance: counts.rebalance,
      contactCadence: counts.contactCadence,
      compliance: counts.compliance,
      deduplicated,
      inserted,
      duration_ms,
      errors,
    };
  }

  async pruneDismissedAlerts(daysOld: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const deleted = await db
      .delete(alerts)
      .where(
        and(
          sql`${alerts.dismissedAt} IS NOT NULL`,
          lt(alerts.dismissedAt, cutoff)
        )
      );
    return (deleted as any).rowCount || 0;
  }
}
