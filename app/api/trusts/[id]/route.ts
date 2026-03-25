import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { insertTrustSchema } from "@shared/schema";

const updateTrustSchema = insertTrustSchema.omit({ advisorId: true, clientId: true }).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

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
    const relationships = await storage.getTrustRelationships(trust.id);
    return NextResponse.json({ ...trust, relationships });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const raw = await request.json();
    const parsed = updateTrustSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }

    const existing = await storage.getTrust(id);
    if (!existing) return NextResponse.json({ message: "Trust not found" }, { status: 404 });
    if (existing.advisorId !== auth.session.userId!) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    const result = await storage.updateTrust(id, parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await storage.getTrust(id);
    if (!existing) return NextResponse.json({ message: "Trust not found" }, { status: 404 });
    if (existing.advisorId !== auth.session.userId!) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    await storage.deleteTrust(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
