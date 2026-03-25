import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getBalanceSheet } from "@server/integrations/mulesoft/api";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { getAssetsAndLiabilities } from "@server/integrations/salesforce/queries";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";

/**
 * GET /api/clients/[id]/balance-sheet — Complete balance sheet from Orion.
 * Returns assets, liabilities, and net worth for a client.
 * Falls back to SF Assets & Liabilities when Orion/MuleSoft is unavailable.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId } = await params;

    // Try Orion balance sheet via MuleSoft first
    if (isMulesoftEnabled()) {
      const result = await getBalanceSheet(clientId);
      if (result) {
        return NextResponse.json({
          balanceSheet: result,
          source: "orion",
        });
      }
    }

    // ── SF fallback: Assets & Liabilities ──
    if (isSalesforceEnabled() && isValidSalesforceId(clientId)) {
      try {
        const sfAL = await getAssetsAndLiabilities(clientId);
        if (sfAL.length > 0) {
          const assets = sfAL
            .filter((a: any) => !["Liability", "Debt"].includes(a.FinServ__AssetsAndLiabilitiesType__c))
            .map((a: any) => ({
              name: a.Name,
              amount: a.FinServ__Amount__c || 0,
              type: a.FinServ__AssetsAndLiabilitiesType__c || "Other",
            }));
          const liabilities = sfAL
            .filter((a: any) => ["Liability", "Debt"].includes(a.FinServ__AssetsAndLiabilitiesType__c))
            .map((a: any) => ({
              name: a.Name,
              amount: a.FinServ__Amount__c || 0,
              type: a.FinServ__AssetsAndLiabilitiesType__c || "Other",
            }));
          const totalAssets = assets.reduce((s: number, a: any) => s + a.amount, 0);
          const totalLiabilities = liabilities.reduce((s: number, l: any) => s + l.amount, 0);

          return NextResponse.json({
            balanceSheet: {
              assets,
              liabilities,
              totalAssets,
              totalLiabilities,
              netWorth: totalAssets - totalLiabilities,
            },
            source: "salesforce",
          });
        }
      } catch (err) {
        logger.warn({ err }, "[Balance Sheet] SF Assets & Liabilities fallback failed");
      }
    }

    return NextResponse.json({ balanceSheet: null, source: "unavailable" });
  } catch (err) {
    logger.error({ err }, "[Balance Sheet] Error fetching balance sheet");
    return NextResponse.json({ balanceSheet: null, source: "error" });
  }
}
