import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { getIndustryMultiples } from "@server/lib/valuation-engine";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const industries = [
      "technology", "healthcare", "manufacturing", "retail", "financial services",
      "real estate", "energy", "construction", "professional services", "hospitality",
      "transportation", "agriculture",
    ];
    const multiples = industries.map(i => ({ industry: i, ...getIndustryMultiples(i) }));
    return NextResponse.json(multiples);
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
