import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { insertHouseholdSchema } from "@shared/schema";

const createHouseholdSchema = insertHouseholdSchema.omit({ advisorId: true });

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId!;
    if (!advisorId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    let list = await storage.getHouseholds(advisorId);

    const householdIds = list.map(h => h.id);
    const aumMap = await storage.getAumByHousehold(householdIds);
    const enrichedList = list.map(h => ({
      ...h,
      currentAUM: aumMap.get(h.id) ?? 0,
    }));

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const total = enrichedList.length;
    const start = (page - 1) * limit;
    const paged = enrichedList.slice(start, start + limit);

    return NextResponse.json({ total, page, limit, households: paged });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = createHouseholdSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    if (body.primaryClientId) {
      const client = await storage.getClient(body.primaryClientId);
      if (!client || client.advisorId !== auth.session.userId!) {
        return NextResponse.json({ message: "Primary client not found or not owned by you" }, { status: 400 });
      }
    }
    const household = await storage.createHousehold({ ...body, advisorId: auth.session.userId! });
    return NextResponse.json(household, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
