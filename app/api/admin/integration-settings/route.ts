import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import {
  getActiveCRMProvider,
  getActivePortfolioProvider,
  getAllCRMProviders,
  getAllPortfolioProviders,
  setActiveCRM,
  setActivePortfolio,
  type CRMProvider,
  type PortfolioProvider,
} from "@server/integrations/adapters";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    return NextResponse.json({
      activeCRM: getActiveCRMProvider(),
      activePortfolio: getActivePortfolioProvider(),
      crmProviders: getAllCRMProviders(),
      portfolioProviders: getAllPortfolioProviders(),
    });
  } catch (err: any) {
    logger.error({ err }, "Integration settings error");
    return NextResponse.json({ error: "Failed to get integration settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { activeCRM: newCRM, activePortfolio: newPortfolio } = await request.json();

    if (newCRM) {
      const validCRM = ["salesforce", "redtail"];
      if (!validCRM.includes(newCRM)) {
        return NextResponse.json(
          {
            error: `Invalid CRM provider: ${newCRM}. Valid options: ${validCRM.join(", ")}`,
          },
          { status: 400 }
        );
      }
      setActiveCRM(newCRM as CRMProvider);
    }

    if (newPortfolio) {
      const validPortfolio = ["orion", "blackdiamond"];
      if (!validPortfolio.includes(newPortfolio)) {
        return NextResponse.json(
          {
            error: `Invalid portfolio provider: ${newPortfolio}. Valid options: ${validPortfolio.join(", ")}`,
          },
          { status: 400 }
        );
      }
      setActivePortfolio(newPortfolio as PortfolioProvider);
    }

    return NextResponse.json({
      activeCRM: getActiveCRMProvider(),
      activePortfolio: getActivePortfolioProvider(),
      crmProviders: getAllCRMProviders(),
      portfolioProviders: getAllPortfolioProviders(),
    });
  } catch (err: any) {
    logger.error({ err }, "Integration settings update error");
    return NextResponse.json(
      { error: "Failed to update integration settings" },
      { status: 500 }
    );
  }
}
