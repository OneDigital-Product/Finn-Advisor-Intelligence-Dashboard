import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const briefQuerySchema = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Advisor not found" }, { status: 403 });

    const url = new URL(request.url);
    const raw: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) raw[k] = v;

    const parsed = briefQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid query parameters", errors: parsed.error.issues }, { status: 400 });
    }
    const briefs = await storage.getResearchBriefs(advisor.id, parsed.data);
    return NextResponse.json(briefs);
  } catch (error: unknown) {
    logger.error({ err: error }, "Failed to fetch research briefs");
    return NextResponse.json({ message: "Failed to fetch research briefs" }, { status: 500 });
  }
}
