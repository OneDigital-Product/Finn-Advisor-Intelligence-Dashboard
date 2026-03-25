import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { insertCharitableContributionSchema } from "@shared/schema";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

async function verifyAccountOwnership(accountId: string, advisorId: string): Promise<boolean> {
  const account = await storage.getCharitableAccount(accountId);
  return !!account && account.advisorId === advisorId;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const raw = await request.json();
    const data = insertCharitableContributionSchema.parse(raw);
    if (!(await verifyAccountOwnership(data.accountId, advisor.id))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const contribution = await storage.createCharitableContribution(data);
    return NextResponse.json(contribution);
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to create contribution") }, { status: 400 });
  }
}
