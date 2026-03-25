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

    const versions = await storage.getProfileVersions(profileId);
    return NextResponse.json(
      versions.map((v) => ({
        versionNumber: v.versionNumber,
        versionId: v.id,
        submittedAt: v.submittedAt,
        submittedBy: v.submittedBy,
      }))
    );
  } catch (err) {
    logger.error({ err }, "GET /api/profiles/:profileId/versions error");
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}
