import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { insertCharitableGrantSchema } from "@shared/schema";
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
    const data = insertCharitableGrantSchema.parse(raw);
    if (!(await verifyAccountOwnership(data.accountId, advisor.id))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const grant = await storage.createCharitableGrant(data);
    return NextResponse.json(grant);
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to create grant") }, { status: 400 });
  }
}
