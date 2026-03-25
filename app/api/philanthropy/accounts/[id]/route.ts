import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { insertCharitableAccountSchema } from "@shared/schema";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

const updateAccountSchema = insertCharitableAccountSchema.partial().omit({ clientId: true, advisorId: true });

async function verifyAccountOwnership(accountId: string, advisorId: string): Promise<boolean> {
  const account = await storage.getCharitableAccount(accountId);
  return !!account && account.advisorId === advisorId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    if (!(await verifyAccountOwnership(id, advisor.id))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const raw = await request.json();
    const data = updateAccountSchema.parse(raw);
    const account = await storage.updateCharitableAccount(id, data);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json(account);
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to update charitable account") }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    if (!(await verifyAccountOwnership(id, advisor.id))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await storage.deleteCharitableAccount(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to delete charitable account") }, { status: 500 });
  }
}
