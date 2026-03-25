import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { nigoItems } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const createNigoSchema = z.object({
  clientId: z.string().optional(),
  accountId: z.string().optional(),
  custodian: z.string().min(1, "Custodian is required"),
  nigoType: z.string().min(1, "NIGO type is required"),
  description: z.string().min(1, "Description is required"),
  resolutionGuidance: z.string().optional(),
  rmdAmount: z.coerce.number().optional(),
  rmdYear: z.coerce.number().int().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const custodian = url.searchParams.get("custodian");

    let conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(nigoItems.status, status));
    if (custodian && custodian !== "all") conditions.push(eq(nigoItems.custodian, custodian));

    const results = await db
      .select()
      .from(nigoItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(nigoItems.createdAt))
      .limit(200);

    return NextResponse.json(results);
  } catch (err: any) {
    logger.error({ err: err }, "[NIGO] GET error:");
    return NextResponse.json({ message: "Failed to fetch NIGO items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = createNigoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const [item] = await db
      .insert(nigoItems)
      .values({
        ...parsed.data,
        clientId: parsed.data.clientId || null,
        accountId: parsed.data.accountId || null,
        rmdAmount: parsed.data.rmdAmount ? String(parsed.data.rmdAmount) : null,
        rmdYear: parsed.data.rmdYear || null,
        resolutionGuidance: parsed.data.resolutionGuidance || null,
        status: "pending",
        submittedAt: new Date(),
      })
      .returning();

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "[NIGO] POST error:");
    return NextResponse.json({ message: "Failed to create NIGO item" }, { status: 500 });
  }
}
