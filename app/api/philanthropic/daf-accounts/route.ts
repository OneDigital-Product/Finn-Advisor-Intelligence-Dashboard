import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createDafAccountSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  sponsorOrganization: z.string(),
  accountName: z.string(),
  currentBalance: z.string().optional(),
  totalContributions: z.string().optional(),
  totalGrants: z.string().optional(),
  taxDeductionsTaken: z.string().optional(),
  dateOpened: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = createDafAccountSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const client = await storage.getClient(body.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    body.advisorId = advisor.id;
    const account = await storage.createDafAccount(body);
    return NextResponse.json(account);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
