import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const resolveSchema = z.object({
  resolutionNote: z.string().min(1, "Resolution note is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = resolveSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const log = await storage.getFiduciaryValidationLog(id);
    if (!log) return NextResponse.json({ message: "Validation log not found" }, { status: 404 });
    if (log.advisorId && log.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Not authorized to resolve this log" }, { status: 403 });
    }

    const resolved = await storage.resolveFiduciaryValidation(
      id,
      advisor.name,
      parsed.data.resolutionNote
    );

    if (!resolved) return NextResponse.json({ message: "Validation log not found" }, { status: 404 });
    return NextResponse.json(resolved);
  } catch (error: any) {
    logger.error({ err: error }, "Error resolving validation");
    return NextResponse.json({ message: "Failed to resolve validation" }, { status: 500 });
  }
}
