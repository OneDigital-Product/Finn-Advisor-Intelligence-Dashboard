import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";
import type { InsertApiKeyMetadata } from "@shared/schema";

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const keys = await storage.getAllApiKeyMetadata();
    return NextResponse.json(keys);
  } catch (err) {
    logger.error({ err }, "GET /api/admin/api-key-metadata error");
    return NextResponse.json({ message: "Failed to fetch API key metadata" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const schema = z.object({
      keyName: z.string().min(1),
      integration: z.string().min(1),
      lastRotatedAt: z.string().optional(),
      expiresAt: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    });
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const upsertData: Partial<InsertApiKeyMetadata> = {
      integration: parsed.data.integration,
    };
    if (parsed.data.lastRotatedAt) {
      upsertData.lastRotatedAt = new Date(parsed.data.lastRotatedAt);
    }
    if (parsed.data.expiresAt !== undefined) {
      upsertData.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    }
    if (parsed.data.notes !== undefined) {
      upsertData.notes = parsed.data.notes;
    }
    const result = await storage.upsertApiKeyMetadata(parsed.data.keyName, upsertData);
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "POST /api/admin/api-key-metadata error");
    return NextResponse.json({ message: "Failed to save API key metadata" }, { status: 500 });
  }
}
