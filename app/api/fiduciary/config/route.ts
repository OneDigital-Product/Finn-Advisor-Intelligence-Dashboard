import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { fiduciaryEngine } from "@server/engines/fiduciary-compliance";

const updateConfigSchema = z.object({
  globalEnabled: z.boolean().optional(),
  blockThreshold: z.number().int().min(1).optional(),
  ruleOverrides: z.array(z.object({
    id: z.string(),
    enabled: z.boolean(),
    severity: z.enum(["warning", "block"]),
  })).optional(),
});

export async function PUT(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = updateConfigSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const advisor = await getSessionAdvisor(auth.session);

    if (body.globalEnabled !== undefined) {
      fiduciaryEngine.setGlobalEnabled(body.globalEnabled);
    }
    if (body.blockThreshold !== undefined) {
      fiduciaryEngine.setBlockThreshold(body.blockThreshold);
    }
    if (body.ruleOverrides) {
      for (const override of body.ruleOverrides) {
        fiduciaryEngine.updateRuleConfig(override.id, {
          enabled: override.enabled,
          severity: override.severity,
        });
      }
    }

    const config = fiduciaryEngine.getConfig();
    await storage.upsertFiduciaryRuleConfig({
      advisorId: null,
      globalEnabled: config.globalEnabled,
      blockThreshold: config.blockThreshold,
      ruleOverrides: config.rules as any,
      updatedBy: advisor?.id || null,
    });

    return NextResponse.json({ config, rules: fiduciaryEngine.getAvailableRules() });
  } catch (error: any) {
    logger.error({ err: error }, "Error updating config");
    return NextResponse.json({ message: "Failed to update config" }, { status: 500 });
  }
}
