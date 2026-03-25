import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const createSchema = z.object({
  clientId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.string().min(1).refine((v) => { const n = parseFloat(v); return !isNaN(n) && n > 0; }, { message: "Amount must be a positive number" }),
  method: z.enum(["ach", "wire", "check", "journal"]),
  reason: z.string().min(1),
  frequency: z.enum(["one_time", "monthly", "quarterly", "annually"]).default("one_time"),
  taxWithholding: z.string().optional().refine((v) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && n >= 0 && n <= 100; }, { message: "Tax withholding must be between 0 and 100" }),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor context" }, { status: 403 });

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const withdrawals = await storage.getWithdrawalRequests(advisor.id, status);

    const enriched = await Promise.all(withdrawals.map(async (w) => {
      const client = await storage.getClient(w.clientId);
      const accounts = await storage.getAccountsByClient(w.clientId);
      const account = accounts.find(a => a.id === w.accountId);
      return {
        ...w,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        accountNumber: account?.accountNumber || "Unknown",
        accountType: account?.accountType || "Unknown",
      };
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    logger.error({ err }, "Error fetching withdrawals");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor context" }, { status: 403 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;

    const client = await storage.getClient(data.clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    const accounts = await storage.getAccountsByClient(data.clientId);
    const account = accounts.find(a => a.id === data.accountId);
    if (!account) return NextResponse.json({ message: "Account not found" }, { status: 404 });

    const withdrawal = await storage.createWithdrawalRequest({
      advisorId: advisor.id, clientId: data.clientId, accountId: data.accountId,
      amount: data.amount, method: data.method, reason: data.reason,
      frequency: data.frequency, taxWithholding: data.taxWithholding || null,
      notes: data.notes || null, status: "pending",
    });

    await storage.createWithdrawalAuditEntry({
      withdrawalId: withdrawal.id, action: "request_created", performedBy: advisor.id,
      details: { amount: data.amount, method: data.method, reason: data.reason, accountNumber: account.accountNumber, clientName: `${client.firstName} ${client.lastName}` },
    });

    logger.info({ withdrawalId: withdrawal.id }, "Withdrawal request created");
    return NextResponse.json(withdrawal, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Error creating withdrawal");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
