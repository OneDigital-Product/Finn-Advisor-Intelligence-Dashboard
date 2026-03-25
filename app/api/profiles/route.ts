import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { AuditLogger } from "@server/integrations/cassidy/audit-logger";
import { z } from "zod";

const createProfileBodySchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
  profileType: z.enum(["individual", "legal_entity"], {
    errorMap: () => ({ message: "profileType must be 'individual' or 'legal_entity'" }),
  }),
  entityType: z.enum(["trust", "corporation", "llc", "partnership", "foundation"]).optional(),
}).refine(
  (data) => data.profileType !== "legal_entity" || !!data.entityType,
  { message: "entityType required for legal_entity profiles", path: ["entityType"] }
);

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  if (session.userType === "associate") {
    const assignedClients = await storage.getClientsByAssociate(session.userId);
    return assignedClients.some((c: any) => c.id === clientId);
  }
  const client = await storage.getClient(clientId);
  return !!client && client.advisorId === session.userId;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createProfileBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    if (!(await verifyClientAccess(auth.session, parsed.data.clientId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const profile = await storage.createInvestorProfile({
      clientId: parsed.data.clientId,
      profileType: parsed.data.profileType,
      entityType: parsed.data.profileType === "legal_entity" ? parsed.data.entityType! : null,
      status: "draft",
      createdBy: auth.session.userEmail || "unknown",
    });

    await AuditLogger.logEvent(profile.id, "profile_created", {
      profile_id: profile.id,
      client_id: parsed.data.clientId,
      profile_type: parsed.data.profileType,
      created_by: auth.session.userEmail || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    logger.error({ err }, "POST /api/profiles error");
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

    if (!(await verifyClientAccess(auth.session, clientId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const profiles = await storage.getInvestorProfilesByClient(clientId);
    return NextResponse.json(profiles);
  } catch (err) {
    logger.error({ err }, "GET /api/profiles error");
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}
