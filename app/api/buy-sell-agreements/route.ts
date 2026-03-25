import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createBuySellSchema = z.object({
  businessEntityId: z.string().optional(), clientId: z.string().optional(), advisorId: z.string().optional(),
  businessValuationId: z.string().optional().nullable(), agreementType: z.string().min(1),
  triggerEvents: z.any().optional(), fundingMechanism: z.string().nullable().optional(),
  fundingAmount: z.string().nullable().optional(), policyNumber: z.string().nullable().optional(),
  insuranceCarrier: z.string().nullable().optional(), effectiveDate: z.string().nullable().optional(),
  reviewDate: z.string().nullable().optional(), status: z.string().optional(), notes: z.string().nullable().optional(),
  fundingMethod: z.string().optional(), valuationFormula: z.string().optional(),
  insurancePolicyId: z.string().optional(), coverageAmount: z.string().optional(),
  expirationDate: z.string().optional(), parties: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = createBuySellSchema.parse(await request.json());
    const agreement = await storage.createBuySellAgreement(body as any);
    return NextResponse.json(agreement);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
