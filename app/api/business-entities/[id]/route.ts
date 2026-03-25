import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateBusinessEntitySchema = z.object({
  name: z.string().optional(), entityType: z.string().optional(), industry: z.string().nullable().optional(),
  ownershipPercentage: z.string().nullable().optional(), estimatedValue: z.string().nullable().optional(),
  annualRevenue: z.string().nullable().optional(), annualEbitda: z.string().nullable().optional(),
  employeeCount: z.number().nullable().optional(), foundedDate: z.string().nullable().optional(),
  keyPeople: z.any().optional(), notes: z.string().nullable().optional(), status: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = updateBusinessEntitySchema.parse(await request.json());
    const entity = await storage.updateBusinessEntity(id, body as any);
    if (!entity) return NextResponse.json({ message: "Entity not found" }, { status: 404 });
    return NextResponse.json(entity);
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
    await storage.deleteBusinessEntity(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
