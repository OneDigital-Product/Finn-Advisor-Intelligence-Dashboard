import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  steps: z.array(z.any()).optional(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const templates = await storage.getWorkflowTemplates(advisor.id);
    return NextResponse.json(templates);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (session.userType !== "advisor") return NextResponse.json({ message: "Advisor access required" }, { status: 403 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const body = await request.json();
    const validation = validateBody(createTemplateSchema, body);
    if (validation.error) return validation.error;
    const data = validation.data;

    const template = await storage.createWorkflowTemplate({
      advisorId: advisor.id,
      name: data.name,
      description: data.description || null,
      category: data.category || "general",
      steps: data.steps || [],
    });
    return NextResponse.json(template);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
