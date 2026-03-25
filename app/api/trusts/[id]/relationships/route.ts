import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { insertTrustRelationshipSchema } from "@shared/schema";

const createTrustRelSchema = insertTrustRelationshipSchema.omit({ trustId: true });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const trust = await storage.getTrust(id);
    if (!trust) return NextResponse.json({ message: "Trust not found" }, { status: 404 });
    if (trust.advisorId !== auth.session.userId!) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    const relationships = await storage.getTrustRelationships(id);
    return NextResponse.json(relationships);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const trust = await storage.getTrust(id);
    if (!trust) return NextResponse.json({ message: "Trust not found" }, { status: 404 });
    if (trust.advisorId !== auth.session.userId!) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const raw = await request.json();
    const parsed = createTrustRelSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }

    const relationship = await storage.createTrustRelationship({ ...parsed.data, trustId: id });
    return NextResponse.json(relationship, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
