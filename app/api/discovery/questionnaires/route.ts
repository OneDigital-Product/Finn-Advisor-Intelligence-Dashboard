import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createQuestionnaireSchema = z.object({
  name: z.string().min(1), clientType: z.string().min(1),
  sections: z.array(z.object({
    title: z.string(), description: z.string().optional(),
    questions: z.array(z.object({
      id: z.string(), label: z.string(),
      type: z.enum(["text", "textarea", "select", "multiselect", "number", "date", "boolean"]),
      options: z.array(z.string()).optional(), required: z.boolean().optional(),
      conditionalOn: z.object({ questionId: z.string(), value: z.string() }).optional(),
      placeholder: z.string().optional(),
    })),
  })),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const clientType = new URL(request.url).searchParams.get("clientType");
    let questionnaires;
    if (clientType) {
      questionnaires = await storage.getDiscoveryQuestionnairesByType(advisor.id, clientType);
    } else {
      questionnaires = await storage.getDiscoveryQuestionnaires(advisor.id);
    }
    return NextResponse.json(questionnaires);
  } catch (err) {
    logger.error({ err: err }, "GET /api/discovery/questionnaires error:");
    return NextResponse.json({ message: "Failed to fetch questionnaires" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const body = createQuestionnaireSchema.parse(await request.json());
    const questionnaire = await storage.createDiscoveryQuestionnaire({
      advisorId: advisor.id, name: body.name, clientType: body.clientType,
      sections: body.sections, isActive: body.isActive ?? true,
    });
    return NextResponse.json(questionnaire, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ message: err.errors[0].message }, { status: 400 });
    logger.error({ err: err }, "POST /api/discovery/questionnaires error:");
    return NextResponse.json({ message: "Failed to create questionnaire" }, { status: 500 });
  }
}
