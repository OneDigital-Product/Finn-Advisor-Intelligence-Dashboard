import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { mulesoftFetch } from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/debug/raw-endpoints
// Captures raw MuleSoft responses for field discovery.
// Gated behind requireAdvisor and only available in non-production environments.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  const session = auth.session;

  if (!isMulesoftEnabled()) {
    return NextResponse.json(
      { error: "MuleSoft integration is not enabled" },
      { status: 503 }
    );
  }

  const advisor = await storage.getAdvisor(session.userId);
  const userEmail = advisor?.email || "";
  if (!userEmail) {
    return NextResponse.json(
      { error: "No advisor email in session" },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const rawJson = async (path: string, options?: RequestInit): Promise<any> => {
    try {
      const response = await mulesoftFetch(path, options);
      return await response.json();
    } catch (err: any) {
      return { _error: err.message || String(err) };
    }
  };

  try {
    const [
      clientsValueRaw,
      clientAccountsRaw,
      clientAssetsRaw,
      householdRaw,
      householdMembersRaw,
      reportPerformanceRaw,
      reportAllocationRaw,
      reportPortfolioRaw,
      reportTaxRaw,
    ] = await Promise.all([
      rawJson("/api/v1/portfolio/clients/value"),
      rawJson("/api/v1/portfolio/clients/1066/accounts/value"),
      rawJson("/api/v1/portfolio/clients/1066/assets"),
      rawJson(
        `/api/v1/household?username=${encodeURIComponent(userEmail)}&pageSize=2`
      ),
      rawJson(
        `/api/v1/household/members?username=${encodeURIComponent(userEmail)}&householdId=0013x00002N0AIxAAN`
      ),

      // Performance (MTD + YTD TWR by Account)
      rawJson("/api/v1/reporting/scope", {
        method: "POST",
        body: JSON.stringify({
          entity: "Account",
          entityIds: [1066],
          asOfDate: today,
          managed: 16,
          calculations: [
            {
              id: "Accounts",
              $type: "grouping",
              grouping: "Account",
              calculations: [
                {
                  id: "MTD Performance",
                  $type: "performance",
                  contextChange: {
                    reportCategoryId: 1,
                    quickDate: "MTD",
                    performanceOption: {
                      $type: "performance",
                      calculationMethod: "TWR",
                      calcGrossOfFees: false,
                    },
                  },
                },
                {
                  id: "YTD Performance",
                  $type: "performance",
                  contextChange: {
                    reportCategoryId: 1,
                    quickDate: "YTD",
                    performanceOption: {
                      $type: "performance",
                      calculationMethod: "TWR",
                      calcGrossOfFees: false,
                    },
                  },
                },
              ],
            },
          ],
        }),
      }),

      // Allocation by Asset Class
      rawJson("/api/v1/reporting/scope", {
        method: "POST",
        body: JSON.stringify({
          entity: "Account",
          entityIds: [1066],
          asOfDate: today,
          calculations: [
            {
              $type: "grouping",
              grouping: "Asset Class",
              calculations: [
                {
                  id: "Allocation by Asset Class",
                  $type: "allocation",
                  contextChange: {
                    reportCategoryId: 4,
                  },
                },
              ],
            },
          ],
        }),
      }),

      // Portfolio Detail (Ending MV + Asset holdings + Est Annual Income)
      rawJson("/api/v1/reporting/scope", {
        method: "POST",
        body: JSON.stringify({
          entity: "Account",
          entityIds: [1066],
          asOfDate: today,
          managed: 16,
          calculations: [
            {
              id: "Account Ending MV",
              $type: "activity",
              contextChange: {
                reportCategoryId: 8,
                ActivityOption: {
                  $type: "market-value",
                  valuationMethod: "EndingMarketValue",
                  IncludeAccruedInterest: false,
                  inceptionValueMethod: "New Money",
                },
                dateRange: {
                  $type: "date-range",
                  startDate: today,
                  endDate: today,
                },
              },
            },
            {
              $type: "grouping",
              grouping: "Asset",
              calculations: [
                {
                  id: "Asset Name",
                  $type: "group-info",
                  entity: "Undefined",
                  property: "Name",
                },
                {
                  id: "Asset Ending MV",
                  $type: "activity",
                  contextChange: {
                    reportCategoryId: 8,
                    ActivityOption: {
                      $type: "market-value",
                      valuationMethod: "EndingMarketValue",
                      IncludeAccruedInterest: false,
                      inceptionValueMethod: "New Money",
                    },
                    dateRange: {
                      $type: "date-range",
                      startDate: today,
                      endDate: today,
                    },
                  },
                },
                {
                  id: "Estimated Annual Income",
                  $type: "estimated-annual-income",
                  contextChange: { reportCategoryId: 8 },
                },
              ],
            },
          ],
        }),
      }),

      // Tax Details (Aggregate + Short/Long Term + Lots)
      rawJson("/api/v1/reporting/scope", {
        method: "POST",
        body: JSON.stringify({
          entity: "Account",
          entityIds: [1066],
          asOfDate: today,
          managed: 16,
          calculations: [
            {
              $type: "grouping",
              grouping: "Account",
              calculations: [
                {
                  id: "Tax Detail - Aggregate",
                  $type: "cost-basis",
                  contextChange: {
                    reportCategoryId: 16,
                    dateRange: {
                      $type: "date-range",
                      startDate: yearStart,
                      endDate: today,
                    },
                  },
                },
                {
                  id: "Tax Detail - Short Term",
                  $type: "shortterm-cost-basis",
                  contextChange: {
                    reportCategoryId: 16,
                    dateRange: {
                      $type: "date-range",
                      startDate: yearStart,
                      endDate: today,
                    },
                  },
                },
                {
                  id: "Tax Detail - Long Term",
                  $type: "longterm-cost-basis",
                  contextChange: {
                    reportCategoryId: 16,
                    dateRange: {
                      $type: "date-range",
                      startDate: yearStart,
                      endDate: today,
                    },
                  },
                },
                {
                  id: "Tax Detail - Lots",
                  $type: "cost-basis-lots",
                  contextChange: {
                    reportCategoryId: 16,
                    dateRange: {
                      $type: "date-range",
                      startDate: yearStart,
                      endDate: today,
                    },
                  },
                },
              ],
            },
          ],
        }),
      }),
    ]);

    const trimArray = (data: any, max: number): any => {
      if (Array.isArray(data)) return data.slice(0, max);
      if (data && typeof data === "object") {
        for (const key of ["clients", "data", "accounts", "assets", "results"]) {
          if (Array.isArray(data[key])) {
            return {
              ...data,
              [key]: data[key].slice(0, max),
              _totalLength: data[key].length,
            };
          }
        }
      }
      return data;
    };

    return NextResponse.json({
      _meta: {
        generatedAt: new Date().toISOString(),
        note: "TEMPORARY DEBUG \u2014 raw MuleSoft responses for field discovery. Remove after use.",
        entityIds: [1066],
        asOfDate: today,
        yearStart,
      },
      clientsValue: trimArray(clientsValueRaw, 3),
      clientAccounts: clientAccountsRaw,
      clientAssets: trimArray(clientAssetsRaw, 3),
      household: householdRaw,
      householdMembers: householdMembersRaw,
      reportPerformance: reportPerformanceRaw,
      reportAllocation: reportAllocationRaw,
      reportPortfolio: reportPortfolioRaw,
      reportTax: reportTaxRaw,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[Debug] Raw endpoints fetch failed");
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
} catch (err) {
    logger.error({ err }, "[debug/raw-endpoints] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
