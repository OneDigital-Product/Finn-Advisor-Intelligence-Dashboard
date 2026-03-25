import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { logger } from "@server/lib/logger";
import { accounts, clients } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    if (!advisorId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const currentYear = new Date().getFullYear();
    const rmdAge = 73;

    const allClients = await db
      .select({ client: clients })
      .from(clients)
      .where(and(eq(clients.advisorId, advisorId), sql`${clients.dateOfBirth} IS NOT NULL`));

    const rmdClients: any[] = [];

    for (const { client } of allClients) {
      if (!client.dateOfBirth) continue;
      const dob = new Date(client.dateOfBirth);
      if (isNaN(dob.getTime())) continue;

      const age = currentYear - dob.getFullYear();
      if (age < rmdAge) continue;

      const clientAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.clientId, client.id));

      const iraAccounts = clientAccounts.filter(a =>
        ["Traditional IRA", "IRA", "SEP IRA", "SIMPLE IRA", "401k", "403b"].some(t =>
          a.accountType?.toLowerCase().includes(t.toLowerCase())
        )
      );

      if (iraAccounts.length === 0) continue;

      const totalBalance = iraAccounts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);

      const UNIFORM_LIFETIME_TABLE: Record<number, number> = {
        72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
        79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
        86: 15.3, 87: 14.5, 88: 13.8, 89: 13.1, 90: 12.4, 91: 11.7, 92: 11.1,
        93: 10.5, 94: 9.9, 95: 9.4, 96: 8.8, 97: 8.3, 98: 7.8, 99: 7.3, 100: 6.8,
      };

      const factor = UNIFORM_LIFETIME_TABLE[age] || 6.8;
      const rmdAmount = totalBalance / factor;

      const byCustodian: Record<string, { balance: number; rmd: number; accounts: number }> = {};
      for (const acct of iraAccounts) {
        const cust = acct.custodian || "Unknown";
        if (!byCustodian[cust]) byCustodian[cust] = { balance: 0, rmd: 0, accounts: 0 };
        const bal = parseFloat(acct.balance || "0");
        byCustodian[cust].balance += bal;
        byCustodian[cust].rmd += bal / factor;
        byCustodian[cust].accounts += 1;
      }

      rmdClients.push({
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        age, dateOfBirth: client.dateOfBirth, totalBalance,
        rmdAmount: Math.round(rmdAmount * 100) / 100,
        factor, status: "pending",
        accounts: iraAccounts.map(a => ({
          id: a.id, accountNumber: a.accountNumber, accountType: a.accountType,
          custodian: a.custodian, balance: parseFloat(a.balance || "0"),
          rmd: Math.round((parseFloat(a.balance || "0") / factor) * 100) / 100,
        })),
        byCustodian,
      });
    }

    const custodianSummary: Record<string, { custodian: string; totalBalance: number; totalRmd: number; clientCount: number; accountCount: number }> = {};
    for (const rc of rmdClients) {
      for (const [cust, data] of Object.entries(rc.byCustodian) as [string, any][]) {
        if (!custodianSummary[cust]) {
          custodianSummary[cust] = { custodian: cust, totalBalance: 0, totalRmd: 0, clientCount: 0, accountCount: 0 };
        }
        custodianSummary[cust].totalBalance += data.balance;
        custodianSummary[cust].totalRmd += data.rmd;
        custodianSummary[cust].accountCount += data.accounts;
      }
      for (const cust of Object.keys(rc.byCustodian)) {
        if (custodianSummary[cust]) custodianSummary[cust].clientCount += 1;
      }
    }

    const totalRmd = rmdClients.reduce((s, c) => s + c.rmdAmount, 0);
    const totalBalance = rmdClients.reduce((s, c) => s + c.totalBalance, 0);

    return NextResponse.json({
      totalClients: rmdClients.length,
      totalRmd: Math.round(totalRmd * 100) / 100,
      totalBalance: Math.round(totalBalance * 100) / 100,
      completedCount: 0, outstandingCount: rmdClients.length,
      clients: rmdClients,
      custodianSummary: Object.values(custodianSummary).map(c => ({
        ...c,
        totalBalance: Math.round(c.totalBalance * 100) / 100,
        totalRmd: Math.round(c.totalRmd * 100) / 100,
      })),
      year: currentYear,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching RMD summary");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
