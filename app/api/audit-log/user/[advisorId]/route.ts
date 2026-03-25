import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ advisorId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const { advisorId } = await params;
    if (advisorId !== advisor.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const logs = await storage.getAuditLogByAdvisor(advisorId);
    return NextResponse.json({ success: true, logs, count: logs.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch advisor audit log") }, { status: 400 });
  }
}
