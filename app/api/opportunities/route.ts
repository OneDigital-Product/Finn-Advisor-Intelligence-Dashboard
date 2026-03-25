import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor, isSalesforceUser } from "@lib/auth-helpers";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { createOpportunity } from "@server/integrations/salesforce/queries";
import { logger } from "@server/lib/logger";

// ---------------------------------------------------------------------------
// POST /api/opportunities — Create a new Salesforce Opportunity
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    if (!isSalesforceEnabled() || !isSalesforceUser(advisor.email)) {
      return NextResponse.json(
        { message: "Salesforce integration not available for this account" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const { name, accountId, stageName, closeDate, amount } = body;
    if (!name || !stageName || !closeDate) {
      return NextResponse.json(
        { message: "Missing required fields: name, stageName, closeDate" },
        { status: 400 }
      );
    }

    // Build SF Opportunity fields
    const opportunityFields: Record<string, unknown> = {
      Name: name,
      StageName: stageName,
      CloseDate: closeDate,
    };

    // Optional fields
    if (accountId) opportunityFields.AccountId = accountId;
    if (amount != null) opportunityFields.Amount = Number(amount);
    if (body.probability != null) opportunityFields.Probability = Number(body.probability);
    if (body.type) opportunityFields.Type = body.type;
    if (body.description) opportunityFields.Description = body.description;

    const result = await createOpportunity(opportunityFields);

    if (!result || !result.success) {
      logger.warn({ result, fields: opportunityFields }, "[Opportunities] SF create failed");
      return NextResponse.json(
        { message: "Failed to create opportunity in Salesforce", errors: result?.errors },
        { status: 500 }
      );
    }

    logger.info({ sfRecordId: result.id, name }, "[Opportunities] Created SF opportunity");

    return NextResponse.json({
      success: true,
      id: result.id,
      message: `Opportunity "${name}" created successfully`,
    });
  } catch (error: any) {
    logger.error({ err: error }, "[Opportunities] POST error");
    return NextResponse.json(
      { message: "An error occurred creating the opportunity" },
      { status: 500 }
    );
  }
}
