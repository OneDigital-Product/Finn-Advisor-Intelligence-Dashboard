import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { AuditLogger } from "@server/integrations/cassidy/audit-logger";
import { z } from "zod";

const updateProfileBodySchema = z.object({
  status: z.enum(["draft", "in_progress", "submitted", "finalized", "expired"]).optional(),
  expirationDate: z.string().optional(),
});

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
    return NextResponse.json(profile);
  } catch (err) {
    logger.error({ err }, "GET /api/profiles/:profileId error");
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { profileId } = await params;
    const existing = await storage.getInvestorProfile(profileId);
    if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!(await verifyClientAccess(auth.session, existing.clientId)))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const body = await request.json();
    const parsed = updateProfileBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const updateData: Record<string, any> = {};
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.expirationDate) updateData.expirationDate = new Date(parsed.data.expirationDate);

    const profile = await storage.updateInvestorProfile(profileId, updateData);

    await AuditLogger.logEvent(profileId, "profile_updated", {
      profile_id: profileId,
      client_id: existing.clientId,
      updated_fields: Object.keys(updateData),
      updated_by: auth.session.userEmail || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(profile);
  } catch (err) {
    logger.error({ err }, "PUT /api/profiles/:profileId error");
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { profileId } = await params;
    const existing = await storage.getInvestorProfile(profileId);
    if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!(await verifyClientAccess(auth.session, existing.clientId)))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    await storage.deleteInvestorProfile(profileId);

    await AuditLogger.logEvent(profileId, "profile_deleted", {
      profile_id: profileId,
      client_id: existing.clientId,
      deleted_by: auth.session.userEmail || "unknown",
      timestamp: new Date().toISOString(),
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "DELETE /api/profiles/:profileId error");
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
