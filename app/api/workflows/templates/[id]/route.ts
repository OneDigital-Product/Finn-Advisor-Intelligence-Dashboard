import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  steps: z.array(z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const template = await storage.getWorkflowTemplate(id);
    if (!template) return NextResponse.json({ message: "Template not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request, { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (session.userType !== "advisor") return NextResponse.json({ message: "Advisor access required" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(updateTemplateSchema, body);
    if (validation.error) return validation.error;

    const template = await storage.updateWorkflowTemplate(id, validation.data);
    if (!template) return NextResponse.json({ message: "Template not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request, { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (session.userType !== "advisor") return NextResponse.json({ message: "Advisor access required" }, { status: 403 });

  try {
    const { id } = await params;
    await storage.deleteWorkflowTemplate(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
