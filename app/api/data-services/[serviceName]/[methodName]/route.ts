import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { executeServiceCall, type ServiceName } from "@server/services/service-routing";
import { logger } from "@server/lib/logger";

export async function POST(
  request: Request, { params }: { params: Promise<{ serviceName: string; methodName: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  const { serviceName, methodName } = await params;
  const body = await request.json();
  const args: unknown[] = Array.isArray(body.args) ? body.args : [];
  try {
    const result = await executeServiceCall(serviceName as ServiceName, methodName, args);
    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error({ err }, "Data service call failed");
    return NextResponse.json({ error: "Service call failed" }, { status: 400 });
  }
}
