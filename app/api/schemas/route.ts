import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";
import type { InvestorProfileQuestionSchema } from "@shared/schema";

const createSchemaBodySchema = z.object({
  name: z.string().min(1, "name is required"),
  profileType: z.string().min(1, "profileType is required"),
  questions: z.array(z.unknown()).min(1, "questions must be a non-empty array"),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const profileType = url.searchParams.get("profileType");
    const active = url.searchParams.get("active");

    let schemas: InvestorProfileQuestionSchema[] = [];
    if (profileType) {
      schemas = active === "true"
        ? await storage.getActiveQuestionSchemas(profileType)
        : await storage.getAllQuestionSchemas(profileType);
    } else {
      schemas = await storage.getAllQuestionSchemas();
    }

    return NextResponse.json(
      schemas.map((s) => ({
        id: s.id,
        name: s.name,
        profileType: s.profileType,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        questionCount: Array.isArray(s.questions) ? (s.questions as any[]).length : 0,
      }))
    );
  } catch (err) {
    logger.error({ err }, "GET /api/schemas error");
    return NextResponse.json({ error: "Failed to fetch schemas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchemaBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const schema = await storage.createQuestionSchema({
      name: parsed.data.name,
      profileType: parsed.data.profileType,
      questions: parsed.data.questions,
      isActive: true,
    });

    return NextResponse.json(schema, { status: 201 });
  } catch (err) {
    logger.error({ err }, "POST /api/schemas error");
    return NextResponse.json({ error: "Failed to create schema" }, { status: 500 });
  }
}
