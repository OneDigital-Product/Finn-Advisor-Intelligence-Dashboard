import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createSchema = z.object({
  custodian: z.string().min(1).max(200),
  actionType: z.string().min(1).max(200),
  formName: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  requiredFields: z.array(z.string()).optional(),
  requiredSignatures: z.array(z.string()).optional(),
  supportingDocuments: z.array(z.string()).optional(),
  instructions: z.string().max(10000).optional(),
  processingTime: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const custodian = url.searchParams.get("custodian") || undefined;
    const actionType = url.searchParams.get("actionType") || undefined;
    const instructions = await storage.getCustodialInstructions({ custodian, actionType });
    return NextResponse.json(instructions);
  } catch (err) {
    logger.error({ err }, "Error fetching custodial instructions");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    const instr = await storage.createCustodialInstruction(parsed.data);
    return NextResponse.json(instr, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Error creating custodial instruction");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
