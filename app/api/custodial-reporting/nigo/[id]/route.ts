import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "escalated"]).optional(),
  resolutionNotes: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisorId = auth.session.userId;
    if (!advisorId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const existing = await storage.getNigoRecord(id);
    if (!existing) return NextResponse.json({ message: "NIGO record not found" }, { status: 404 });
    if (existing.advisorId !== advisorId) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const updates: any = { ...data };
    if (data.status === "resolved") {
      updates.resolvedDate = new Date().toISOString().split("T")[0];
    }

    const updated = await storage.updateNigoRecord(id, updates);
    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, "Error updating NIGO record");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
