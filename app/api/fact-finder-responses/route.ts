import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { db } from "@server/db";
import { factFinderDefinitions, factFinderResponses, clients } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");
    const status = url.searchParams.get("status");

    let conditions: any[] = [eq(factFinderResponses.advisorId, advisor.id)];
    if (clientId) conditions.push(eq(factFinderResponses.clientId, clientId));
    if (status) conditions.push(eq(factFinderResponses.status, status));

    const responses = await db
      .select({
        response: factFinderResponses,
        definitionName: factFinderDefinitions.name,
        definitionCategory: factFinderDefinitions.category,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(factFinderResponses)
      .leftJoin(factFinderDefinitions, eq(factFinderResponses.definitionId, factFinderDefinitions.id))
      .leftJoin(clients, eq(factFinderResponses.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(factFinderResponses.createdAt));

    return NextResponse.json(responses.map((r) => ({
      ...r.response,
      definitionName: r.definitionName,
      definitionCategory: r.definitionCategory,
      clientName: r.clientFirstName && r.clientLastName
        ? `${r.clientFirstName} ${r.clientLastName}`
        : r.clientFirstName || r.clientLastName || "—",
    })));
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinderResponses] GET error:");
    return NextResponse.json({ message: "Failed to fetch responses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const body = await request.json();
    const { definitionId, clientId, householdId } = body;

    if (!definitionId || !clientId) {
      return NextResponse.json({ message: "definitionId and clientId are required" }, { status: 400 });
    }

    const [response] = await db
      .insert(factFinderResponses)
      .values({
        definitionId,
        clientId,
        householdId: householdId || null,
        advisorId: advisor.id,
        status: "draft",
        answers: {},
        completionPercentage: 0,
      })
      .returning();

    return NextResponse.json(response, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinderResponses] POST error:");
    return NextResponse.json({ message: "Failed to create response" }, { status: 500 });
  }
}
