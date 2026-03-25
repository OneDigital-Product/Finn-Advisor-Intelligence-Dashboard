import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createTrustRelationshipSchema = z.object({
  trustId: z.string(), personName: z.string(), personClientId: z.string().optional().nullable(),
  role: z.string(), generation: z.number().optional(), notes: z.string().optional(),
});

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(session);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = createTrustRelationshipSchema.parse(await request.json());
    const trust = await storage.getTrust(body.trustId);
    if (!trust) return NextResponse.json({ message: "Trust not found" }, { status: 404 });
    const hasAccess = await verifyClientAccess(auth.session, trust.clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });
    const rel = await storage.createTrustRelationship(body);
    return NextResponse.json(rel);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
