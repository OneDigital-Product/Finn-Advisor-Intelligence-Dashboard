import { storage } from "../../storage";
import { cassidyAuditLog, cassidyJobs } from "@shared/schema";
import { eq, and, gte, lte, inArray, asc, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";

export enum AuditEventType {
  REQUEST_SENT = "request_sent",
  ROUTING_DECISION = "routing_decision",
  AGENT_CALLED = "agent_called",
  AGENT_RESPONDED = "agent_responded",
  SYNTHESIS_COMPLETE = "synthesis_complete",
  CALLBACK_RECEIVED = "callback_received",
  RESULT_RENDERED = "result_rendered",
}

export class AuditLogger {
  static async logEvent(
    jobId: string,
    eventType: AuditEventType | string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      await storage.db.insert(cassidyAuditLog).values({
        jobId,
        eventType,
        eventData,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error({ err, eventType, jobId }, "Failed to log audit event");
    }
  }

  static async getJobAuditTrail(jobId: string) {
    return storage.db
      .select()
      .from(cassidyAuditLog)
      .where(eq(cassidyAuditLog.jobId, jobId))
      .orderBy(asc(cassidyAuditLog.timestamp));
  }

  static async getEventsByType(eventType: string, startDate: Date, endDate: Date) {
    return storage.db
      .select()
      .from(cassidyAuditLog)
      .where(
        and(
          eq(cassidyAuditLog.eventType, eventType),
          gte(cassidyAuditLog.timestamp, startDate),
          lte(cassidyAuditLog.timestamp, endDate)
        )
      )
      .orderBy(desc(cassidyAuditLog.timestamp));
  }

  static async searchAuditLogs(filters: {
    advisorId?: string;
    jobId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const conditions = [];

    if (filters.advisorId) {
      const advisorJobIds = await storage.db
        .select({ jobId: cassidyJobs.jobId })
        .from(cassidyJobs)
        .where(eq(cassidyJobs.advisorId, filters.advisorId));
      const jobIds = advisorJobIds.map((j) => j.jobId);
      if (jobIds.length === 0) return [];
      conditions.push(inArray(cassidyAuditLog.jobId, jobIds));
    }
    if (filters.jobId) {
      conditions.push(eq(cassidyAuditLog.jobId, filters.jobId));
    }
    if (filters.eventType) {
      conditions.push(eq(cassidyAuditLog.eventType, filters.eventType));
    }
    if (filters.startDate) {
      conditions.push(gte(cassidyAuditLog.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(cassidyAuditLog.timestamp, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return storage.db
      .select()
      .from(cassidyAuditLog)
      .where(whereClause)
      .limit(Math.min(filters.limit || 100, 1000))
      .orderBy(desc(cassidyAuditLog.timestamp));
  }

  static async getStats(startDate: Date, endDate: Date) {
    const events = await storage.db
      .select()
      .from(cassidyAuditLog)
      .where(
        and(
          gte(cassidyAuditLog.timestamp, startDate),
          lte(cassidyAuditLog.timestamp, endDate)
        )
      );

    const byType: Record<string, number> = {};
    events.forEach((e) => {
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    });

    let totalTime = 0;
    let count = 0;
    const uniqueJobs = new Set(events.map((e) => e.jobId));
    for (const jobId of uniqueJobs) {
      const jobEvents = events.filter((e) => e.jobId === jobId);
      const requestSent = jobEvents.find((e) => e.eventType === "request_sent")?.timestamp;
      const callbackReceived = jobEvents.find((e) => e.eventType === "callback_received")?.timestamp;
      if (requestSent && callbackReceived) {
        totalTime += callbackReceived.getTime() - requestSent.getTime();
        count++;
      }
    }

    return {
      totalEvents: events.length,
      eventsByType: byType,
      averageProcessingTime: count > 0 ? totalTime / count : 0,
    };
  }
}
