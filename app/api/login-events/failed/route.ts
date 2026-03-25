import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 30;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const body = await request.json();
    const { reason } = body;
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

    const existing = await storage.getFailedLoginAttempts({ advisorId: advisor.id, ipAddress });
    const recentAttempt = existing.find((a: any) =>
      a.blockedUntil && new Date(a.blockedUntil) > new Date()
    );

    if (recentAttempt) {
      return NextResponse.json({
        error: "Account temporarily blocked due to too many failed attempts",
        blockedUntil: recentAttempt.blockedUntil,
      }, { status: 429 });
    }

    const currentCount = existing.length > 0 ? ((existing[0] as any).count || 0) + 1 : 1;
    const blockedUntil = currentCount >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000)
      : undefined;

    const attempt = await storage.createFailedLoginAttempt({
      advisorId: advisor.id,
      ipAddress,
      reason: reason || "invalid_credentials",
      count: currentCount,
      lastAttemptTime: new Date(),
      blockedUntil: blockedUntil || undefined,
    });

    return NextResponse.json({
      success: true,
      attempt,
      suspicious: currentCount >= MAX_FAILED_ATTEMPTS,
      blocked: !!blockedUntil,
      blockedUntil: blockedUntil || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to record failed login attempt") }, { status: 400 });
  }
}
