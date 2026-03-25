import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { isZoomEnabled, validateConnection } from "@server/integrations/zoom/client";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const enabled = isZoomEnabled();
    let authenticated = false;

    if (enabled) {
      authenticated = await validateConnection();
    }

    return NextResponse.json({ enabled, authenticated });
  } catch (err: any) {
    logger.error({ err }, "Zoom status error");
    return NextResponse.json({ error: "Failed to get Zoom status" }, { status: 500 });
  }
}
