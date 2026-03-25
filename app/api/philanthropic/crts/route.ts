import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createCrtSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  trustName: z.string(),
  crtType: z.string(),
  fundedValue: z.string().optional(),
  currentValue: z.string().optional(),
  payoutRate: z.string().optional(),
  termYears: z.number().optional(),
  charitableBeneficiary: z.string().optional(),
  incomeBeneficiary: z.string().optional(),
  projectedAnnualIncome: z.string().optional(),
  charitableDeduction: z.string().optional(),
  dateEstablished: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = createCrtSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const client = await storage.getClient(body.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    body.advisorId = advisor.id;
    const crt = await storage.createCrt(body);
    return NextResponse.json(crt);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
