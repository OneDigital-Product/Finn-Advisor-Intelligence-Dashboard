import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { insertHouseholdSchema } from "@shared/schema";

const updateHouseholdSchema = insertHouseholdSchema.omit({ advisorId: true }).partial().refine(
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
    const household = await storage.getHousehold(id);
    if (!household) return NextResponse.json({ message: "Household not found" }, { status: 404 });
    if (household.advisorId !== auth.session.userId!) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    const members = await storage.getHouseholdMembers(household.id);
    const memberClientIds = members.map(m => m.clientId);
    const clientAumMap = await storage.getAumByClient(memberClientIds);
    const membersWithAum = members.map(m => ({
      ...m,
      currentAUM: clientAumMap.get(m.clientId)?.totalAum ?? 0,
    }));
    const currentAUM = membersWithAum.reduce((sum, m) => sum + m.currentAUM, 0);
    return NextResponse.json({ ...household, currentAUM, members: membersWithAum });
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
    const parsed = updateHouseholdSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const existing = await storage.getHousehold(id);
    if (!existing) return NextResponse.json({ message: "Household not found" }, { status: 404 });
    if (existing.advisorId !== auth.session.userId!) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
    if (body.primaryClientId) {
      const client = await storage.getClient(body.primaryClientId);
      if (!client || client.advisorId !== auth.session.userId!) {
        return NextResponse.json({ message: "Primary client not found or not owned by you" }, { status: 400 });
      }
    }
    const result = await storage.updateHousehold(id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
