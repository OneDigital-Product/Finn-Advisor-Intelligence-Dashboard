import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const addSocialProfileSchema = z.object({
  clientId: z.string().min(1),
  platform: z.string().default("linkedin"),
  profileUrl: z.string().url().refine((url) => /linkedin\.com/i.test(url), "Only LinkedIn profile URLs are supported"),
  displayName: z.string().optional(),
  headline: z.string().optional(),
  monitoringEnabled: z.boolean().default(true),
});

async function authorizeClientAccess(session: any, clientId: string): Promise<boolean> {
  const client = await storage.getClient(clientId);
  if (!client) return false;
  if (session.userType === "advisor") return client.advisorId === session.userId;
  if (session.userType === "associate") {
    const assignedClients = await storage.getClientsByAssociate(session.userId!);
    return assignedClients.some(c => c.id === clientId);
  }
  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    if (!(await authorizeClientAccess(auth.session, clientId))) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    const profiles = await storage.getSocialProfilesByClient(clientId);
    return NextResponse.json(profiles);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    if (!(await authorizeClientAccess(auth.session, clientId))) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addSocialProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    }

    const profile = await storage.createSocialProfile({
      clientId,
      platform: parsed.data.platform,
      profileUrl: parsed.data.profileUrl,
      displayName: parsed.data.displayName || null,
      headline: parsed.data.headline || null,
      monitoringEnabled: parsed.data.monitoringEnabled,
      lastCheckedAt: null,
    });
    return NextResponse.json(profile);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
