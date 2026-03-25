import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { directIndexingEngine } from "@server/engines/direct-indexing-engine";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const createPortfolioSchema = z.object({
  targetIndex: z.string().min(1),
  totalValue: z.number().positive(),
  accountId: z.string().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const clientId = id;

    const portfolios = await storage.getDirectIndexPortfoliosByClient(clientId);
    return NextResponse.json(portfolios);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] GET portfolios error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const clientId = id;

    const body = await request.json();
    const parsed = createPortfolioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const portfolio = await directIndexingEngine.generateDirectIndexPortfolio(
      clientId,
      parsed.data.targetIndex,
      parsed.data.totalValue,
      parsed.data.accountId,
    );

    return NextResponse.json(portfolio);
  } catch (err: any) {
    logger.error({ err: err }, "[DirectIndexing] POST portfolio error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
