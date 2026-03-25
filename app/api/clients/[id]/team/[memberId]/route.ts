import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

type RouteContext = { params: Promise<{ id: string; memberId: string }> };

// ---------------------------------------------------------------------------
// DELETE /api/clients/[id]/team/[memberId]
// ---------------------------------------------------------------------------
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  const { memberId } = await params;

  const idCheck = validateId(memberId);
  if (!idCheck.valid) return idCheck.error;

  try {
    await storage.removeClientTeamMember(memberId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
