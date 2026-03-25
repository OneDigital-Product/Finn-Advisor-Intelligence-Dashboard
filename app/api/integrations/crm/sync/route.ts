import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { getActiveCRM } from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const crm = getActiveCRM();
    if (!crm.isEnabled()) {
      return NextResponse.json(
        { error: `${crm.name} CRM integration not enabled` },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const direction = url.searchParams.get("direction") || "outbound";
    const recordTypes = url.searchParams.getAll("recordTypes").length > 0
      ? url.searchParams.getAll("recordTypes")
      : ["Task", "Event"];

    const results: Record<string, any> = {};

    if (direction === "outbound") {
      if (recordTypes.includes("Task")) {
        results.tasks = await crm.batchSync("task");
      }
      if (recordTypes.includes("Event")) {
        results.meetings = await crm.batchSync("meeting");
      }
    } else if (direction === "inbound") {
      const advisor = await getSessionAdvisor(auth.session);
      if (!advisor) {
        return NextResponse.json({ error: "No advisor session" }, { status: 401 });
      }

      if (recordTypes.includes("Contact")) {
        results.contacts = await crm.syncContacts(advisor.id);
      }
      if (recordTypes.includes("Account")) {
        results.accounts = await crm.syncAccounts();
      }
    }

    return NextResponse.json({ success: true, provider: crm.name, direction, results });
  } catch (err: any) {
    logger.error({ err }, "CRM sync error");
    return NextResponse.json({ error: "CRM sync failed" }, { status: 500 });
  }
}
