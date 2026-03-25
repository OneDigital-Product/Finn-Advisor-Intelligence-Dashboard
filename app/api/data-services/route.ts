import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { listAvailableServices } from "@server/services/service-routing";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  const services = listAvailableServices();
  return NextResponse.json({ services });
} catch (err) {
    logger.error({ err }, "[data-services] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
