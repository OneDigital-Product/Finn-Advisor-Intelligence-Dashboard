import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { getClient as getSalesforceClient, isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import { logger } from "@server/lib/logger";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const pending = await storage.getNextBestActions(advisor.id);
    const existing = pending.find(a => a.id === id);
    if (!existing) return NextResponse.json({ error: "Action not found or not authorized" }, { status: 404 });
    const action = await storage.completeNextBestAction(id);
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    if (isSalesforceEnabled()) {
      try {
        const conn = await getSalesforceClient();
        if (conn) {
          const client = await storage.getClient(action.clientId);
          if (client?.salesforceContactId && isValidSalesforceId(client.salesforceContactId)) {
            const sfTask = await conn.sobject("Task").create({
              WhoId: client.salesforceContactId, Subject: action.title, Description: action.description,
              Status: "Completed", Priority: action.priority > 80 ? "High" : "Normal",
              ActivityDate: new Date().toISOString().split("T")[0],
            });
            if (sfTask.success) {
              await storage.updateNextBestAction(action.id, { salesforceActivityId: sfTask.id });
            }
          }
        }
      } catch (sfErr) {
        logger.error({ err: sfErr }, "[Engagement] Salesforce sync failed for completed action:");
      }
    }
    return NextResponse.json(action);
  } catch (err: any) {
    logger.error({ err: err }, "[Engagement] Complete action error:");
    return NextResponse.json({ error: "Failed to complete action" }, { status: 500 });
  }
}
