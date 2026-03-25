import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateCrtSchema = z.object({
  trustName: z.string().optional(),
  currentValue: z.string().optional(),
  payoutRate: z.string().optional(),
  charitableBeneficiary: z.string().optional(),
  incomeBeneficiary: z.string().optional(),
  projectedAnnualIncome: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const raw = await request.json();
    const parsed = updateCrtSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }

    const existing = await storage.getCrt(id);
    if (!existing) return NextResponse.json({ message: "CRT not found" }, { status: 404 });

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(existing.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const result = await storage.updateCrt(id, parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await storage.getCrt(id);
    if (!existing) return NextResponse.json({ message: "CRT not found" }, { status: 404 });

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(existing.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    await storage.deleteCrt(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
