import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { calculatorRuns } from "@shared/schema";
import { calculateAssetLocation, type AssetLocationInput } from "@server/calculators/asset-location-calculator";
import { logger } from "@server/lib/logger";

const assetLocationBodySchema = z.object({
  holdings: z.array(z.object({
    name: z.string(),
    ticker: z.string(),
    marketValue: z.coerce.number().min(0),
    assetClass: z.string(),
    currentAccountType: z.enum(["taxable", "traditional", "roth"]),
    expectedReturn: z.coerce.number(),
    dividendYield: z.coerce.number().min(0),
    turnoverRate: z.coerce.number().min(0).max(1),
    taxEfficiency: z.enum(["high", "medium", "low"]),
  })),
  taxableCapacity: z.coerce.number().min(0),
  traditionalCapacity: z.coerce.number().min(0),
  rothCapacity: z.coerce.number().min(0),
  marginalTaxRate: z.coerce.number().min(0).max(0.50),
  capitalGainsTaxRate: z.coerce.number().min(0).max(0.30),
  investmentHorizon: z.coerce.number().int().min(1).max(50),
  clientId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await request.json();
    const parsed = validateBody(assetLocationBodySchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advisorId = session.userId;

    const inputs: AssetLocationInput = {
      holdings: data.holdings,
      taxableCapacity: data.taxableCapacity,
      traditionalCapacity: data.traditionalCapacity,
      rothCapacity: data.rothCapacity,
      marginalTaxRate: data.marginalTaxRate,
      capitalGainsTaxRate: data.capitalGainsTaxRate,
      investmentHorizon: data.investmentHorizon,
    };
    const results = calculateAssetLocation(inputs);

    const [run] = await db
      .insert(calculatorRuns)
      .values({
        calculatorType: "asset_location",
        clientId: data.clientId || null,
        advisorId,
        inputs,
        results,
        assumptions: { marginalTaxRate: data.marginalTaxRate, capitalGainsTaxRate: data.capitalGainsTaxRate, investmentHorizon: data.investmentHorizon },
        createdBy: advisorId,
      })
      .returning();

    return NextResponse.json({ id: run.id, calculatorType: "asset_location", inputs, results, createdAt: run.createdAt }, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "POST /api/calculators/asset-location error");
    return NextResponse.json({ error: "Failed to calculate asset location" }, { status: 400 });
  }
}
