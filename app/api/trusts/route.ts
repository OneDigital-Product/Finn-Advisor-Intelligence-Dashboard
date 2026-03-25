import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { insertTrustSchema } from "@shared/schema";

const createTrustSchema = insertTrustSchema.omit({ advisorId: true });

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = createTrustSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    if (body.clientId) {
      const client = await storage.getClient(body.clientId);
      if (!client || client.advisorId !== auth.session.userId!) {
        return NextResponse.json({ message: "Client not found or not owned by you" }, { status: 400 });
      }
    }
    const trust = await storage.createTrust({ ...body, advisorId: auth.session.userId! });
    return NextResponse.json(trust, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
