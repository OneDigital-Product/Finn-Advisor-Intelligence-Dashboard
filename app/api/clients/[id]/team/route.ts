import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { validateBody, validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const addTeamMemberSchema = z.object({
  associateId: z.string().min(1, "associateId is required"),
  role: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/clients/[id]/team
// ---------------------------------------------------------------------------
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
    const clientId = id;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  try {
    const members = await storage.getClientTeamMembers(id);
    return NextResponse.json(
      members.map((m) => ({
        ...m,
        associate: { ...m.associate, passwordHash: undefined },
      }))
    );
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/clients/[id]/team
// ---------------------------------------------------------------------------
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  const { id } = await params;
    const clientId = id;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  try {
    const body = await request.json();
    const validation = validateBody(addTeamMemberSchema, body);
    if (validation.error) return validation.error;

    const existing = await storage.getClientTeamMembers(id);
    if (existing.some((m) => m.associateId === validation.data.associateId)) {
      return NextResponse.json(
        { message: "Associate is already on this team" },
        { status: 400 }
      );
    }

    const member = await storage.addClientTeamMember({
      clientId: id,
      associateId: validation.data.associateId,
      role: validation.data.role || "support",
      addedAt: new Date().toISOString().split("T")[0],
    });
    return NextResponse.json(member);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
