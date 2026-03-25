import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { nigoItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const updateNigoSchema = z.object({
  status: z.enum(["pending", "in_review", "resolved", "escalated"]).optional(),
  resolutionGuidance: z.string().optional(),
  rmdAmount: z.coerce.number().optional(),
  rmdYear: z.coerce.number().int().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const parsed = updateNigoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.status) {
      updates.status = parsed.data.status;
      if (parsed.data.status === "resolved") updates.resolvedAt = new Date();
    }
    if (parsed.data.resolutionGuidance !== undefined) updates.resolutionGuidance = parsed.data.resolutionGuidance;
    if (parsed.data.rmdAmount !== undefined) updates.rmdAmount = String(parsed.data.rmdAmount);
    if (parsed.data.rmdYear !== undefined) updates.rmdYear = parsed.data.rmdYear;

    const [updated] = await db
      .update(nigoItems)
      .set(updates)
      .where(eq(nigoItems.id, id))
      .returning();

    if (!updated) return NextResponse.json({ message: "NIGO item not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error({ err: err }, "[NIGO] PATCH error:");
    return NextResponse.json({ message: "Failed to update NIGO item" }, { status: 500 });
  }
}
