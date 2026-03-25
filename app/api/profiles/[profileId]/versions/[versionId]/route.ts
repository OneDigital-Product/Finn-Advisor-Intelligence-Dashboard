import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  if (session.userType === "associate") {
    const assignedClients = await storage.getClientsByAssociate(session.userId);
    return assignedClients.some((c: any) => c.id === clientId);
  }
  const client = await storage.getClient(clientId);
  return !!client && client.advisorId === session.userId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string; versionId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { profileId, versionId } = await params;
    const profile = await storage.getInvestorProfile(profileId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!(await verifyClientAccess(auth.session, profile.clientId)))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const version = await storage.getProfileVersion(versionId);
    if (!version || version.profileId !== profileId)
      return NextResponse.json({ error: "Version not found" }, { status: 404 });

    return NextResponse.json({
      versionNumber: version.versionNumber,
      answers: version.answers,
      questionSchemaId: version.questionSchemaId,
      submittedAt: version.submittedAt,
      submittedBy: version.submittedBy,
    });
  } catch (err) {
    logger.error({ err }, "GET /api/profiles/:profileId/versions/:versionId error");
    return NextResponse.json({ error: "Failed to fetch version" }, { status: 500 });
  }
}
