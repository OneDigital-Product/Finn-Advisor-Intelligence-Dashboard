import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getHouseholdMembers as getLiveHouseholdMembers } from "@server/integrations/mulesoft/api";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    if (!isMulesoftEnabled()) {
      return NextResponse.json({ message: "MuleSoft integration not enabled" }, { status: 503 });
    }

    const url = new URL(request.url);
    const username = url.searchParams.get("username");
    const householdId = url.searchParams.get("householdId");
    if (!username || !householdId) {
      return NextResponse.json({ message: "username and householdId query parameters are required" }, { status: 400 });
    }

    const result = await getLiveHouseholdMembers({
      username,
      householdId,
      searchName: url.searchParams.get("searchName") || undefined,
      pageSize: url.searchParams.get("pageSize") ? parseInt(url.searchParams.get("pageSize") || "50", 10) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset") || "0", 10) : undefined,
    });

    if ((result as any)._error) {
      return NextResponse.json({ message: "Failed to fetch household members from MuleSoft", error: (result as any)._error }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "[Households] Live household members fetch failed");
    return NextResponse.json({ message: "An error occurred fetching live household members." }, { status: 500 });
  }
}
