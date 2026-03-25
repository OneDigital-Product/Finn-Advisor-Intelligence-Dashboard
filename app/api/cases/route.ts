import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor, isSalesforceUser } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { createCase as sfCreateCase } from "@server/integrations/salesforce/queries";

/**
 * POST /api/cases — Create a Salesforce case.
 *
 * Used by compliance flags, AI recommendations, and manual case creation.
 * Requires SF to be enabled and the advisor to be a SF user.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const body = await request.json();
    const { subject, description, type, priority, accountId, contactId, origin } = body;

    if (!subject) {
      return NextResponse.json({ message: "Subject is required" }, { status: 400 });
    }

    if (!isSalesforceEnabled() || !isSalesforceUser(advisor.email)) {
      return NextResponse.json({ message: "Salesforce is not enabled for this advisor" }, { status: 400 });
    }

    const caseFields: Record<string, unknown> = {
      Subject: subject,
      Status: "New",
      Priority: priority || "Medium",
      Origin: origin || "Advisor Portal",
    };

    if (description) caseFields.Description = description;
    if (type) caseFields.Type = type;
    if (accountId) caseFields.AccountId = accountId;
    if (contactId) caseFields.ContactId = contactId;

    const result = await sfCreateCase(caseFields);

    if (result?.success) {
      logger.info({ caseId: result.id, subject }, "[Cases] Created Salesforce case");
      return NextResponse.json({
        success: true,
        caseId: result.id,
        subject,
      });
    }

    return NextResponse.json({ message: "Failed to create Salesforce case" }, { status: 500 });
  } catch (err) {
    logger.error({ err }, "[Cases] Create case failed");
    return NextResponse.json({ message: "Failed to create case" }, { status: 500 });
  }
}
