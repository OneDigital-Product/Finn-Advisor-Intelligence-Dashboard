import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { reportTemplates } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@server/lib/logger";

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  sections: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { templateId } = await params;
    const advisorId = session.userId;
    const body = await request.json();
    const parsed = validateBody(updateTemplateSchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sections !== undefined) updateData.sections = data.sections;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
      .update(reportTemplates)
      .set(updateData)
      .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.advisorId, advisorId)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err: err }, "PATCH /api/report-templates/:templateId error");
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { templateId } = await params;
    const advisorId = session.userId;

    await db
      .update(reportTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.advisorId, advisorId)));

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error({ err: err }, "DELETE /api/report-templates/:templateId error");
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
