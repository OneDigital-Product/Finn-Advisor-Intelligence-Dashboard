import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const updateSchemaBodySchema = z.object({
  name: z.string().optional(),
  questions: z.array(z.unknown()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { schemaId } = await params;
    const schema = await storage.getQuestionSchema(schemaId);
    if (!schema) return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    return NextResponse.json(schema);
  } catch (err) {
    logger.error({ err }, "GET /api/schemas/:schemaId error");
    return NextResponse.json({ error: "Failed to fetch schema" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { schemaId } = await params;
    const body = await request.json();
    const parsed = updateSchemaBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const schema = await storage.updateQuestionSchema(schemaId, {
      name: parsed.data.name,
      questions: parsed.data.questions,
    });
    if (!schema) return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    return NextResponse.json(schema);
  } catch (err) {
    logger.error({ err }, "PUT /api/schemas/:schemaId error");
    return NextResponse.json({ error: "Failed to update schema" }, { status: 500 });
  }
}
