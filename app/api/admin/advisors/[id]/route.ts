import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const feeScheduleTierSchema = z.object({
  minAum: z.number().min(0),
  maxAum: z.number().nullable(),
  rate: z.number().min(0).max(1),
});

const updateAdvisorSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().nullable().optional(),
  maxCapacity: z.number().int().min(1).optional(),
  feeSchedule: z.array(feeScheduleTierSchema).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const updated = await storage.updateAdvisor(id, parsed.data);
    if (!updated) return NextResponse.json({ message: "Advisor not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
