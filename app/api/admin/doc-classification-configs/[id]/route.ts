import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const updateDocClassificationConfigSchema = z.object({
  name: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPromptTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateDocClassificationConfigSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    const updated = await storage.updateDocumentClassificationConfig(id, parsed.data);
    if (!updated) return NextResponse.json({ message: "Config not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    await storage.deleteDocumentClassificationConfig(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
