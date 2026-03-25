import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const schema = z.object({
  custodian: z.string().min(1),
  actionType: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });

    const instructions = await storage.getCustodialInstructions({
      custodian: parsed.data.custodian,
      actionType: parsed.data.actionType,
    });

    if (instructions.length === 0) {
      return NextResponse.json({
        found: false,
        message: `No form requirements found for ${parsed.data.custodian} — ${parsed.data.actionType}`,
        requirements: null,
      });
    }

    const instr = instructions[0];
    return NextResponse.json({
      found: true,
      requirements: {
        custodian: instr.custodian, actionType: instr.actionType, formName: instr.formName,
        description: instr.description, requiredFields: instr.requiredFields,
        requiredSignatures: instr.requiredSignatures, supportingDocuments: instr.supportingDocuments,
        instructions: instr.instructions, processingTime: instr.processingTime, notes: instr.notes,
      },
    });
  } catch (err) {
    logger.error({ err }, "Error checking form requirements");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
