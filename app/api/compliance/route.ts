import { NextResponse } from "next/server";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { batchResolveClientIdentities, getNavigationalId } from "@server/lib/client-identity";

export async function GET() {
  try {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const advisor = await getSessionAdvisor(session);
  if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

  const [allCompliance, allActivities, allClients] = await Promise.all([
    storage.getComplianceItems(advisor.id),
    storage.getActivities(advisor.id),
    storage.getClients(advisor.id),
  ]);

  // Batch-resolve client identities for compliance items + activities
  const allClientIds = [
    ...allCompliance.map((c) => c.clientId),
    ...allActivities.slice(0, 20).map((a) => a.clientId),
  ].filter(Boolean) as string[];
  const identityMap = await batchResolveClientIdentities(allClientIds, session.userEmail);

  const complianceWithClients = await Promise.all(
    allCompliance.map(async (item) => {
      const client = await storage.getClient(item.clientId);
      const identity = identityMap.get(item.clientId);
      return {
        ...item,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        resolvedClientId: identity ? getNavigationalId(identity) : null,
      };
    })
  );

  const overdue = complianceWithClients.filter(c => c.status === "overdue");
  const expiring = complianceWithClients.filter(c => c.status === "expiring_soon");
  const current = complianceWithClients.filter(c => c.status === "current");
  const pending = complianceWithClients.filter(c => c.status === "pending");

  const totalItems = allCompliance.length;
  const healthScore = totalItems > 0
    ? Math.round(((current.length + pending.length * 0.5) / totalItems) * 100)
    : 100;

  return NextResponse.json({
    items: complianceWithClients,
    overdue,
    expiringSoon: expiring,
    current,
    pending,
    healthScore,
    auditTrail: allActivities.slice(0, 20).map(a => {
      const client = allClients.find(c => c.id === a.clientId);
      const identity = a.clientId ? identityMap.get(a.clientId) : undefined;
      return {
        ...a,
        clientName: client ? `${client.firstName} ${client.lastName}` : null,
        resolvedClientId: identity ? getNavigationalId(identity) : null,
      };
    }),
  }, { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" } });
} catch (err) {
    logger.error({ err }, "[compliance] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
