import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateAggregatedRMD, type AggregatedRMDInput } from "@server/calculators/rmd-calculator";
import { logger } from "@server/lib/logger";

const aggregatedRmdBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  accounts: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["traditional_ira", "401k", "403b", "457b", "sep_ira", "simple_ira"]),
    balance: z.coerce.number().min(0),
  })).min(1),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(aggregatedRmdBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: AggregatedRMDInput = {
      accountHolderDOB: data.accountHolderDOB,
      taxYear: data.taxYear,
      accounts: data.accounts,
    };
    const results = calculateAggregatedRMD(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "rmd_aggregated",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { mortalityTableUsed: "IRS Uniform Lifetime Table III", aggregationRules: "IRA aggregated, employer plans separate" },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "rmd_aggregated", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/rmd/aggregated error");
    return NextResponse.json({ error: "Failed to calculate aggregated RMD" }, { status: 400 });
  }
}
