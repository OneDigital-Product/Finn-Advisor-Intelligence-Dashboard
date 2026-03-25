import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { reportArtifacts } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateReportArtifact } from "@server/engines/report-service";
import { AuditLogger } from "@server/integrations/cassidy/audit-logger";
import { logger } from "@server/lib/logger";

const createReportSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
  reportName: z.string().min(1, "reportName is required"),
  clientId: z.string().nullable().optional(),
  householdId: z.string().nullable().optional(),
  visibleSections: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;
    const body = await request.json();
    const parsed = validateBody(createReportSchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const artifact = await generateReportArtifact(
      data.templateId,
      data.clientId || undefined,
      data.householdId || undefined,
      data.reportName,
      advisorId,
      data.visibleSections
    );

    await AuditLogger.logEvent(artifact.id, "report_created", {
      report_id: artifact.id,
      template_id: data.templateId,
      client_id: data.clientId || null,
      report_name: data.reportName,
      advisor_id: advisorId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(artifact, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/reports error");
    return NextResponse.json({ error: "Failed to generate report" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");
    const templateId = url.searchParams.get("templateId");
    const status = url.searchParams.get("status");

    let conditions = [eq(reportArtifacts.advisorId, advisorId)];
    if (clientId) conditions.push(eq(reportArtifacts.clientId, clientId));
    if (templateId) conditions.push(eq(reportArtifacts.templateId, templateId));
    if (status) conditions.push(eq(reportArtifacts.status, status));

    const artifacts = await db
      .select()
      .from(reportArtifacts)
      .where(and(...conditions))
      .orderBy(desc(reportArtifacts.createdAt));

    return NextResponse.json(artifacts);
  } catch (err) {
    logger.error({ err: err }, "GET /api/reports error");
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
