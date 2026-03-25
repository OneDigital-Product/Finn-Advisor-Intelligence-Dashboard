import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const body = await request.json();
    const { logoutTime, loginEventId } = body;

    if (logoutTime && loginEventId) {
      const updated = await storage.recordLogout(loginEventId);
      if (!updated) return NextResponse.json({ error: "Login event not found" }, { status: 404 });
      if (updated.userId !== advisor.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      return NextResponse.json({ success: true, message: "Logout recorded", loginEvent: updated });
    }

    const loginEvent = await storage.recordLoginEvent({
      userId: advisor.id,
      userType: "advisor",
      userName: advisor.name,
      userEmail: advisor.email,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      deviceInfo: request.headers.get("user-agent") || undefined,
      mfaStatus: body.mfaUsed || false,
      status: "success",
    });

    return NextResponse.json({ success: true, loginEvent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to record login event") }, { status: 400 });
  }
}
