import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateSchema = z.object({
  custodian: z.string().min(1).max(200).optional(),
  actionType: z.string().min(1).max(200).optional(),
  formName: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  requiredFields: z.array(z.string()).optional(),
  requiredSignatures: z.array(z.string()).optional(),
  supportingDocuments: z.array(z.string()).optional(),
  instructions: z.string().max(10000).optional(),
  processingTime: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const instr = await storage.getCustodialInstruction(id);
    if (!instr) return NextResponse.json({ message: "Custodial instruction not found" }, { status: 404 });
    return NextResponse.json(instr);
  } catch (err) {
    logger.error({ err }, "Error fetching custodial instruction");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    const existing = await storage.getCustodialInstruction(id);
    if (!existing) return NextResponse.json({ message: "Custodial instruction not found" }, { status: 404 });
    const updated = await storage.updateCustodialInstruction(id, parsed.data);
    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, "Error updating custodial instruction");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
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
    const existing = await storage.getCustodialInstruction(id);
    if (!existing) return NextResponse.json({ message: "Custodial instruction not found" }, { status: 404 });
    await storage.deleteCustodialInstruction(id);
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    logger.error({ err }, "Error deleting custodial instruction");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
