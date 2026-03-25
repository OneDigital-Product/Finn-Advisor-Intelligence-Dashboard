import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, advisors, clients } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import {
  storage, logger, AuditLogger, getEventLabel, formatEventDetail, getEventActor,
} from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const userType = auth.session.userType;
    if (userType !== "advisor") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { job_id } = await params;
    const advisorId = auth.session.userId;

    const job = await storage.db
      .select()
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId!)))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const advisor = await storage.db
      .select()
      .from(advisors)
      .where(eq(advisors.id, job[0].advisorId))
      .limit(1);

    let clientName = "Unknown";
    if (job[0].clientId) {
      const client = await storage.db
        .select()
        .from(clients)
        .where(eq(clients.id, job[0].clientId))
        .limit(1);
      if (client.length > 0) {
        clientName = `${client[0].firstName} ${client[0].lastName}`;
      }
    }

    const auditTrail = await AuditLogger.getJobAuditTrail(job_id);

    const timeline = auditTrail.map((event) => {
      const auditEvent = {
        eventType: event.eventType,
        eventData: event.eventData as Record<string, unknown>,
        timestamp: event.timestamp ?? undefined,
      };
      return {
        timestamp: event.timestamp,
        event: getEventLabel(event.eventType),
        detail: formatEventDetail(auditEvent),
        actor: getEventActor(event.eventType),
        data: event.eventData,
      };
    });

    return NextResponse.json({
      job_id,
      advisor_name: advisor[0]?.name || "Unknown",
      client_name: clientName,
      task_type: job[0].taskType,
      status: job[0].status,
      created_at: job[0].createdAt,
      completed_at: job[0].completedAt,
      timeline,
      raw_events: auditTrail,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching audit trail");
    return NextResponse.json({ error: "Failed to fetch audit trail" }, { status: 500 });
  }
}
