import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const createTranscriptConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  analysisPrompt: z.string().min(1, "Analysis prompt is required"),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const configs = await storage.getTranscriptConfigs();
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
    const parsed = createTranscriptConfigSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    const config = await storage.createTranscriptConfig(parsed.data);
    return NextResponse.json(config);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
