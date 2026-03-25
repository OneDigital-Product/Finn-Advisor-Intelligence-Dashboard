import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createNigoSchema = z.object({
  clientId: z.string().min(1),
  accountId: z.string().optional(),
  custodian: z.string().min(1),
  submissionType: z.string().min(1),
  reasonCode: z.string().min(1),
  reasonDescription: z.string().optional(),
  submittedDate: z.string().min(1),
  rejectedDate: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    if (!advisorId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const records = await storage.getNigoRecords(advisorId, status);

    const enriched = [];
    for (const record of records) {
      const client = await storage.getClient(record.clientId);
      enriched.push({
        ...record,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
      });
    }

    const open = enriched.filter(r => r.status === "open").length;
    const inProgress = enriched.filter(r => r.status === "in_progress").length;
    const resolved = enriched.filter(r => r.status === "resolved").length;
    const escalated = enriched.filter(r => r.status === "escalated").length;

    const byCustodian: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    for (const r of enriched) {
      byCustodian[r.custodian] = (byCustodian[r.custodian] || 0) + 1;
      byReason[r.reasonCode] = (byReason[r.reasonCode] || 0) + 1;
    }

    const avgAging = enriched.length > 0
      ? Math.round(enriched.reduce((s, r) => s + (r.aging || 0), 0) / enriched.length)
      : 0;

    return NextResponse.json({
      records: enriched,
      summary: { total: enriched.length, open, inProgress, resolved, escalated, avgAging },
      byCustodian, byReason,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching NIGO records");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    if (!advisorId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createNigoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const client = await storage.getClient(data.clientId);
    if (!client || client.advisorId !== advisorId) {
      return NextResponse.json({ message: "Client not found or not authorized" }, { status: 403 });
    }

    const rejectedDate = data.rejectedDate ? new Date(data.rejectedDate) : new Date();
    const aging = Math.ceil((new Date().getTime() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24));

    const record = await storage.createNigoRecord({
      ...data,
      advisorId,
      aging: Math.max(0, aging),
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Error creating NIGO record");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
