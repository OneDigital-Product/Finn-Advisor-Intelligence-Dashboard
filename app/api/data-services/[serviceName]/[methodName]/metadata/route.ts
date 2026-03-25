import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { getServiceMetadata, type ServiceName } from "@server/services/service-routing";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request, { params }: { params: Promise<{ serviceName: string; methodName: string }> }
) {
  try {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  const { serviceName, methodName } = await params;
  const metadata = getServiceMetadata(serviceName as ServiceName, methodName);
  return NextResponse.json(metadata);
} catch (err) {
    logger.error({ err }, "[data-services/[serviceName]/[methodName]/metadata] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
