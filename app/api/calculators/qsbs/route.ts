import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateQSBS, type QSBSInput } from "@server/calculators/qsbs-tracker-calculator";
import { logger } from "@server/lib/logger";

const qsbsBodySchema = z.object({
  positions: z.array(z.object({
    companyName: z.string().min(1),
    sharesOwned: z.coerce.number().min(0),
    costBasis: z.coerce.number().min(0),
    currentValue: z.coerce.number().min(0),
    acquisitionDate: z.string().min(1),
    isOriginalIssue: z.boolean(),
    companyGrossAssets: z.enum(["under_50m", "over_50m", "unknown"]),
    isCCorporation: z.boolean(),
    qualifiedTradeOrBusiness: z.boolean(),
  })),
  analysisDate: z.string().optional(),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(qsbsBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: QSBSInput = {
      positions: data.positions,
      analysisDate: data.analysisDate,
    };
    const results = calculateQSBS(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "qsbs",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { section1202ExclusionRate: 1.0, combinedCapGainsRate: 0.238 },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "qsbs", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/qsbs error");
    return NextResponse.json({ error: "Failed to calculate QSBS" }, { status: 400 });
  }
}
