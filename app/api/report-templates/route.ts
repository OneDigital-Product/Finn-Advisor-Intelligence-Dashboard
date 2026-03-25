import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { reportTemplates } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "@server/lib/logger";

const createTemplateSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().nullable().optional(),
  templateType: z.string().min(1, "templateType is required"),
  sections: z.array(z.any()).min(1, "At least one section is required"),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;
    const url = new URL(request.url);
    const templateType = url.searchParams.get("templateType");

    let conditions = [eq(reportTemplates.advisorId, advisorId), eq(reportTemplates.isActive, true)];
    if (templateType) {
      conditions.push(eq(reportTemplates.templateType, templateType));
    }

    const templates = await db
      .select()
      .from(reportTemplates)
      .where(and(...conditions))
      .orderBy(desc(reportTemplates.createdAt));

    return NextResponse.json(templates);
  } catch (err) {
    logger.error({ err: err }, "GET /api/report-templates error");
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const advisorId = session.userId;
    const body = await request.json();
    const parsed = validateBody(createTemplateSchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const [template] = await db
      .insert(reportTemplates)
      .values({
        name: data.name,
        description: data.description || null,
        templateType: data.templateType,
        sections: data.sections,
        advisorId,
      })
      .returning();

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    logger.error({ err: err }, "POST /api/report-templates error");
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
