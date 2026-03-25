import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const updateSchema = z.object({
  profileUrl: z.string().url().refine((url) => /linkedin\.com/i.test(url), "Only LinkedIn").optional(),
  displayName: z.string().optional(),
  headline: z.string().optional(),
  monitoringEnabled: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field" });

async function authorizeProfileAccess(session: any, profileId: string): Promise<boolean> {
  const profile = await storage.getSocialProfile(profileId);
  if (!profile) return false;
  const client = await storage.getClient(profile.clientId);
  if (!client) return false;
  if (session.userType === "advisor") return client.advisorId === session.userId;
  if (session.userType === "associate") {
    const assigned = await storage.getClientsByAssociate(session.userId!);
    return assigned.some(c => c.id === profile.clientId);
  }
  return false;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    if (!(await authorizeProfileAccess(auth.session, id))) {
      return NextResponse.json({ message: "Not found or access denied" }, { status: 404 });
    }
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    const result = await storage.updateSocialProfile(id, parsed.data);
    if (!result) return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    if (!(await authorizeProfileAccess(auth.session, id))) {
      return NextResponse.json({ message: "Not found or access denied" }, { status: 404 });
    }
    await storage.deleteSocialProfile(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
