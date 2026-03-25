import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const createWashSaleSchema = z.object({
  ticker: z.string().min(1),
  sellDate: z.string().min(1),
  sellAccountId: z.string().min(1),
  buyDate: z.string().optional(),
  buyAccountId: z.string().optional(),
  disallowedLoss: z.number().positive(),
  windowStart: z.string().min(1),
  windowEnd: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const clientId = id;

    const body = await request.json();
    const parsed = createWashSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const event = await storage.createWashSaleEvent({
      clientId,
      ticker: parsed.data.ticker,
      sellDate: parsed.data.sellDate,
      sellAccountId: parsed.data.sellAccountId,
      buyDate: parsed.data.buyDate || null,
      buyAccountId: parsed.data.buyAccountId || null,
      disallowedLoss: String(parsed.data.disallowedLoss),
      windowStart: parsed.data.windowStart,
      windowEnd: parsed.data.windowEnd,
      status: "active",
    });

    return NextResponse.json(event);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] Wash sale event error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
