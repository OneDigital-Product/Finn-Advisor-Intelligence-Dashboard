import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateMilestoneSchema = z.object({
  title: z.string().optional(), description: z.string().nullable().optional(), category: z.string().optional(),
  targetDate: z.string().nullable().optional(), status: z.string().optional(),
  completedDate: z.string().optional().nullable(), sortOrder: z.number().optional(), notes: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = updateMilestoneSchema.parse(await request.json());
    const milestone = await storage.updateExitPlanMilestone(id, body as any);
    if (!milestone) return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    return NextResponse.json(milestone);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    await storage.deleteExitPlanMilestone(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
