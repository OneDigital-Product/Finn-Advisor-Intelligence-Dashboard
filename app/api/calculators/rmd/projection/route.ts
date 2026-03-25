import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { projectRMD, type RMDProjectionInput } from "@server/calculators/rmd-calculator";
import { logger } from "@server/lib/logger";

const rmdProjectionBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  accountBalance: z.coerce.number().min(0),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  assumedGrowthRate: z.coerce.number().min(-1).max(1),
  projectionYears: z.coerce.number().int().min(1).max(50),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(rmdProjectionBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: RMDProjectionInput = {
      accountHolderDOB: data.accountHolderDOB,
      accountBalance: data.accountBalance,
      taxYear: data.taxYear,
      assumedGrowthRate: data.assumedGrowthRate,
      projectionYears: data.projectionYears,
    };
    const results = projectRMD(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "rmd_projection",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { mortalityTableUsed: "IRS Uniform Lifetime Table III" },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "rmd_projection", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/rmd/projection error");
    return NextResponse.json({ error: "Failed to project RMD" }, { status: 400 });
  }
}
