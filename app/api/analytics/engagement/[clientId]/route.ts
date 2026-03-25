import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const { clientId } = await params;
    const engagement = await storage.getClientEngagement(advisor.id, clientId);
    return NextResponse.json({ success: true, engagement });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch client engagement") }, { status: 400 });
  }
}
