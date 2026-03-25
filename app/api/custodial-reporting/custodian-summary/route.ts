import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { accounts, clients } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    if (!advisorId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const allAccounts = await db
      .select({ account: accounts, client: clients })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id))
      .where(eq(clients.advisorId, advisorId));

    const custodians: Record<string, {
      custodian: string; totalAum: number; accountCount: number;
      clientCount: number; clients: Set<string>; accountTypes: Record<string, number>;
    }> = {};

    for (const { account, client } of allAccounts) {
      const cust = account.custodian || "Unknown";
      if (!custodians[cust]) {
        custodians[cust] = { custodian: cust, totalAum: 0, accountCount: 0, clientCount: 0, clients: new Set(), accountTypes: {} };
      }
      custodians[cust].totalAum += parseFloat(account.balance || "0");
      custodians[cust].accountCount += 1;
      custodians[cust].clients.add(client.id);
      const aType = account.accountType || "Other";
      custodians[cust].accountTypes[aType] = (custodians[cust].accountTypes[aType] || 0) + 1;
    }

    const nigoByCustomer: Record<string, { open: number; total: number }> = {};
    const allNigo = await storage.getNigoRecords(advisorId);
    for (const n of allNigo) {
      if (!nigoByCustomer[n.custodian]) nigoByCustomer[n.custodian] = { open: 0, total: 0 };
      nigoByCustomer[n.custodian].total += 1;
      if (n.status === "open" || n.status === "in_progress") nigoByCustomer[n.custodian].open += 1;
    }

    const result = Object.values(custodians).map(c => ({
      custodian: c.custodian,
      totalAum: Math.round(c.totalAum * 100) / 100,
      accountCount: c.accountCount,
      clientCount: c.clients.size,
      accountTypes: c.accountTypes,
      openNigos: nigoByCustomer[c.custodian]?.open || 0,
      totalNigos: nigoByCustomer[c.custodian]?.total || 0,
    }));

    return NextResponse.json(result.sort((a, b) => b.totalAum - a.totalAum));
  } catch (err) {
    logger.error({ err }, "Error fetching custodian summary");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
