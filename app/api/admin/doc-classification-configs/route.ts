import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const createDocClassificationConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  userPromptTemplate: z.string().min(1, "User prompt template is required"),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const configs = await storage.getDocumentClassificationConfigs();
    return NextResponse.json(configs);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const parsed = createDocClassificationConfigSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    const config = await storage.createDocumentClassificationConfig(parsed.data);
    return NextResponse.json(config);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
