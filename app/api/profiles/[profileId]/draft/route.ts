import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const draftAnswersBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  if (session.userType === "associate") {
    const assignedClients = await storage.getClientsByAssociate(session.userId);
    return assignedClients.some((c: any) => c.id === clientId);
  }
  const client = await storage.getClient(clientId);
  return !!client && client.advisorId === session.userId;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { profileId } = await params;
    const body = await request.json();
    const parsed = draftAnswersBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const profile = await storage.getInvestorProfile(profileId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!(await verifyClientAccess(auth.session, profile.clientId)))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    await storage.saveDraft(profileId, parsed.data.answers);

    return NextResponse.json({
      id: profileId,
      status: "in_progress",
      draftAnswers: parsed.data.answers,
      lastSavedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "POST /api/profiles/:profileId/draft error");
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { profileId } = await params;
    const profile = await storage.getInvestorProfile(profileId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!(await verifyClientAccess(auth.session, profile.clientId)))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const answers = profile.draftAnswers as Record<string, any> | undefined;
    return NextResponse.json({
      answers: answers || {},
      lastSavedAt: profile.updatedAt?.toISOString() || new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "GET /api/profiles/:profileId/draft error");
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
  }
}
