import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { validationRules } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  severity: z.enum(["error", "warn", "info"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  label: z.string().optional(),
  description: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(validationRules)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(validationRules.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Validation rule not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error({ err: err }, "[Validation] PATCH rule error:");
    return NextResponse.json({ error: "Failed to update validation rule" }, { status: 500 });
  }
}
