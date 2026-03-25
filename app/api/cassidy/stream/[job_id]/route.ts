import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger, isUUID, jobEventBus } from "@server/routes/cassidy/shared";

export async function GET(
  _request: Request, { params }: { params: Promise<{ job_id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { job_id } = await params;
  const advisorId = auth.session.userId;

  if (!isUUID(job_id)) {
    return NextResponse.json({ error: "Invalid job_id format" }, { status: 400 });
  }

  try {
    const job = await storage.db
      .select()
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job[0].status === "completed") {
      const rp = job[0].responsePayload as Record<string, unknown> | null;
      const completedResponse: Record<string, unknown> = {
        type: "job_status_update",
        job_id,
        status: "completed",
        called_agent: rp?.called_agent,
        agent_trace: rp?.agent_trace,
        documents: rp?.documents || [],
        review_required: rp?.review_required ?? false,
        suggested_prompt_objects: rp?.suggested_prompt_objects || [],
        timestamp: job[0].completedAt?.toISOString(),
      };
      if (rp?.output) completedResponse.output = rp.output;
      if (rp?.fin_response !== undefined) {
        completedResponse.fin_response = rp.fin_response;
        completedResponse.fin_report = rp.fin_report;
        completedResponse.suggested_prompts = rp.suggested_prompts;
      }
      return NextResponse.json(completedResponse);
    }

    if (job[0].status === "failed" || job[0].status === "timed_out") {
      return NextResponse.json({
        type: "job_status_update",
        job_id,
        status: job[0].status,
        error: job[0].status === "timed_out"
          ? "Job timed out after 120 seconds"
          : "Job failed",
        timestamp: job[0].updatedAt?.toISOString(),
      });
    }

    // SSE stream for pending/in-progress jobs
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const unsubscribe = jobEventBus.subscribeToJob(job_id, (update: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
          } catch {
            // stream closed
          }

          if (["completed", "failed", "timed_out"].includes(update.status)) {
            setTimeout(() => {
              try {
                controller.close();
              } catch {}
            }, 1000);
          }
        });

        // Client timeout
        const clientTimeout = setTimeout(() => {
          unsubscribe();
          try {
            controller.close();
          } catch {}
        }, 150000);

        // Store cleanup references
        (controller as any)._cleanup = () => {
          unsubscribe();
          clearTimeout(clientTimeout);
        };
      },
      cancel() {
        // Client disconnected
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    logger.error({ err }, "SSE stream setup error");
    return NextResponse.json({ error: "Failed to setup stream" }, { status: 500 });
  }
}
