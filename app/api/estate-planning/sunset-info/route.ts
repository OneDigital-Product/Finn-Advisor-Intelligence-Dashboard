import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";

const TCJA_SUNSET_DATE = new Date("2026-01-01");
const CURRENT_EXEMPTION_2024 = 13610000;
const POST_SUNSET_EXEMPTION = 7000000;
const ANNUAL_EXCLUSION_2024 = 18000;
const GST_EXEMPTION_2024 = 13610000;

export async function GET() {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const now = new Date();
  const daysToSunset = Math.max(0, Math.ceil((TCJA_SUNSET_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return NextResponse.json({
    sunsetDate: TCJA_SUNSET_DATE.toISOString().split("T")[0],
    daysRemaining: daysToSunset,
    currentExemption: CURRENT_EXEMPTION_2024,
    postSunsetExemption: POST_SUNSET_EXEMPTION,
    exemptionReduction: CURRENT_EXEMPTION_2024 - POST_SUNSET_EXEMPTION,
    annualExclusion: ANNUAL_EXCLUSION_2024,
    gstExemption: GST_EXEMPTION_2024,
  });
} catch (err) {
    logger.error({ err }, "[estate-planning/sunset-info] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
