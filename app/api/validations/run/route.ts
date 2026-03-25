import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { z } from "zod";
import {
  runAllValidators,
  runModuleValidation,
  persistValidationResults,
} from "@server/engines/submission-validator";
import { logger } from "@server/lib/logger";

const schema = z.object({
  approvalItemId: z.string().optional(),
  entityType: z.string().min(1),
  entityId: z.string().optional(),
  clientId: z.string().optional(),
  accountId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  module: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { approvalItemId, entityType, entityId, clientId, accountId, payload, module } = parsed.data;
    const runBy = auth.session.userId || "system";

    const ctx = { entityType, entityId, payload, clientId: clientId || entityId, accountId };

    const summary = module
      ? await runModuleValidation(module, ctx)
      : await runAllValidators(ctx);

    if (approvalItemId) {
      await persistValidationResults(approvalItemId, summary, runBy, entityType, entityId);
    }

    return NextResponse.json({
      approvalItemId: approvalItemId || null,
      ...summary,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[Validation] Run error:");
    return NextResponse.json({ error: "Validation run failed" }, { status: 500 });
  }
}
