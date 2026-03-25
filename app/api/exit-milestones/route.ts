import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createMilestoneSchema = z.object({
  businessEntityId: z.string().optional(), clientId: z.string().optional(), advisorId: z.string().optional(),
  businessValuationId: z.string().optional().nullable(), title: z.string().min(1),
  description: z.string().nullable().optional(), category: z.string().min(1),
  targetDate: z.string().nullable().optional(), status: z.string().optional(),
  sortOrder: z.number().optional(), notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = createMilestoneSchema.parse(await request.json());
    const milestone = await storage.createExitPlanMilestone(body as any);
    return NextResponse.json(milestone);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
