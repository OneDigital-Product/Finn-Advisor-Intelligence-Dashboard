import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { generateEclipseImportFile } from "@server/integrations/eclipse/import-generator";
import { logger } from "@server/lib/logger";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["nwr_applied", "sf_case_created", "eclipse_generated", "cancelled"],
  nwr_applied: ["sf_case_created", "eclipse_generated", "completed", "cancelled"],
  sf_case_created: ["eclipse_generated", "completed", "cancelled"],
  eclipse_generated: ["completed", "cancelled"],
  completed: [], cancelled: [],
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor context" }, { status: 403 });

    const withdrawal = await storage.getWithdrawalRequest(id);
    if (!withdrawal) return NextResponse.json({ message: "Withdrawal not found" }, { status: 404 });
    if (withdrawal.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    if (!(VALID_TRANSITIONS[withdrawal.status] || []).includes("eclipse_generated")) {
      return NextResponse.json({ message: `Cannot generate Eclipse file from status '${withdrawal.status}'` }, { status: 409 });
    }

    const client = await storage.getClient(withdrawal.clientId);
    const account = (await storage.getAccountsByClient(withdrawal.clientId)).find(a => a.id === withdrawal.accountId);

    const eclipseFile = generateEclipseImportFile([{
      accountNumber: account?.accountNumber || "Unknown",
      tradeType: "WITHDRAW", amount: parseFloat(withdrawal.amount),
      method: withdrawal.method, reason: withdrawal.reason,
      clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
      taxWithholding: withdrawal.taxWithholding ? parseFloat(withdrawal.taxWithholding) : undefined,
    }]);

    const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
      eclipseFileGenerated: true, eclipseFileName: eclipseFile.fileName, status: "eclipse_generated",
    });

    await storage.createWithdrawalAuditEntry({
      withdrawalId: withdrawal.id, action: "eclipse_file_generated", performedBy: advisor.id,
      details: { fileName: eclipseFile.fileName, recordCount: eclipseFile.recordCount },
    });

    return NextResponse.json({ withdrawal: updated, eclipseFile });
  } catch (err) {
    logger.error({ err }, "Error generating Eclipse file");
    return NextResponse.json({ message: "Failed to generate Eclipse import file" }, { status: 500 });
  }
}
