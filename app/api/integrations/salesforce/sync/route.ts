import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { batchSync } from "@server/integrations/salesforce/sync";
import { syncContacts, syncAccounts } from "@server/integrations/salesforce/inbound";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    if (!isSalesforceEnabled()) {
      return NextResponse.json({ error: "Salesforce integration not enabled" }, { status: 400 });
    }

    const url = new URL(request.url);
    const direction = url.searchParams.get("direction") || "outbound";
    const recordTypes = url.searchParams.getAll("recordTypes").length > 0
      ? url.searchParams.getAll("recordTypes")
      : ["Task", "Event"];

    const results: Record<string, any> = {};

    if (direction === "outbound") {
      if (recordTypes.includes("Task")) {
        results.tasks = await batchSync("task");
      }
      if (recordTypes.includes("Event")) {
        results.meetings = await batchSync("meeting");
      }
    } else if (direction === "inbound") {
      const advisor = await getSessionAdvisor(auth.session);
      if (!advisor) {
        return NextResponse.json({ error: "No advisor session" }, { status: 401 });
      }

      if (recordTypes.includes("Contact")) {
        results.contacts = await syncContacts(advisor.id);
      }
      if (recordTypes.includes("Account")) {
        results.accounts = await syncAccounts();
      }
    }

    return NextResponse.json({ success: true, direction, results });
  } catch (err: any) {
    logger.error({ err }, "API error");
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
