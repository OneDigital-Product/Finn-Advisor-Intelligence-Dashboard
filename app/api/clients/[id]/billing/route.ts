import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getBillingSummary,
  getBillingInstances,
} from "@server/integrations/mulesoft/api";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { getRevenueYTDByHousehold } from "@server/integrations/salesforce/queries";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import { logger } from "@server/lib/logger";

/**
 * GET /api/clients/[id]/billing — Billing/fee data for a client.
 *
 * Returns firm-level billing summary + client-specific billing instances.
 * Falls back to SF Revenue YTD when Orion billing is unavailable.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const clientId = params.id;
  const idError = validateId(clientId);
  if (idError) return NextResponse.json({ message: idError }, { status: 400 });

  try {
    // Try Orion billing via MuleSoft first
    if (isMulesoftEnabled()) {
      const [summary, instances] = await Promise.allSettled([
        getBillingSummary(),
        getBillingInstances(clientId),
      ]);

      const summaryData = summary.status === "fulfilled" ? summary.value : null;
      const instancesData = instances.status === "fulfilled" ? instances.value : [];

      if (summaryData) {
        return NextResponse.json({
          summary: summaryData,
          instances: instancesData,
          source: "orion",
        });
      }
    }

    // ── SF fallback: Revenue YTD for this household ──
    if (isSalesforceEnabled() && isValidSalesforceId(clientId)) {
      try {
        const sfRevenues = await getRevenueYTDByHousehold(clientId);
        if (sfRevenues.length > 0) {
          const totalRevenue = sfRevenues.reduce(
            (sum: number, r: any) => sum + (r.FinServ__Amount__c || 0),
            0
          );
          return NextResponse.json({
            summary: {
              totalFees: totalRevenue,
              revenueRecords: sfRevenues.length,
              source: "salesforce",
            },
            instances: sfRevenues.map((r: any) => ({
              id: r.Id,
              amount: r.FinServ__Amount__c || 0,
              date: r.FinServ__RevenueDate__c || null,
            })),
            source: "salesforce",
          });
        }
      } catch (err) {
        logger.warn({ err }, "[Billing] SF Revenue YTD fallback failed");
      }
    }

    return NextResponse.json({ summary: null, instances: [], source: "unavailable" });
  } catch (err) {
    logger.error({ err, clientId }, "[Billing] Failed to fetch billing data");
    return NextResponse.json({ summary: null, instances: [], source: "error" });
  }
}
