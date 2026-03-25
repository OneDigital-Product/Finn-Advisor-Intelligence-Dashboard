import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createDafTransactionSchema = z.object({
  dafAccountId: z.string(),
  transactionType: z.string(),
  amount: z.string(),
  recipientOrg: z.string().optional(),
  description: z.string().optional(),
  transactionDate: z.string(),
  taxYear: z.number().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const raw = await request.json();
    const parsed = createDafTransactionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const dafAccount = await storage.getDafAccount(body.dafAccountId);
    if (!dafAccount) return NextResponse.json({ message: "DAF account not found" }, { status: 404 });

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(dafAccount.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const txn = await storage.createDafTransaction(body);

    const amount = parseFloat(body.amount);
    const currentBalance = parseFloat(String(dafAccount.currentBalance || "0"));
    const totalContributions = parseFloat(String(dafAccount.totalContributions || "0"));
    const totalGrants = parseFloat(String(dafAccount.totalGrants || "0"));
    const taxDeductions = parseFloat(String(dafAccount.taxDeductionsTaken || "0"));

    if (body.transactionType === "contribution") {
      await storage.updateDafAccount(dafAccount.id, {
        currentBalance: String(currentBalance + amount),
        totalContributions: String(totalContributions + amount),
        taxDeductionsTaken: String(taxDeductions + amount),
      } as any);
    } else if (body.transactionType === "grant") {
      await storage.updateDafAccount(dafAccount.id, {
        currentBalance: String(Math.max(0, currentBalance - amount)),
        totalGrants: String(totalGrants + amount),
      } as any);
    }

    return NextResponse.json(txn);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
