import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createBusinessEntitySchema = z.object({
  clientId: z.string().min(1), name: z.string().min(1), entityType: z.string().min(1),
  industry: z.string().nullable().optional(), ownershipPercentage: z.string().nullable().optional(),
  estimatedValue: z.string().nullable().optional(), annualRevenue: z.string().nullable().optional(),
  annualEbitda: z.string().nullable().optional(), employeeCount: z.number().nullable().optional(),
  foundedDate: z.string().nullable().optional(), keyPeople: z.any().optional(),
  notes: z.string().nullable().optional(), status: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = createBusinessEntitySchema.parse(await request.json());
    const entity = await storage.createBusinessEntity(body as any);
    return NextResponse.json(entity);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
