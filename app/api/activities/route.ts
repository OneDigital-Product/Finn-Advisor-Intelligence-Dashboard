import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { insertActivitySchema } from "@shared/schema";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const createActivitySchema = insertActivitySchema.omit({ advisorId: true });
    const body = await request.json();
    const validation = validateBody(createActivitySchema, body);
    if (validation.error) return validation.error;
    const data = validation.data;

    if (data.salesforceActivityId !== undefined && data.salesforceActivityId !== null && !isValidSalesforceId(data.salesforceActivityId)) {
      return NextResponse.json({ message: "Invalid Salesforce Activity ID format" }, { status: 400 });
    }

    const activity = await storage.createActivity({ ...data, advisorId: advisor.id });
    return NextResponse.json(activity);
  } catch (err) {
    logger.error({ err }, "[Tasks] activity create failed");
    return NextResponse.json({ message: "Failed to create activity" }, { status: 500 });
  }
}
