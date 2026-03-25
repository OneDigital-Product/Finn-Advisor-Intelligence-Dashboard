import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { fiduciaryEngine } from "@server/engines/fiduciary-compliance";
import type { RuleSeverity } from "@server/engines/fiduciary-compliance";

const updateRuleSchema = z.object({
  ruleId: z.string().min(1),
  enabled: z.boolean().optional(),
  severity: z.enum(["warning", "block"]).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const rules = fiduciaryEngine.getAvailableRules();
    const config = fiduciaryEngine.getConfig();
    return NextResponse.json({ rules, config });
  } catch (error: any) {
    logger.error({ err: error }, "Error fetching rules");
    return NextResponse.json({ message: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = updateRuleSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const advisor = await getSessionAdvisor(auth.session);
    const success = fiduciaryEngine.updateRuleConfig(body.ruleId, {
      enabled: body.enabled,
      severity: body.severity as RuleSeverity | undefined,
    });

    if (!success) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    const config = fiduciaryEngine.getConfig();
    await storage.upsertFiduciaryRuleConfig({
      advisorId: null,
      globalEnabled: config.globalEnabled,
      blockThreshold: config.blockThreshold,
      ruleOverrides: config.rules as any,
      updatedBy: advisor?.id || null,
    });

    return NextResponse.json({ rules: fiduciaryEngine.getAvailableRules(), config });
  } catch (error: any) {
    logger.error({ err: error }, "Error updating rule");
    return NextResponse.json({ message: "Failed to update rule" }, { status: 500 });
  }
}
