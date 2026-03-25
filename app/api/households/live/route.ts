import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getHouseholds as getLiveHouseholds } from "@server/integrations/mulesoft/api";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    if (!isMulesoftEnabled()) {
      return NextResponse.json({ message: "MuleSoft integration not enabled" }, { status: 503 });
    }

    const url = new URL(request.url);
    const username = url.searchParams.get("username");
    if (!username) {
      return NextResponse.json({ message: "username query parameter is required" }, { status: 400 });
    }

    const result = await getLiveHouseholds({
      username,
      searchName: url.searchParams.get("searchName") || undefined,
      pageSize: url.searchParams.get("pageSize") ? parseInt(url.searchParams.get("pageSize") || "50", 10) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset") || "0", 10) : undefined,
    });

    if ((result as any)._error) {
      return NextResponse.json({ message: "Failed to fetch households from MuleSoft", error: (result as any)._error }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "[Households] Live household fetch failed");
    return NextResponse.json({ message: "An error occurred fetching live household data." }, { status: 500 });
  }
}
