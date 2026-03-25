import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { getActiveCRM, getActiveCRMProvider } from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const crm = getActiveCRM();
    const enabled = crm.isEnabled();
    let authenticated = false;
    if (enabled) {
      authenticated = await crm.validateConnection();
    }
    return NextResponse.json({
      provider: getActiveCRMProvider(),
      name: crm.name,
      enabled,
      authenticated,
    });
  } catch (err: any) {
    logger.error({ err }, "CRM status error");
    return NextResponse.json({ error: "Failed to get CRM status" }, { status: 500 });
  }
}
