import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { clients, investorProfiles, investorProfileVersions } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_id: string; profile_type: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { client_id, profile_type } = await params;
    const advisorId = auth.session.userId;

    const client = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found or not authorized" }, { status: 404 });
    }

    const profile = await storage.db
      .select()
      .from(investorProfiles)
      .where(
        and(
          eq(investorProfiles.clientId, client_id),
          eq(investorProfiles.profileType, profile_type),
        ),
      )
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({ answered_questions: {} });
    }

    const latestVersion = await storage.db
      .select()
      .from(investorProfileVersions)
      .where(eq(investorProfileVersions.profileId, profile[0].id))
      .orderBy(desc(investorProfileVersions.versionNumber))
      .limit(1);

    if (latestVersion.length === 0) {
      return NextResponse.json({ answered_questions: {} });
    }

    return NextResponse.json({
      version_number: latestVersion[0].versionNumber,
      answered_questions: latestVersion[0].answers || {},
    });
  } catch (err) {
    logger.error({ err }, "Error fetching profile diff");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
