import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [accounts, goals] = await Promise.all([
      storage.getCharitableAccountsByClient(clientId),
      storage.getCharitableGoalsByClient(clientId),
    ]);

    // Batch fetch all contributions and grants in 2 queries instead of 2N (was: 2 queries per account)
    const accountIds = accounts.map(a => a.id);
    const [allContributions, allGrants] = await Promise.all([
      storage.getContributionsByAccountIds(accountIds),
      storage.getGrantsByAccountIds(accountIds),
    ]);
    const contribByAccount = new Map<string, typeof allContributions>();
    for (const c of allContributions) {
      const existing = contribByAccount.get(c.accountId) || [];
      existing.push(c);
      contribByAccount.set(c.accountId, existing);
    }
    const grantsByAccount = new Map<string, typeof allGrants>();
    for (const g of allGrants) {
      const existing = grantsByAccount.get(g.accountId) || [];
      existing.push(g);
      grantsByAccount.set(g.accountId, existing);
    }
    const accountsWithDetails = accounts.map(account => ({
      ...account,
      contributions: contribByAccount.get(account.id) || [],
      grants: grantsByAccount.get(account.id) || [],
    }));
    const totalContributions = allContributions.reduce((sum, c) => sum + parseFloat(c.amount || "0"), 0);
    const totalGiving = allGrants.reduce((sum, g) => sum + parseFloat(g.amount || "0"), 0);
    const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0);
    const totalTaxDeductions = allContributions.reduce((sum, c) => sum + parseFloat(c.taxDeductionAmount || "0"), 0);

    return NextResponse.json({
      accounts: accountsWithDetails,
      goals,
      summary: {
        totalGiving,
        totalContributions,
        totalBalance,
        totalTaxDeductions,
        activeAccounts: accounts.filter(a => a.status === "active").length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to fetch philanthropy data") }, { status: 500 });
  }
}
