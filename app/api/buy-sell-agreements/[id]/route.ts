import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateBuySellSchema = z.object({
  agreementType: z.string().optional(), triggerEvents: z.any().optional(),
  fundingMechanism: z.string().nullable().optional(), fundingAmount: z.string().nullable().optional(),
  policyNumber: z.string().nullable().optional(), insuranceCarrier: z.string().nullable().optional(),
  effectiveDate: z.string().nullable().optional(), reviewDate: z.string().nullable().optional(),
  status: z.string().optional(), notes: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = updateBuySellSchema.parse(await request.json());
    const agreement = await storage.updateBuySellAgreement(id, body as any);
    if (!agreement) return NextResponse.json({ message: "Agreement not found" }, { status: 404 });
    return NextResponse.json(agreement);
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
    await storage.deleteBuySellAgreement(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
